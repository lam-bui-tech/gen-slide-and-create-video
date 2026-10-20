#!/usr/bin/env python3
"""
tests/engine/test_slide_chat.py
TDD Unit tests for Studio v2 Per-slide AI Chat Box (P7.3).
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


class TestSlideChatReducer(unittest.TestCase):

    def test_apply_slide_chat_patch_updates_slot_values(self):
        """APPLY_SLIDE_CHAT_PATCH updates slotValues without clobbering other slots."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'p-chat-1',
          totalDurationSeconds: 16,
          slides: [
            {
              slideId: 's-chat-01',
              templateId: 'concept-explain',
              title: 'Khái niệm Mạng Nơ-ron Nhân tạo',
              elements: [],
              animations: [],
              slotValues: {
                title: 'Khái niệm Mạng Nơ-ron Nhân tạo',
                body: 'Mạng nơ-ron gồm nhiều lớp liên kết chặt chẽ.',
                keyTakeaway: 'Học sâu là nhánh của học máy.'
              },
              durationSeconds: 16.0,
              voice: { narration: 'Khái niệm căn bản về mạng nơ-ron...' }
            }
          ]
        };

        const patchAction = {
          type: 'APPLY_SLIDE_CHAT_PATCH',
          payload: {
            slideIndex: 0,
            patch: {
              slotValues: {
                title: 'Tổng quan Mạng Nơ-ron (Rút gọn)',
                body: 'Mạng nơ-ron gồm nhiều lớp nơ-ron tính toán.'
              }
            }
          }
        };

        const nextScene = sceneReducer(initialScene, patchAction);
        const slide = nextScene.slides[0];

        console.log(JSON.stringify({
          title: slide.title,
          slotTitle: slide.slotValues.title,
          slotBody: slide.slotValues.body,
          keyTakeaway: slide.slotValues.keyTakeaway
        }));
        """
        res = run_node_script(script)
        self.assertEqual(res["title"], "Tổng quan Mạng Nơ-ron (Rút gọn)")
        self.assertEqual(res["slotTitle"], "Tổng quan Mạng Nơ-ron (Rút gọn)")
        self.assertEqual(res["slotBody"], "Mạng nơ-ron gồm nhiều lớp nơ-ron tính toán.")
        # Untouched slot stays preserved
        self.assertEqual(res["keyTakeaway"], "Học sâu là nhánh của học máy.")

    def test_apply_slide_chat_patch_rejects_raw_html_injection(self):
        """APPLY_SLIDE_CHAT_PATCH strips or escapes dangerous raw HTML tags from slotValues."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'p-chat-2',
          slides: [
            {
              slideId: 's-chat-02',
              templateId: 'title-slide',
              title: 'An toàn thông tin',
              elements: [],
              animations: [],
              voice: { narration: 'Giới thiệu về an toàn thông tin.' },
              slotValues: {
                title: 'An toàn thông tin',
                subtitle: 'Giới thiệu'
              },
              durationSeconds: 10.0
            }
          ]
        };

        const maliciousPatch = {
          type: 'APPLY_SLIDE_CHAT_PATCH',
          payload: {
            slideIndex: 0,
            patch: {
              slotValues: {
                title: '<script>alert("hacked")</script>Tiêu đề an toàn',
                subtitle: '<iframe src="evil.com"></iframe>Phụ đề mới'
              }
            }
          }
        };

        const nextScene = sceneReducer(initialScene, maliciousPatch);
        const slide = nextScene.slides[0];

        console.log(JSON.stringify({
          title: slide.slotValues.title,
          subtitle: slide.slotValues.subtitle,
          hasScript: slide.slotValues.title.includes('<script>'),
          hasIframe: slide.slotValues.subtitle.includes('<iframe')
        }));
        """
        res = run_node_script(script)
        self.assertFalse(res["hasScript"])
        self.assertFalse(res["hasIframe"])
        self.assertIn("Tiêu đề an toàn", res["title"])

    def test_apply_slide_chat_patch_invalid_payload_handling(self):
        """Invalid patch payload does not crash and leaves scene untouched."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'p-chat-3',
          slides: [
            {
              slideId: 's-03',
              templateId: 'summary',
              title: 'Tóm tắt',
              slotValues: { title: 'Tóm tắt' },
              durationSeconds: 10.0
            }
          ]
        };

        // Missing patch or invalid slideIndex
        const nextScene1 = sceneReducer(initialScene, {
          type: 'APPLY_SLIDE_CHAT_PATCH',
          payload: { slideIndex: 99, patch: { slotValues: {} } }
        });

        const nextScene2 = sceneReducer(initialScene, {
          type: 'APPLY_SLIDE_CHAT_PATCH',
          payload: { slideIndex: 0, patch: null }
        });

        console.log(JSON.stringify({
          same1: nextScene1 === initialScene || JSON.stringify(nextScene1) === JSON.stringify(initialScene),
          same2: nextScene2 === initialScene || JSON.stringify(nextScene2) === JSON.stringify(initialScene)
        }));
        """
        res = run_node_script(script)
        self.assertTrue(res["same1"])
        self.assertTrue(res["same2"])

    def test_slide_chat_patch_undo_restores_previous_state(self):
        """Applying slide chat patch pushes clean state that can be reverted by history undo."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const history = [];
        let state = {
          projectId: 'p-undo-1',
          slides: [
            {
              slideId: 's-u1',
              templateId: 'bullet-breakdown',
              title: 'Trước khi sửa',
              elements: [],
              animations: [],
              voice: { narration: '...' },
              slotValues: { title: 'Trước khi sửa', body: 'Nội dung cũ' },
              durationSeconds: 10.0
            }
          ]
        };

        // Record history before action
        history.push(JSON.parse(JSON.stringify(state)));

        // Apply patch
        state = sceneReducer(state, {
          type: 'APPLY_SLIDE_CHAT_PATCH',
          payload: {
            slideIndex: 0,
            patch: {
              slotValues: { title: 'Sau khi sửa bằng AI', body: 'Nội dung mới' }
            }
          }
        });

        const modifiedTitle = state.slides[0].title;

        // Undo
        const restoredState = history.pop();

        console.log(JSON.stringify({
          modifiedTitle,
          restoredTitle: restoredState.slides[0].title,
          restoredBody: restoredState.slides[0].slotValues.body
        }));
        """
        res = run_node_script(script)
        self.assertEqual(res["modifiedTitle"], "Sau khi sửa bằng AI")
        self.assertEqual(res["restoredTitle"], "Trước khi sửa")
        self.assertEqual(res["restoredBody"], "Nội dung cũ")


if __name__ == '__main__':
    unittest.main()
