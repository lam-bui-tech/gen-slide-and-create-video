#!/usr/bin/env python3
"""
tests/engine/test_studio_pack_switch.py
TDD Unit tests for Studio v2 template pack switching and state management (P2.3).
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


class TestStudioPackSwitch(unittest.TestCase):

    def test_switch_template_pack_updates_scene(self):
        """SWITCH_TEMPLATE_PACK action updates templatePackId on scene and slide packIds."""
        script = """
        import { studioReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'proj-1',
          templatePackId: 'basic',
          totalDurationSeconds: 10,
          slides: [
            {
              slideId: 's1',
              templateId: 'title-slide',
              packId: 'basic',
              elements: [],
              animations: [],
              voice: { narration: 'Hello', provider: 'vieneu' },
              durationSeconds: 10
            }
          ]
        };

        const next = studioReducer(initialScene, {
          type: 'SWITCH_TEMPLATE_PACK',
          payload: { packId: 'basic' }
        });

        console.log(JSON.stringify(next));
        """
        scene = run_node_script(script)
        self.assertEqual(scene["templatePackId"], "basic")
        self.assertEqual(scene["slides"][0]["packId"], "basic")

    def test_switch_pack_with_unknown_pack_throws(self):
        """Switching to an unregistered pack throws descriptive Error."""
        script = """
        import { studioReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'proj-1',
          templatePackId: 'basic',
          totalDurationSeconds: 10,
          slides: [
            {
              slideId: 's1',
              templateId: 'title-slide',
              packId: 'basic',
              elements: [],
              animations: [],
              voice: { narration: 'Hello', provider: 'vieneu' },
              durationSeconds: 10
            }
          ]
        };

        try {
          studioReducer(initialScene, {
            type: 'SWITCH_TEMPLATE_PACK',
            payload: { packId: 'non-existent-pack' }
          });
          console.log(JSON.stringify({ error: false }));
        } catch (err) {
          console.log(JSON.stringify({ error: true, message: err.message }));
        }
        """
        res = run_node_script(script)
        self.assertTrue(res["error"])
        self.assertIn("non-existent-pack", res["message"])


if __name__ == '__main__':
    unittest.main()
