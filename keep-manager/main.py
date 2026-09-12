import argparse
import json
from pathlib import Path

from config import setup_logger, STATE_DIR
from KeepSyncEngine import KeepSyncEngine
from KeepBackupGuard import KeepBackupGuard
from KeepClassifier import KeepClassifier
from KeepApplier import KeepApplier

logger = setup_logger("KeepMain")

def main():
    parser = argparse.ArgumentParser(description="Google Keep Auto Organizer")
    parser.add_argument("--mode", choices=["full", "incremental"], required=True, help="Processing mode")
    parser.add_argument("--dry-run", action="store_true", help="Run without pushing to cloud")
    parser.add_argument("--execute", action="store_true", help="Apply changes and push to cloud")
    parser.add_argument("--limit", type=int, help="Limit number of notes to process")
    parser.add_argument("--target-id", type=str, help="Process only a specific note (Phase 2 testing)")
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.execute:
        print("Error: Must specify either --dry-run or --execute")
        return
        
    logger.info(f"Starting Keep Auto Organizer (Mode: {args.mode})")
    
    # 1. Login and Sync
    engine = KeepSyncEngine()
    keep = engine.login_and_sync()
    
    # 2. Backup
    guard = KeepBackupGuard(keep)
    
    # Check if there's any dirty/white/unlabeled nodes before backing up in incremental mode (D3)
    # Actually, the classifier logic is complex, so let's dump first and classify. If plan is empty, we delete the backup.
    snapshot_path = guard.create_snapshot()
    
    # Read snapshot
    with open(snapshot_path, 'r', encoding='utf-8') as f:
        dumped_state = json.load(f)
        
    # Read state
    processed_file = STATE_DIR / "processed.json"
    processed_dict = {}
    if processed_file.exists():
        with open(processed_file, 'r', encoding='utf-8') as f:
            processed_dict = json.load(f)
            
    # 3. Classify
    is_incremental = (args.mode == "incremental")
    plan = KeepClassifier.generate_plan(dumped_state, incremental=is_incremental, processed_dict=processed_dict)
    
    if args.target_id:
        plan = {k: v for k, v in plan.items() if k == args.target_id}
        
    if not plan:
        logger.info("No notes matched rules. Exiting.")
        # D3: Delete backup if no changes
        if is_incremental and snapshot_path.exists():
            snapshot_path.unlink()
        return
        
    # 4. Apply
    applier = KeepApplier(keep, engine)
    updated_timestamps = applier.apply_plan(plan, dry_run=args.dry_run, limit=args.limit)
    
    # 5. Update State (only on execute)
    if args.execute and updated_timestamps:
        processed_dict.update(updated_timestamps)
        with open(processed_file, 'w', encoding='utf-8') as f:
            json.dump(processed_dict, f, ensure_ascii=False)
            
        with open(STATE_DIR / "last_success.json", "w", encoding='utf-8') as f:
            json.dump({"last_success": snapshot_path.stem}, f)
            
    logger.info("Keep Auto Organizer finished successfully.")

if __name__ == "__main__":
    main()
