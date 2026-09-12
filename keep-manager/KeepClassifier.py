from config import TAXONOMY_RULES, setup_logger
from gkeepapi.node import ColorValue

logger = setup_logger("KeepClassifier")

class KeepClassifier:
    """Pure rule-based classifier that only reads dumped JSON dict, returning a plan."""
    
    @staticmethod
    def generate_plan(dumped_state, incremental=False, processed_dict=None):
        """
        Takes raw dictionary from keep.dump().
        Returns a dict: {note_id: {"color": ColorValue, "labels": ["label1", ...]}}
        """
        plan = {}
        processed_dict = processed_dict or {}
        
        # In dump(), nodes are listed in dumped_state['nodes']
        nodes = dumped_state.get("nodes", [])
        
        for node in nodes:
            # Only process top-level notes (NOTE and LIST)
            node_type = node.get("type")
            if node_type not in ("NOTE", "LIST"):
                continue
                
            # D1/D7: Exclude trashed and archived
            if node.get("isTrashed", False) or node.get("isArchived", False):
                continue
                
            note_id = node["id"]
            title = node.get("title", "")
            text = node.get("text", "")
            
            # Combine title and text
            content = title + "\n" + text
            
            # gkeepapi dump is flat. Find all LIST_ITEMs that belong to this note
            for child in nodes:
                if child.get("type") == "LIST_ITEM" and child.get("parentId") == note_id:
                    content += "\n" + child.get("text", "")
            
            # For incremental (Phase B), we filter uncolored, unlabeled
            # R5: processed.json now maps note_id -> updated_timestamp
            if incremental:
                node_color = node.get("color", "DEFAULT")
                node_labels = node.get("labels", [])
                node_updated = node.get("timestamps", {}).get("updated")
                
                # Check if processed and unmodified
                if note_id in processed_dict and processed_dict[note_id] == node_updated:
                    continue
                    
                # Must be white and unlabeled to process in incremental mode
                if node_color != "DEFAULT" or len(node_labels) > 0:
                    continue
            
            # Rule matching
            matched = False
            for rule in TAXONOMY_RULES:
                if any(kw.lower() in content.lower() for kw in rule["keywords"]):
                    plan[note_id] = {
                        "color": rule["color"],
                        "labels": rule["labels"]
                    }
                    matched = True
                    break
                    
            if not matched:
                # D1/D7: No rules matched, leave as White (DEFAULT), add '待整理'
                plan[note_id] = {
                    "color": ColorValue.White,
                    "labels": ["待整理"]
                }
                
        return plan
