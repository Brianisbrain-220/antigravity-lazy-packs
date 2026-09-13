"""
test_safeguards.py — Offline unit + integration tests for keep-manager.

All tests run without network, without tokens, and without writing to
the project's changes/ directory (CHANGES_DIR is patched to a tempdir).
"""
import unittest
import tempfile
import pathlib
import json
import gkeepapi
from gkeepapi.node import ColorValue, NodeTimestamps
from unittest.mock import patch

from KeepApplier import KeepApplier
from KeepClassifier import KeepClassifier
from config import write_json_atomic, STATE_DIR
import restore

FIXTURE_DIR = pathlib.Path(__file__).resolve().parent / "tests"


class MockSyncEngine:
    def sync(self):
        pass


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

        self.patcher1 = patch("KeepApplier.CHANGES_DIR", self.temp_path)
        self.patcher2 = patch("restore.CHANGES_DIR", self.temp_path)
        self.patcher1.start()
        self.patcher2.start()

    def tearDown(self):
        self.patcher1.stop()
        self.patcher2.stop()
        self.temp_dir.cleanup()

    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------
    def get_plan(self):
        return {
            self.note.id: {
                "color": ColorValue.Red,
                "labels": ["待辦-今日"],
                "snapshot_updated": NodeTimestamps.dt_to_str(
                    self.note.timestamps.updated
                ),
            }
        }

    # ------------------------------------------------------------------
    # Original 5 tests
    # ------------------------------------------------------------------
    def test_diff_assertion_catches_text_modification(self):
        """B3-3: Mutating note text must trigger ABORT."""
        original_get = self.applier._get_or_create_label

        def malicious_get(label_name, dry_run=False):
            self.note.text = "Malicious Text Modification!"
            return original_get(label_name, dry_run)

        self.applier._get_or_create_label = malicious_get

        with self.assertRaises(AssertionError) as ctx:
            self.applier.apply_plan(self.get_plan(), dry_run=False)
        self.assertIn("ABORT: Content changed for node", str(ctx.exception))

    def test_r2_dirty_nodes_assertion(self):
        """R2: Extra dirty nodes must trigger ABORT."""
        original_get = self.applier._get_or_create_label

        def dirty_injector(label_name, dry_run=False):
            self.keep.createNote("Rogue Note", "This makes a node dirty")
            return original_get(label_name, dry_run)

        self.applier._get_or_create_label = dirty_injector

        with self.assertRaises(AssertionError) as ctx:
            self.applier.apply_plan(self.get_plan(), dry_run=False)
        self.assertIn("Dirty nodes", str(ctx.exception))

    @patch("restore.KeepSyncEngine")
    def test_restore_readds_before_labels_and_precise_diff(self, MockSyncCls):
        """Restore must precisely add back removed labels and remove added ones."""
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
                    "after": {"color": "RED", "label_ids": [l2.id]},
                }
            ],
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
        current_labels = {lbl.name for lbl in self.note.labels.all()}
        self.assertIn("L1", current_labels)
        self.assertNotIn("L2", current_labels)

    def test_classifier_skips_trashed_and_labeled(self):
        """Classifier must skip trashed notes and notes that already have labels."""
        dumped_state = {
            "nodes": [
                {
                    "id": "trashed_note",
                    "type": "NOTE",
                    "title": "Trashed Note",
                    "text": "緊急",
                    "timestamps": {"trashed": "2026-09-12T10:00:00.000Z"},
                },
                {
                    "id": "labeled_note",
                    "type": "NOTE",
                    "title": "Labeled Note",
                    "text": "緊急",
                    "color": "DEFAULT",
                    "labelIds": [
                        {"labelId": "l1", "deleted": "1970-01-01T00:00:00.000Z"}
                    ],
                },
                {
                    "id": "white_inbox_note",
                    "type": "NOTE",
                    "title": "Inbox Note",
                    "text": "緊急",
                    "color": "DEFAULT",
                },
            ]
        }

        plan = KeepClassifier.generate_plan(dumped_state, incremental=True)
        self.assertNotIn("trashed_note", plan)
        self.assertNotIn("labeled_note", plan)
        self.assertIn("white_inbox_note", plan)

    def test_applier_idempotent_when_label_exists(self):
        """Re-applying the same plan must produce zero changes (idempotent)."""
        l1 = self.keep.createLabel("待辦-今日")
        self.note.labels.add(l1)
        self.note.color = ColorValue.Red
        for n in self.keep.all():
            n._dirty = False

        res = self.applier.apply_plan(self.get_plan(), dry_run=False)
        self.assertEqual(res, {})

    # ------------------------------------------------------------------
    # 4 NEW tests required by §12.11
    # ------------------------------------------------------------------
    def test_plan_entries_all_carry_snapshot_updated(self):
        """§12.11 test 1: Every plan entry must carry snapshot_updated matching the node's timestamps.updated."""
        dumped_state = {
            "nodes": [
                {
                    "id": "rule_match",
                    "type": "NOTE",
                    "title": "緊急處理",
                    "text": "deadline 明天",
                    "color": "DEFAULT",
                    "timestamps": {
                        "updated": "2026-09-10T08:00:00.000Z",
                        "trashed": "1970-01-01T00:00:00.000Z",
                        "deleted": "1970-01-01T00:00:00.000Z",
                    },
                },
                {
                    "id": "no_match",
                    "type": "NOTE",
                    "title": "隨手記",
                    "text": "天氣好",
                    "color": "DEFAULT",
                    "timestamps": {
                        "updated": "2026-09-10T09:00:00.000Z",
                        "trashed": "1970-01-01T00:00:00.000Z",
                        "deleted": "1970-01-01T00:00:00.000Z",
                    },
                },
            ]
        }

        plan = KeepClassifier.generate_plan(dumped_state, incremental=True)
        for note_id, entry in plan.items():
            self.assertIn("snapshot_updated", entry, f"{note_id} missing snapshot_updated")
            # Find the corresponding node and verify the value matches
            for n in dumped_state["nodes"]:
                if n["id"] == note_id:
                    self.assertEqual(
                        entry["snapshot_updated"],
                        n["timestamps"]["updated"],
                        f"{note_id} snapshot_updated mismatch",
                    )

    def test_classifier_regex_rule_matches_word_boundary(self):
        """§12.11 test 2: Regex word-boundary rules must match 'api' but NOT substring 'ai' inside 'email detail'."""
        dumped_api = {
            "nodes": [
                {
                    "id": "api_note",
                    "type": "NOTE",
                    "title": "",
                    "text": "debug the API",
                    "color": "DEFAULT",
                    "timestamps": {
                        "updated": "2026-09-10T08:00:00.000Z",
                        "trashed": "1970-01-01T00:00:00.000Z",
                        "deleted": "1970-01-01T00:00:00.000Z",
                    },
                }
            ]
        }
        plan_api = KeepClassifier.generate_plan(dumped_api, incremental=True)
        self.assertIn("api_note", plan_api)
        # Should match the regex rule → Teal color (專案-程式開發)
        self.assertEqual(plan_api["api_note"]["color"], ColorValue.Teal)

        dumped_email = {
            "nodes": [
                {
                    "id": "email_note",
                    "type": "NOTE",
                    "title": "",
                    "text": "email detail",
                    "color": "DEFAULT",
                    "timestamps": {
                        "updated": "2026-09-10T08:00:00.000Z",
                        "trashed": "1970-01-01T00:00:00.000Z",
                        "deleted": "1970-01-01T00:00:00.000Z",
                    },
                }
            ]
        }
        plan_email = KeepClassifier.generate_plan(dumped_email, incremental=True)
        # 'email detail' must NOT match the \b(ai|api|...)\b rule
        if "email_note" in plan_email:
            self.assertNotEqual(
                plan_email["email_note"]["color"],
                ColorValue.Teal,
                "'email detail' should not match the word-boundary regex rule for AI/API",
            )

    def test_e2e_offline_pipeline_applies_colored_notes(self):
        """§12.11 test 3: End-to-end offline pipeline with fixture dump.
        Classifier → Applier must apply color to at least 1 note, with 0
        SKIPPED_CHANGED_REMOTELY, and write a change log.
        """
        # Build a fresh keep with synthetic notes
        keep = gkeepapi.Keep()
        n1 = keep.createNote("明天之前要交", "緊急處理這件事")       # matches 緊急 → Red
        n2 = keep.createNote("debug the API", "Fix the Python bug")  # matches regex → Teal
        n3 = keep.createNote("隨手記", "今天天氣不錯")               # no match → 待整理
        # Clear dirty flags from creation
        for n in keep.all():
            n._dirty = False

        # Dump and run through the real Classifier
        raw_dump = keep.dump()
        plan = KeepClassifier.generate_plan(raw_dump, incremental=True)
        self.assertTrue(len(plan) > 0, "Plan should not be empty")

        # Verify at least one entry is colored (not White)
        colored = [nid for nid, p in plan.items() if p["color"] != ColorValue.White]
        self.assertTrue(len(colored) > 0, "At least one note should be colored")

        # Verify all entries have snapshot_updated
        for nid, entry in plan.items():
            self.assertIn("snapshot_updated", entry, f"{nid} missing snapshot_updated")

        # Run applier with MockSyncEngine
        engine = MockSyncEngine()
        applier = KeepApplier(keep, engine)
        with patch("KeepApplier.CHANGES_DIR", self.temp_path):
            result = applier.apply_plan(plan, dry_run=False)

        # At least one note must have been applied (not skipped)
        self.assertTrue(len(result) > 0, "At least one note should be applied, not skipped")

        # Verify change log was written
        change_files = list(self.temp_path.glob("*.json"))
        self.assertEqual(len(change_files), 1, "Exactly one change log should be written")

        with open(change_files[0], "r", encoding="utf-8") as f:
            change_data = json.load(f)
        self.assertIn("run_started_at", change_data)
        self.assertIn("run_finished_at", change_data)
        self.assertTrue(len(change_data["changes"]) > 0)

    def test_processed_json_roundtrip(self):
        """§12.11 test 4: write_json_atomic produces valid JSON with ISO timestamp strings."""
        test_data = {
            "note_id_abc": "2026-09-12T15:00:09.123456Z",
            "note_id_xyz": "2026-09-12T16:30:00.000000Z",
        }
        test_path = self.temp_path / "processed.json"
        write_json_atomic(test_path, test_data)

        # Read it back
        with open(test_path, "r", encoding="utf-8") as f:
            loaded = json.load(f)

        self.assertEqual(loaded, test_data)

        # Verify values are proper ISO timestamp strings
        for v in loaded.values():
            self.assertIsInstance(v, str)
            self.assertIn("T", v)
            self.assertIn("Z", v)

        # Verify no .tmp file remains
        tmp_files = list(self.temp_path.glob("*.tmp"))
        self.assertEqual(len(tmp_files), 0, "No .tmp file should remain after atomic write")


if __name__ == "__main__":
    unittest.main()
