#!/usr/bin/env python3
"""
tests/engine/test_outline_review.py
TDD Unit tests for Studio v2 Pedagogical Outline Review & Editing (P3.3).
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


class TestOutlineReviewLogic(unittest.TestCase):

    def test_update_slide_layout_in_outline(self):
        """Updating a slide's layout in outline persists the new layoutId."""
        script = """
        import { updateOutlineSlide, approveOutline } from './studio/outline_editor.js';

        const initialOutline = {
          projectId: 'p1',
          status: 'draft',
          slides: [
            { slideIndex: 0, title: 'Intro', layoutId: 'title-slide', visualNeed: 'none' },
            { slideIndex: 1, title: 'Concept', layoutId: 'bullet-breakdown', visualNeed: 'diagram' }
          ]
        };

        const updated = updateOutlineSlide(initialOutline, 1, { layoutId: 'concept-explain' });
        console.log(JSON.stringify(updated));
        """
        outline = run_node_script(script)
        self.assertEqual(outline["slides"][1]["layoutId"], "concept-explain")

    def test_add_and_remove_outline_slide(self):
        """Can add a new slide item and remove an existing slide in outline."""
        script = """
        import { addOutlineSlide, removeOutlineSlide } from './studio/outline_editor.js';

        const initialOutline = {
          projectId: 'p1',
          status: 'draft',
          slides: [
            { slideIndex: 0, title: 'S1', layoutId: 'title-slide' },
            { slideIndex: 1, title: 'S2', layoutId: 'concept-explain' }
          ]
        };

        const withNew = addOutlineSlide(initialOutline, { title: 'S3 New', layoutId: 'summary' });
        const withRemoved = removeOutlineSlide(withNew, 0);
        console.log(JSON.stringify(withRemoved));
        """
        outline = run_node_script(script)
        self.assertEqual(len(outline["slides"]), 2)
        self.assertEqual(outline["slides"][0]["title"], "S2")
        self.assertEqual(outline["slides"][1]["title"], "S3 New")

    def test_reorder_outline_slides(self):
        """Reordering slides correctly updates positions and slideIndex."""
        script = """
        import { reorderOutlineSlides } from './studio/outline_editor.js';

        const outline = {
          projectId: 'p1',
          slides: [
            { slideIndex: 0, title: 'First' },
            { slideIndex: 1, title: 'Second' },
            { slideIndex: 2, title: 'Third' }
          ]
        };

        const reordered = reorderOutlineSlides(outline, 0, 2);
        console.log(JSON.stringify(reordered));
        """
        outline = run_node_script(script)
        self.assertEqual(outline["slides"][0]["title"], "Second")
        self.assertEqual(outline["slides"][1]["title"], "Third")
        self.assertEqual(outline["slides"][2]["title"], "First")
        self.assertEqual(outline["slides"][2]["slideIndex"], 2)

    def test_approve_outline_sets_status_approved(self):
        """approveOutline sets status to 'approved' and ensures valid slideIndex sequence."""
        script = """
        import { approveOutline } from './studio/outline_editor.js';

        const outline = {
          projectId: 'p1',
          status: 'draft',
          slides: [
            { slideIndex: 5, title: 'Only Slide', layoutId: 'title-slide' }
          ]
        };

        const approved = approveOutline(outline);
        console.log(JSON.stringify(approved));
        """
        outline = run_node_script(script)
        self.assertEqual(outline["status"], "approved")
        self.assertEqual(outline["slides"][0]["slideIndex"], 0)

    def test_empty_slot_renders_placeholder(self):
        """Rendering a slide with empty slotValues renders a safe placeholder and no crash."""
        script = """
        import { renderSlide } from './templates/index.js';

        const emptySlide = {
          slideId: 's-empty',
          templateId: 'concept-explain',
          title: 'Khái niệm trống',
          layoutVariant: 'default',
          slotValues: {
            body: '' // explicitly empty slot
          },
          elements: []
        };

        const html = renderSlide(emptySlide, 0);
        console.log(JSON.stringify({ html, hasPlaceholder: html.includes('data-slot-placeholder="true"') }));
        """
        res = run_node_script(script)
        self.assertTrue(res["hasPlaceholder"])
        self.assertNotIn("undefined", res["html"])
        self.assertNotIn("null", res["html"])



if __name__ == '__main__':
    unittest.main()
