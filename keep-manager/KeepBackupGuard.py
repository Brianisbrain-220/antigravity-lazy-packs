import json
from datetime import datetime
from config import BACKUPS_DIR, setup_logger

logger = setup_logger("KeepBackupGuard")

class KeepBackupGuard:
    def __init__(self, keep):
        self.keep = keep
        
    def create_snapshot(self):
        """Creates a full JSON snapshot of all notes before mutation."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = BACKUPS_DIR / f"keep_snapshot_{timestamp}.json"
        
        # keep.dump() returns a dictionary of the current state
        state = self.keep.dump()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
            
        logger.info(f"Snapshot created at {filepath}")
        return filepath
