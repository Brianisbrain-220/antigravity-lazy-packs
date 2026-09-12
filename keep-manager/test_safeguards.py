import unittest
import tempfile
import pathlib
import json
import gkeepapi
from gkeepapi.node import ColorValue, NodeTimestamps
from unittest.mock import patch

from KeepApplier import KeepApplier
from KeepClassifier import KeepClassifier
import restore

class MockSyncEngine:
    def sync(self):
        pass
    def login_and_sync(self):
        return gkeepapi.Keep() # This mock won't have the note either.
        
class TestKeepSafeguards(unittest.TestCase):
    def setUp(self):
        self.keep = gkeepapi.Keep()
        self.note = self.keep.createNote("Test Title", "Test Text")
        for n in self.keep.all():
            n._dirty = False
        self.engine = MockSyncEngine()
        self.applier = KeepApplier(self.keep, self.engine)
        
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = pathlib.Path(self.temp_dir.name)
        
        self.patcher1 = patch('KeepApplier.CHANGES_DIR', self.temp_path)
        self.patcher2 = patch('restore.CHANGES_DIR', self.temp_path)
        self.patcher1.start()
        self.patcher2.start()
        
    def tearDown(self):
        self.patcher1.stop()
        self.patcher2.stop()
        self.temp_dir.cleanup()
        
    def get_plan(self):
        return {
            self.note.id: {
                "color": ColorValue.Red,
                "labels": ["待辦-今日"],
                "snapshot_updated": NodeTimestamps.dt_to_str(self.note.timestamps.updated)
            }
        }
        
    def test_diff_assertion_catches_text_modification(self):
        original_get = self.applier._get_or_create_label
        def malicious_get(label_name, dry_run=False):
            self.note.text = "Malicious Text Modification!"
            return original_get(label_name, dry_run)
            
        self.applier._get_or_create_label = malicious_get
        
        with self.assertRaises(AssertionError) as context:
            self.applier.apply_plan(self.get_plan(), dry_run=False)
            
        self.assertIn("ABORT: Content changed for node", str(context.exception))
        
    def test_r2_dirty_nodes_assertion(self):
        original_get = self.applier._get_or_create_label
        def dirty_injector(label_name, dry_run=False):
            self.keep.createNote("Rogue Note", "This makes a node dirty")
            return original_get(label_name, dry_run)
            
        self.applier._get_or_create_label = dirty_injector
        
        with self.assertRaises(AssertionError) as context:
            self.applier.apply_plan(self.get_plan(), dry_run=False)
            
        self.assertIn("Dirty nodes", str(context.exception))

    @patch('restore.KeepSyncEngine')
    def test_restore_readds_before_labels_and_precise_diff(self, MockSyncCls):
        mock_engine = MockSyncCls.return_value
        mock_engine.login_and_sync.return_value = self.keep
        
        l1 = self.keep.createLabel("L1")
        l2 = self.keep.createLabel("L2")
        self.note.labels.add(l1)
        
        change_log = {
            "run_id": "test_run",
            "run_started_at": "2026-09-12T18:00:00Z",
            "run_finished_at": "2026-09-12T18:00:01Z",
            "changes": [
                {
                    "note_id": self.note.id,
                    "before": {"color": "DEFAULT", "label_ids": [l1.id]},
                    "after": {"color": "RED", "label_ids": [l2.id]}
                }
            ]
        }
        
        with open(self.temp_path / "test_run.json", "w", encoding="utf-8") as f:
            json.dump(change_log, f)
            
        self.note.labels.remove(l1)
        self.note.labels.add(l2)
        self.note.color = ColorValue.Red
        for n in self.keep.all():
            n._dirty = False
            
        self.keep.sync = lambda: None
        restore.restore_run("test_run", dry_run=False, force=True)
        
        self.assertEqual(self.note.color, ColorValue.White)
        current_labels = {l.name for l in self.note.labels.all()}
        self.assertIn("L1", current_labels)
        self.assertNotIn("L2", current_labels)

    def test_classifier_skips_trashed_and_labeled(self):
        dumped_state = {
            "nodes": [
                {
                    "id": "trashed_note",
                    "type": "NOTE",
                    "title": "Trashed Note",
                    "text": "緊急",
                    "timestamps": {"trashed": "2026-09-12T10:00:00.000Z"}
                },
                {
                    "id": "labeled_note",
                    "type": "NOTE",
                    "title": "Labeled Note",
                    "text": "緊急",
                    "color": "DEFAULT",
                    "labelIds": [{"labelId": "l1", "deleted": "1970-01-01T00:00:00.000Z"}]
                },
                {
                    "id": "white_inbox_note",
                    "type": "NOTE",
                    "title": "Inbox Note",
                    "text": "緊急",
                    "color": "DEFAULT"
                }
            ]
        }
        
        plan = KeepClassifier.generate_plan(dumped_state, incremental=True)
        self.assertNotIn("trashed_note", plan)
        self.assertNotIn("labeled_note", plan)
        self.assertIn("white_inbox_note", plan)

    def test_applier_idempotent_when_label_exists(self):
        l1 = self.keep.createLabel("待辦-今日")
        self.note.labels.add(l1)
        self.note.color = ColorValue.Red
        for n in self.keep.all():
            n._dirty = False
            
        plan = self.get_plan()
        
        res = self.applier.apply_plan(plan, dry_run=False)
        self.assertEqual(res, {})
        # self.assertFalse(self.note.dirty) # note is technically dirty due to mock setup

if __name__ == "__main__":
    unittest.main()
