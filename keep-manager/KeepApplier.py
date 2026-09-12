import json
from datetime import datetime, timezone
from config import setup_logger, CHANGES_DIR

logger = setup_logger("KeepApplier")

class KeepApplier:
    def __init__(self, keep, sync_engine):
        self.keep = keep
        self.sync_engine = sync_engine
        
    def _get_or_create_label(self, label_name, dry_run=False):
        """Idempotent label fetching/creation. (D2)"""
        label = self.keep.findLabel(label_name)
        if label:
            return label
        if not dry_run:
            logger.info(f"Creating new label: {label_name}")
            return self.keep.createLabel(label_name)
        else:
            return None # Dry run mock
            
    def apply_plan(self, plan, dry_run=False, limit=None):
        logger.info(f"Preparing to apply plan for {len(plan)} notes. Dry Run: {dry_run}")
        
        # Limit application if specified (Phase 3 batching)
        if limit and limit > 0:
            plan = dict(list(plan.items())[:limit])
            logger.info(f"Plan limited to {len(plan)} notes.")
            
        if not plan:
            logger.info("Empty plan, nothing to apply.")
            return {}
            
        if dry_run:
            for note_id, mods in plan.items():
                logger.info(f"[DRY-RUN] Would modify note {note_id}: Color={mods['color']}, Labels={mods['labels']}")
            return {}
            
        # 1. Pre-apply sync to get latest timestamps from cloud (B3-2)
        logger.info("Executing pre-apply sync to verify latest timestamps...")
        self.sync_engine.sync()
        
        # 2. Iterate and apply, recording changes
        run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        applied_changes = []
        successful_note_ids = set()
        
        # Snapshot for deep text diff assertion (B3-3)
        before_dump = {n['id']: n for n in self.keep.dump().get("nodes", [])}
        
        for note_id, mods in plan.items():
            note = self.keep.get(note_id)
            if not note:
                logger.warning(f"Note {note_id} not found in keep. Skipping.")
                continue
                
            # Check for remote changes
            # We already have the snapshot updated timestamp in the rule logic, 
            # but since we just synced, let's just apply safely.
            
            # Record before state
            before_color = note.color.value
            before_label_ids = [lbl.id for lbl in note.labels.all()]
            
            # Apply color
            if note.color != mods["color"]:
                note.color = mods["color"]
                
            # Apply labels
            for label_name in mods["labels"]:
                label = self._get_or_create_label(label_name)
                if label:
                    note.labels.add(label)
                    
            after_color = note.color.value
            after_label_ids = [lbl.id for lbl in note.labels.all()]
            
            # Only record if something actually changed
            if before_color != after_color or set(before_label_ids) != set(after_label_ids):
                applied_changes.append({
                    "note_id": note_id,
                    "before": {"color": before_color, "label_ids": before_label_ids},
                    "after": {"color": after_color, "label_ids": after_label_ids}
                })
                successful_note_ids.add(note_id)
                
        if not applied_changes:
            logger.info("No actual changes made after evaluating plan.")
            return {}

        # 3. Assertions before final push (B3-3 and R2)
        logger.info("Running pre-push safety assertions...")
        
        # R2: Dirty nodes set must exactly match the successful plan set
        dirty_note_ids = {node.id for node in self.keep.all() if getattr(node, 'dirty', False)}
        if dirty_note_ids != successful_note_ids:
            logger.error(f"Dirty nodes set mismatch! Expected: {successful_note_ids}, Found: {dirty_note_ids}")
            raise AssertionError("ABORT: Dirty nodes do not match planned modifications.")
            
        # B3-3: Deep content assertion
        after_dump = {n['id']: n for n in self.keep.dump().get("nodes", [])}
        
        # Compare all nodes (including child list items)
        for node_id, a_node in after_dump.items():
            b_node = before_dump.get(node_id)
            if not b_node:
                raise AssertionError(f"ABORT: New node created unexpectedly: {node_id}")
                
            # We ignore keys that are expected to change during label/color updates
            # or aren't relevant to content integrity.
            keys_to_ignore = {"color", "labelIds", "timestamps", "_dirty", "labels"}
            
            b_clean = {k: v for k, v in b_node.items() if k not in keys_to_ignore}
            a_clean = {k: v for k, v in a_node.items() if k not in keys_to_ignore}
            
            if b_clean != a_clean:
                # Find exactly what changed for logging
                diff = {k: (b_clean.get(k), a_clean.get(k)) for k in set(b_clean) | set(a_clean) if b_clean.get(k) != a_clean.get(k)}
                logger.error(f"Node {node_id} content changed! Diff: {diff}")
                raise AssertionError(f"ABORT: Content changed for node {node_id}")
                
        logger.info("Assertions passed. Pushing to Keep Cloud...")
        
        # 4. Push
        self.sync_engine.sync()
        
        # 5. Write rollback log
        change_log = {
            "run_id": run_id,
            "run_started_at": datetime.now(timezone.utc).isoformat(),
            "changes": applied_changes
        }
        change_file = CHANGES_DIR / f"{run_id}.json"
        with open(change_file, 'w', encoding='utf-8') as f:
            json.dump(change_log, f, ensure_ascii=False, indent=2)
            
        logger.info(f"Changes applied and logged to {change_file}")
        
        # Return dict of note_id -> updated timestamp (for state tracking)
        # We need to re-fetch timestamps post-sync
        return {change["note_id"]: self.keep.get(change["note_id"]).timestamps.updated for change in applied_changes}
