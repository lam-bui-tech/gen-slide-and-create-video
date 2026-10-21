#!/usr/bin/env python3
"""
tests/engine/test_registry.py
TDD Contract Tests for:
1. templates/registry.js: TemplateRegistry deep module (list, get, getLayout, validate)
2. templates/migration.js: JS port of v1 -> v2 migration, matching golden fixtures.
"""

import json
import os
import subprocess
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_MIGRATION_DIR = os.path.join(ROOT_DIR, "fixtures", "migration")


def run_node_script(script_code: str) -> dict:
    """Helper to execute inline Node.js ES module and return parsed JSON."""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script_code],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    if result.returncode != 0:
        raise RuntimeError(f"Node execution failed (code {result.returncode}):\n{result.stderr}\nStdout:\n{result.stdout}")
    return json.loads(result.stdout.strip())


class TestTemplateRegistryAndMigration(unittest.TestCase):

    def test_js_migration_matches_python_golden_fixture(self):
        """JS port of migrateSceneV1ToV2 must produce identical output to A's golden fixture."""
        script = """
        import fs from 'fs';
        import { migrateSceneV1ToV2 } from './templates/migration.js';

        const v1Input = JSON.parse(fs.readFileSync('./fixtures/migration/v1_all_10_layouts.json', 'utf-8'));
        const migrated = migrateSceneV1ToV2(v1Input);
        console.log(JSON.stringify(migrated));
        """
        js_migrated = run_node_script(script)

        with open(os.path.join(FIXTURES_MIGRATION_DIR, "expected_v2_all_10_layouts.json"), "r", encoding="utf-8") as f:
            expected_v2 = json.load(f)

        self.assertEqual(js_migrated["schemaVersion"], 2)
        self.assertEqual(js_migrated["packId"], "basic")
        self.assertEqual(len(js_migrated["slides"]), len(expected_v2["slides"]))

        for i, (m_slide, exp_slide) in enumerate(zip(js_migrated["slides"], expected_v2["slides"])):
            self.assertEqual(m_slide["slideId"], exp_slide["slideId"], f"Slide {i} ID mismatch")
            self.assertEqual(m_slide["layoutId"], exp_slide["layoutId"], f"Slide {i} layoutId mismatch")
            self.assertEqual(m_slide["variantId"], exp_slide["variantId"], f"Slide {i} variantId mismatch")
            self.assertEqual(m_slide["slotValues"], exp_slide["slotValues"], f"Slide {i} slotValues mismatch")
            self.assertEqual(m_slide["media"], exp_slide["media"], f"Slide {i} media mismatch")

    def test_js_registry_loads_basic_pack(self):
        """TemplateRegistry.get('basic') must return basic pack with 10 layouts."""
        script = """
        import { TemplateRegistry } from './templates/registry.js';
        const pack = TemplateRegistry.get('basic');
        console.log(JSON.stringify(pack));
        """
        pack = run_node_script(script)
        self.assertIsNotNone(pack)
        self.assertEqual(pack["id"], "basic")
        self.assertEqual(len(pack["layouts"]), 10)

    def test_js_registry_get_layout(self):
        """TemplateRegistry.getLayout('basic', layoutId) must return layout with slots and variants."""
        script = """
        import { TemplateRegistry } from './templates/registry.js';
        const layout = TemplateRegistry.getLayout('basic', 'concept-explain');
        console.log(JSON.stringify(layout));
        """
        layout = run_node_script(script)
        self.assertIsNotNone(layout)
        self.assertEqual(layout["id"], "concept-explain")
        self.assertEqual(layout["purpose"], "concept-explain")
        slot_ids = [s["id"] for s in layout["slots"]]
        self.assertIn("title", slot_ids)
        self.assertIn("body", slot_ids)

    def test_js_registry_validates_pack(self):
        """TemplateRegistry.validate(pack) must check required fields and tags."""
        script = """
        import { TemplateRegistry } from './templates/registry.js';
        const validRes = TemplateRegistry.validate({
            id: 'test-pack',
            name: 'Test',
            description: 'Test pack',
            aspectRatio: '16:9',
            tokens: { colors: {}, fonts: {}, spacing: {} },
            tags: { subject: ['tong-hop'], style: ['hien-dai-toi-gian'], effect: ['nhe-nhang-fade'] },
            layouts: [{ id: 'l1', name: 'L1', purpose: 'concept-explain', slots: [], variants: [{ id: 'default', name: 'Default' }] }]
        });
        const invalidRes = TemplateRegistry.validate({ id: 'bad' });
        console.log(JSON.stringify({ validRes, invalidRes }));
        """
        res = run_node_script(script)
        self.assertTrue(res["validRes"]["valid"])
        self.assertFalse(res["invalidRes"]["valid"])
        self.assertGreater(len(res["invalidRes"]["errors"]), 0)


if __name__ == '__main__':
    unittest.main()
