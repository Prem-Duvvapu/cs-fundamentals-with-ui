import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('topic_inventory', ROOT / '.claude/skills/list-topics/list_topics.py')
inventory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory)


class TopicInventoryTests(unittest.TestCase):
    def test_actual_registry_matches_all_browser_metadata(self):
        topics = inventory.load_topics()
        self.assertEqual(len(topics), 68)
        self.assertEqual(inventory.audit(topics, inventory.content_files())[0], [])
        self.assertEqual(topics, json.loads(inventory.read('frontend/src/test/catalog.json')))

    def test_refuses_unknown_constructor_instead_of_silently_omitting_topic(self):
        with patch.object(inventory, 'read', return_value='new Topic("unrecognized", 42)'):
            with self.assertRaises(ValueError):
                inventory.load_topics()

    def test_content_requires_exact_id(self):
        self.assertIsNone(inventory.resolve_content({'os': {'memory-extra': '01-memory-extra.md'}}, 'os', 'memory'))

    def test_audit_detects_fixture_drift(self):
        original = inventory.read
        def drift(path):
            content = original(path)
            if path == 'frontend/src/test/catalog.json':
                rows = json.loads(content)
                rows[0]['outcomes'] = ['wrong outcome']
                return json.dumps(rows)
            return content
        topics = inventory.load_topics()
        with patch.object(inventory, 'read', side_effect=drift):
            problems, _ = inventory.audit(topics, inventory.content_files())
        self.assertTrue(any('canonical browser fixture metadata' in item for item in problems))


if __name__ == '__main__':
    unittest.main()
