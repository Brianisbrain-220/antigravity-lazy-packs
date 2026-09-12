from config import TAXONOMY_RULES, setup_logger
from gkeepapi.node import ColorValue

logger = setup_logger("KeepClassifier")


_EPOCH_PREFIX = "1970"
def _ts(node, key):
    return str(node.get("timestamps", {}).get(key) or "1970")
def is_trashed(node):
    return not _ts(node, "trashed").startswith(_EPOCH_PREFIX)
def is_deleted(node):
    return not _ts(node, "deleted").startswith(_EPOCH_PREFIX)
def live_label_ids(node):
    return [x["labelId"] for x in node.get("labelIds", [])
            if isinstance(x, dict) and str(x.get("deleted", "1970")).startswith(_EPOCH_PREFIX)]

class KeepClassifier:
    """Pure rule-based classifier that only reads dumped JSON dict, returning a plan."""
    
    @staticmethod
    def generate_plan(dumped_state, incremental=False, processed_dict=None, include_labeled=False):
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
                
            if is_trashed(node) or is_deleted(node) or node.get("isArchived", False):
                continue
                
            note_id = node["id"]
            title = node.get("title", "")
            text = node.get("text", "")
            
            content = title + "\n" + text
            
            for child in nodes:
                if child.get("type") == "LIST_ITEM" and child.get("parentId") == note_id:
                    content += "\n" + child.get("text", "")
            
            node_color = node.get("color", "DEFAULT")
            lbl_ids = live_label_ids(node)
            node_updated = _ts(node, "updated")
            
            if incremental:
                if note_id in processed_dict and processed_dict.get(note_id) == node_updated:
                    continue
                if node_color != "DEFAULT" or len(lbl_ids) > 0:
                    continue
            else:
                if not include_labeled and (node_color != "DEFAULT" or len(lbl_ids) > 0):
                    continue
            
            # Rule matching
            matched = False
            for rule in TAXONOMY_RULES:
                matched_rule = False
                for kw in rule["keywords"]:
                    if r"\b" in kw:
                        if re.search(kw, content, re.I):
                            matched_rule = True
                            break
                    else:
                        if kw.lower() in content.lower():
                            matched_rule = True
                            break
                if matched_rule:
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
                    "labels": ["待整理"],
                    "snapshot_updated": node_updated
                }
                
        return plan
