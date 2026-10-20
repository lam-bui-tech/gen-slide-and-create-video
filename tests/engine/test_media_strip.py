#!/usr/bin/env python3
"""
tests/engine/test_media_strip.py
TDD Unit tests for Studio v2 Media Strip & Variant Fallback (P4.3).
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


class TestMediaStripReducer(unittest.TestCase):

    def test_set_media_slot_updates_slot_values_and_image_element(self):
        """SET_MEDIA_SLOT updates slide.slotValues.media and synchronizes elements array."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const scene = {
          projectId: 'p1',
          totalDurationSeconds: 10,
          slides: [
            {
              slideId: 's1',
              templateId: 'concept-explain',
              layoutVariant: 'no-image',
              slotValues: { body: 'Def' },
              elements: [
                { id: 'img-concept', type: 'image', content: '' }
              ],
              animations: [],
              voice: { narration: 'Test', provider: 'vieneu' },
              durationSeconds: 10
            }
          ]
        };

        const next = sceneReducer(scene, {
          type: 'SET_MEDIA_SLOT',
          payload: {
            slideIndex: 0,
            mediaUrl: 'https://example.com/photo.jpg',
            variant: 'text-left-image-right'
          }
        });

        console.log(JSON.stringify(next.slides[0]));
        """
        slide = run_node_script(script)
        self.assertEqual(slide["slotValues"]["media"], "https://example.com/photo.jpg")
        self.assertEqual(slide["layoutVariant"], "text-left-image-right")
        self.assertEqual(slide["elements"][0]["content"], "https://example.com/photo.jpg")

    def test_remove_media_slot_falls_back_to_no_image_variant(self):
        """REMOVE_MEDIA_SLOT clears media content and automatically switches variant to no-image."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const scene = {
          projectId: 'p1',
          totalDurationSeconds: 10,
          slides: [
            {
              slideId: 's1',
              templateId: 'concept-explain',
              layoutVariant: 'text-left-image-right',
              slotValues: { body: 'Def', media: 'https://example.com/photo.jpg' },
              elements: [
                { id: 'img-concept', type: 'image', content: 'https://example.com/photo.jpg' }
              ],
              animations: [],
              voice: { narration: 'Test', provider: 'vieneu' },
              durationSeconds: 10
            }
          ]
        };

        const next = sceneReducer(scene, {
          type: 'REMOVE_MEDIA_SLOT',
          payload: { slideIndex: 0 }
        });

        console.log(JSON.stringify(next.slides[0]));
        """
        slide = run_node_script(script)
        self.assertIsNone(slide["slotValues"].get("media"))
        self.assertEqual(slide["layoutVariant"], "no-image")
        self.assertEqual(slide["elements"][0]["content"], "")


if __name__ == '__main__':
    unittest.main()
