import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from config import setup_logger, STATE_DIR, write_json_atomic
from KeepSyncEngine import KeepSyncEngine
from KeepBackupGuard import KeepBackupGuard
from KeepClassifier import KeepClassifier
from KeepApplier import KeepApplier

logger = setup_logger("KeepMain")

def main():
    parser = argparse.ArgumentParser(description="Google Keep Auto Organizer")
    parser.add_argument("--mode", choices=["full", "incremental"], required=True, help="Processing mode")
    parser.add_argument("--include-labeled", action="store_true", help="Process notes even if they already have labels or colors (Full mode only)")
    parser.add_argument("--dry-run", action="store_true", help="Run without pushing to cloud")
    parser.add_argument("--execute", action="store_true", help="Apply changes and push to cloud")
    parser.add_argument("--limit", type=int, help="Limit number of notes to process")
    parser.add_argument("--target-id", type=str, help="Process only a specific note (Phase 2 testing)")
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.execute:
        print("Error: Must specify either --dry-run or --execute")
        return
        
    logger.info(f"Starting Keep Auto Organizer (Mode: {args.mode})")
    
    # Read state BEFORE login (§12.11: detect corrupt file before wasting a cloud sync)
    processed_file = STATE_DIR / "processed.json"
    processed_dict = {}
    if processed_file.exists():
        try:
            with open(processed_file, 'r', encoding='utf-8') as f:
                processed_dict = json.load(f)
        except json.JSONDecodeError:
            logger.error("processed.json 損毀，請人工檢查後刪除")
            sys.exit(2)
    
    # 1. Login and Sync
    engine = KeepSyncEngine()
    keep = engine.login_and_sync()
    
    # 2. Backup
    guard = KeepBackupGuard(keep)
    snapshot_path = guard.create_snapshot()
    
    # Read snapshot
    with open(snapshot_path, 'r', encoding='utf-8') as f:
        dumped_state = json.load(f)
    
    # 3. Classify
    is_incremental = (args.mode == "incremental")
    plan = KeepClassifier.generate_plan(dumped_state, incremental=is_incremental, processed_dict=processed_dict, include_labeled=args.include_labeled)
    
    if args.target_id:
        plan = {k: v for k, v in plan.items() if k == args.target_id}
        
    if not plan:
        logger.info("No notes matched rules. Exiting.")
        # D3: Delete backup if no changes
        if is_incremental and snapshot_path.exists():
            snapshot_path.unlink()
        # Always write last_success so liveness detection works even on quiet nights
        if args.execute:
            write_json_atomic(STATE_DIR / "last_success.json", {
                "run_id": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "applied": 0
            })
        logger.info("Keep Auto Organizer finished successfully.")
        return
        
    # 4. Apply
    applier = KeepApplier(keep, engine)
    updated_timestamps = applier.apply_plan(plan, dry_run=args.dry_run, limit=args.limit)
    
    # 5. Update State (only on execute)
    if args.execute:
        if updated_timestamps:
            processed_dict.update(updated_timestamps)
            write_json_atomic(processed_file, processed_dict)
            
        write_json_atomic(STATE_DIR / "last_success.json", {
            "run_id": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "applied": len(updated_timestamps) if updated_timestamps else 0
        })
            
    logger.info("Keep Auto Organizer finished successfully.")

if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        logger.exception("Run failed")
        sys.exit(1)
