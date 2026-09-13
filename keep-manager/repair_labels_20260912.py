import argparse
from KeepSyncEngine import KeepSyncEngine
from config import setup_logger

logger = setup_logger("LabelRepair")

def main():
    parser = argparse.ArgumentParser(description="Repair lost labels from 2026-09-12 incident")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be restored without pushing")
    parser.add_argument("--execute", action="store_true", help="Apply changes and push to cloud")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("Error: Must specify either --dry-run or --execute")
        return

    logger.info("Starting label repair script...")
    engine = KeepSyncEngine()
    keep = engine.login_and_sync()

    # Note 1
    note1_id = "1a0571ec49c.bd18d3f1bcc0957d"
    note1_labels = [
        "1a0571f838b.92d183073b5ac19e", # 進修
        "1a0571f9f9b.8711d859434cae50", # Unicard
        "1a0571ff981.a6fafbfcdeae015b", # 全聯
        "1a057206441.a180b7fcd3c72379"  # 全支付
    ]

    # Note 2
    note2_id = "1773665618629.343994.3116978881"
    note2_labels = [
        "tag.gxyimuijp78p.1774062628748" # 每週三
    ]

    repair_plan = {
        note1_id: note1_labels,
        note2_id: note2_labels
    }

    changed = False

    for note_id, label_ids in repair_plan.items():
        note = keep.get(note_id)
        if not note:
            logger.error(f"Note {note_id} not found!")
            continue
        
        current_label_ids = {l.id for l in note.labels.all()}
        
        for label_id in label_ids:
            if label_id not in current_label_ids:
                label = keep.getLabel(label_id)
                if not label:
                    logger.error(f"Label {label_id} not found in Keep!")
                    continue
                if args.dry_run:
                    logger.info(f"[DRY-RUN] Would add label {label.name} ({label_id}) to note {note_id}")
                else:
                    note.labels.add(label)
                    logger.info(f"Added label {label.name} ({label_id}) to note {note_id}")
                    changed = True
            else:
                logger.info(f"Note {note_id} already has label {label_id}")

    if args.execute and changed:
        logger.info("Syncing changes to cloud...")
        keep.sync()
        logger.info("Repair complete.")
    elif args.dry_run:
        logger.info("Dry run complete.")
    else:
        logger.info("No changes needed.")

if __name__ == "__main__":
    main()
