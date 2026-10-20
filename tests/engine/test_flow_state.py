#!/usr/bin/env python3
"""
tests/engine/test_flow_state.py
TDD Unit Tests for Studio v2 Flow State Machine (P2.3):
States: gallery -> pack-selected -> uploading -> clarifying -> studio.
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


class TestStudioFlowStateMachine(unittest.TestCase):

    def test_initial_state_is_gallery(self):
        """Initial state of flow machine must be 'gallery' with empty selection."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "gallery")
        self.assertIsNone(state["selectedPackId"])

    def test_select_pack_transitions_to_pack_selected(self):
        """Selecting a pack transitions from 'gallery' to 'pack-selected'."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'SELECT_PACK', packId: 'basic' });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "pack-selected")
        self.assertEqual(state["selectedPackId"], "basic")

    def test_start_upload_transitions_to_uploading(self):
        """Starting upload transitions to 'uploading' state."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'SELECT_PACK', packId: 'basic' });
        machine.transition({ type: 'START_UPLOAD' });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "uploading")

    def test_upload_success_transitions_to_clarifying(self):
        """Upload success with pending questions transitions to 'clarifying'."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'SELECT_PACK', packId: 'basic' });
        machine.transition({ type: 'START_UPLOAD' });
        machine.transition({ type: 'UPLOAD_SUCCESS', projectId: 'proj-123', needsClarification: true });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "clarifying")
        self.assertEqual(state["projectId"], "proj-123")

    def test_clarify_or_skip_transitions_to_studio(self):
        """Clarification submission transitions to 'studio'."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'SELECT_PACK', packId: 'basic' });
        machine.transition({ type: 'START_UPLOAD' });
        machine.transition({ type: 'UPLOAD_SUCCESS', projectId: 'proj-123', needsClarification: true });
        machine.transition({ type: 'CLARIFY_SUBMIT', scene: { projectId: 'proj-123', slides: [] } });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "studio")

    def test_open_recent_project_direct_to_studio(self):
        """Opening a recent project directly transitions to 'studio'."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'OPEN_PROJECT', projectId: 'old-proj', scene: { projectId: 'old-proj', slides: [] } });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "studio")
        self.assertEqual(state["projectId"], "old-proj")

    def test_back_to_gallery_resets_flow(self):
        """BACK_TO_GALLERY action resets state to 'gallery'."""
        script = """
        import { createFlowMachine } from './studio/flow.js';
        const machine = createFlowMachine();
        machine.transition({ type: 'SELECT_PACK', packId: 'basic' });
        machine.transition({ type: 'BACK_TO_GALLERY' });
        console.log(JSON.stringify(machine.getState()));
        """
        state = run_node_script(script)
        self.assertEqual(state["current"], "gallery")


if __name__ == '__main__':
    unittest.main()
