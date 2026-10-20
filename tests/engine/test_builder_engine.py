#!/usr/bin/env python3
"""
tests/engine/test_builder_engine.py
TDD Unit tests for Studio v2 Template Builder Mode & Inspector Engine (P5.1, P5.2).
"""

import json
import os
import subprocess
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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


class TestTemplateBuilderEngine(unittest.TestCase):

    def test_create_draft_layout_and_snap_to_grid(self):
        """Builder creates empty draft layout and snaps coordinates to grid (8px or 16px)."""
        script = """
        import { createDraftLayout, snapToGrid } from './studio/builder.js';

        const draft = createDraftLayout('custom-slide', 'Bố Cục Tùy Biến');
        const snapped1 = snapToGrid(123, 8);
        const snapped2 = snapToGrid(125, 16);

        console.log(JSON.stringify({ draft, snapped1, snapped2 }));
        """
        res = run_node_script(script)
        self.assertEqual(res["draft"]["id"], "custom-slide")
        self.assertEqual(res["snapped1"], 120)  # 123 snapped to 8 -> 120 (15 * 8 = 120)
        self.assertEqual(res["snapped2"], 128)  # 125 snapped to 16 -> 128 (8 * 16 = 128)

    def test_add_and_update_block_in_draft_layout(self):
        """Add text block, update position and dimensions in draftLayout."""
        script = """
        import { createDraftLayout, addDraftBlock, updateDraftBlock } from './studio/builder.js';

        let draft = createDraftLayout('layout-test', 'Test Layout');
        draft = addDraftBlock(draft, {
          id: 'title-heading',
          type: 'text',
          x: 100,
          y: 80,
          width: 800,
          height: 120,
          content: 'Tiêu đề mặc định'
        });

        draft = updateDraftBlock(draft, 'title-heading', { x: 120, y: 96 });
        console.log(JSON.stringify(draft));
        """
        draft = run_node_script(script)
        self.assertEqual(len(draft["elements"]), 1)
        self.assertEqual(draft["elements"][0]["x"], 120)
        self.assertEqual(draft["elements"][0]["y"], 96)

    def test_mark_slot_role_vs_decor(self):
        """Can assign element to a dynamic slot role or mark as static decor."""
        script = """
        import { createDraftLayout, addDraftBlock, setElementSlotRole } from './studio/builder.js';

        let draft = createDraftLayout('layout-slot', 'Slot Test');
        draft = addDraftBlock(draft, { id: 'card-1', type: 'card', content: 'Card' });
        draft = addDraftBlock(draft, { id: 'shape-bg', type: 'decor', content: '<svg></svg>' });

        draft = setElementSlotRole(draft, 'card-1', {
          slotName: 'body',
          role: 'slot',
          constraints: { maxLength: 200, required: true }
        });

        draft = setElementSlotRole(draft, 'shape-bg', {
          role: 'decor'
        });

        console.log(JSON.stringify(draft));
        """
        draft = run_node_script(script)
        slots = draft.get("slots", [])
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0]["name"], "body")
        self.assertEqual(slots[0]["targetElementId"], "card-1")
        self.assertEqual(slots[0]["constraints"]["maxLength"], 200)

    def test_validate_draft_layout_for_saving(self):
        """Validates layout conforms to schema v2 before sending to POST /packs/{id}/layouts."""
        script = """
        import { createDraftLayout, addDraftBlock, setElementSlotRole, validateDraftLayout } from './studio/builder.js';

        let draft = createDraftLayout('valid-layout', 'Bố Cục Hợp Lệ', 'academic');
        draft = addDraftBlock(draft, { id: 'txt-1', type: 'text', content: 'Sample' });
        draft = setElementSlotRole(draft, 'txt-1', { slotName: 'title', role: 'slot' });

        const validation = validateDraftLayout(draft);
        console.log(JSON.stringify(validation));
        """
        res = run_node_script(script)
        self.assertTrue(res["valid"])
        self.assertEqual(len(res["errors"]), 0)


if __name__ == '__main__':
    unittest.main()
