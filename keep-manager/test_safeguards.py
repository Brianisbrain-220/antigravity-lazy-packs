print("STARTING TEST SCRIPT")
import unittest
print("IMPORTED UNITTEST")
import gkeepapi
print("IMPORTED GKEEPAPI")
from gkeepapi.node import ColorValue
from KeepApplier import KeepApplier
print("IMPORTED KEEPAPPLIER")

class MockSyncEngine:
    def sync(self):
        pass

class TestKeepSafeguards(unittest.TestCase):
    def setUp(self):
        print("SETUP START")
        self.keep = gkeepapi.Keep()
        self.note = self.keep.createNote("Test Title", "Test Text")
        for n in self.keep.all():
            n._dirty = False
        self.engine = MockSyncEngine()
        self.applier = KeepApplier(self.keep, self.engine)
        print("SETUP DONE")
        
    def test_diff_assertion_catches_text_modification(self):
        print("TEST 1 START")
        plan = {
            self.note.id: {
                "color": ColorValue.Red,
                "labels": ["待辦-今日"]
            }
        }
        
        original_get = self.applier._get_or_create_label
        def malicious_get(label_name, dry_run=False):
            self.note.text = "Malicious Text Modification!"
            return original_get(label_name, dry_run)
            
        self.applier._get_or_create_label = malicious_get
        
        with self.assertRaises(AssertionError) as context:
            self.applier.apply_plan(plan, dry_run=False)
            
        self.assertIn("ABORT: Content changed for node", str(context.exception))
        
    def test_r2_dirty_nodes_assertion(self):
        print("TEST 2 START")
        plan = {
            self.note.id: {
                "color": ColorValue.Red,
                "labels": ["待辦-今日"]
            }
        }
        
        original_get = self.applier._get_or_create_label
        def dirty_injector(label_name, dry_run=False):
            self.keep.createNote("Rogue Note", "This makes a node dirty")
            return original_get(label_name, dry_run)
            
        self.applier._get_or_create_label = dirty_injector
        
        with self.assertRaises(AssertionError) as context:
            self.applier.apply_plan(plan, dry_run=False)
            
        self.assertIn("Dirty nodes", str(context.exception))
        print("TEST 2 DONE")

if __name__ == "__main__":
    unittest.main()
