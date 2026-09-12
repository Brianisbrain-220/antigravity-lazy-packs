import argparse
import json
from pathlib import Path
from datetime import datetime, timezone

from config import setup_logger, CHANGES_DIR
from KeepSyncEngine import KeepSyncEngine
import gkeepapi

logger = setup_logger("RestoreEngine")

def restore_run(run_id, dry_run=False, force=False):
    change_file = CHANGES_DIR / f"{run_id}.json"
    if not change_file.exists():
        logger.error(f"Change log {change_file} not found.")
        return
        
    with open(change_file, 'r', encoding='utf-8') as f:
        log = json.load(f)
        
    run_started_at = datetime.fromisoformat(log["run_started_at"])
    changes = log["changes"]
    
    logger.info(f"Starting restore for run {run_id}. Notes to restore: {len(changes)}")
    
    if dry_run:
        for c in changes:
            logger.info(f"[DRY-RUN] Would restore {c['note_id']} to color={c['before']['color']}, labels={c['before']['label_ids']}")
        return
        
    engine = KeepSyncEngine()
    keep = engine.login_and_sync()
    
    successful_note_ids = set()
    before_dump = {n['id']: n for n in keep.dump().get("nodes", [])}
    
    for c in changes:
        note_id = c["note_id"]
        note = keep.get(note_id)
        
        # R1-3: Skip if trashed or missing
        if not note:
            logger.warning(f"Note {note_id} not found. Skipping.")
            continue
        if note.trashed:
            logger.warning(f"Note {note_id} is trashed. Skipping (No resurrect).")
            continue
            
        # R1-4: Skip if modified by user after run
        # keep updated is a datetime object
        if note.timestamps.updated > run_started_at:
            if not force:
                logger.warning(f"Note {note_id} modified after run_started_at. SKIPPED_USER_EDITED_AFTER_RUN. Use --force to override.")
                continue
            else:
                logger.warning(f"Note {note_id} modified after run, but --force applied. Overwriting.")
                
        # Restore color
        before_color = gkeepapi.node.ColorValue(c["before"]["color"])
        note.color = before_color
        
        # Restore labels
        # First clear all labels
        for lbl in list(note.labels.all()):
            note.labels.remove(lbl)
            
        # Add back old labels by ID
        for lbl_id in c["before"]["label_ids"]:
            lbl_node = keep.get(lbl_id)
            if lbl_node:
                note.labels.add(lbl_node)
            else:
                logger.warning(f"Label ID {lbl_id} not found in keep, could not restore this label.")
                
        successful_note_ids.add(note_id)
        
    if not successful_note_ids:
        logger.info("No notes restored.")
        return
        
    # R1-2: Dump Diff Assertion & R2
    logger.info("Running pre-push safety assertions for restore...")
    dirty_note_ids = {n.id for n in keep.all() if getattr(n, 'dirty', False)}
    if dirty_note_ids != successful_note_ids:
        logger.error(f"Dirty nodes mismatch! Expected: {successful_note_ids}, Found: {dirty_note_ids}")
        raise AssertionError("ABORT: Dirty nodes do not match restored nodes.")
        
    after_dump = {n['id']: n for n in keep.dump().get("nodes", [])}
    for node_id, a_node in after_dump.items():
        b_node = before_dump.get(node_id)
        if not b_node:
            raise AssertionError(f"ABORT: New node created unexpectedly during restore: {node_id}")
            
        keys_to_ignore = {"color", "labelIds", "timestamps", "_dirty", "labels"}
        b_clean = {k: v for k, v in b_node.items() if k not in keys_to_ignore}
        a_clean = {k: v for k, v in a_node.items() if k not in keys_to_ignore}
        
        if b_clean != a_clean:
            diff = {k: (b_clean.get(k), a_clean.get(k)) for k in set(b_clean) | set(a_clean) if b_clean.get(k) != a_clean.get(k)}
            logger.error(f"Node {node_id} content changed during restore! Diff: {diff}")
            raise AssertionError(f"ABORT: Content changed for node {node_id} during restore!")
            
    logger.info("Assertions passed. Pushing restore to Keep Cloud...")
    keep.sync()
    logger.info("Restore complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Restore Keep state from a run log.")
    parser.add_argument("--run", required=True, help="Run ID (e.g. 20260912_180000)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be restored without pushing")
    parser.add_argument("--force", action="store_true", help="Force restore even if note was modified later")
    args = parser.parse_args()
    
    restore_run(args.run, args.dry_run, args.force)
