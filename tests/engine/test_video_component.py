#!/usr/bin/env python3
"""
tests/engine/test_video_component.py
TDD Unit tests for Studio v2 Canvas Video Component (P6.3).
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


class TestVideoComponent(unittest.TestCase):

    def test_update_video_component_action_in_reducer(self):
        """UPDATE_VIDEO_COMPONENT updates video element attributes in slide."""
        script = """
        import { sceneReducer } from './studio/reducer.js';

        const initialScene = {
          projectId: 'p1',
          totalDurationSeconds: 15,
          slides: [
            {
              slideId: 's-video',
              templateId: 'concept-explain',
              layoutVariant: 'default',
              elements: [
                {
                  id: 'vid-main',
                  type: 'video',
                  content: 'https://example.com/lecture_clip.mp4',
                  trimStart: 0.0,
                  trimEnd: 10.0,
                  volume: 1.0,
                  ducking: true
                }
              ],
              animations: [],
              voice: { narration: 'Giảng viên đang giải thích thí nghiệm.', durationSeconds: 8.0, provider: 'vieneu' },
              durationSeconds: 15.0
            }
          ]
        };

        const next = sceneReducer(initialScene, {
          type: 'UPDATE_VIDEO_COMPONENT',
          payload: {
            slideIndex: 0,
            elementId: 'vid-main',
            changes: {
              trimStart: 2.5,
              trimEnd: 8.5,
              volume: 0.8,
              ducking: true
            }
          }
        });

        const vid = next.slides[0].elements.find(e => e.id === 'vid-main');
        console.log(JSON.stringify(vid));
        """
        vid = run_node_script(script)
        self.assertEqual(vid["trimStart"], 2.5)
        self.assertEqual(vid["trimEnd"], 8.5)
        self.assertEqual(vid["volume"], 0.8)
        self.assertTrue(vid["ducking"])

    def test_render_video_element_emits_hyperframes_data_attributes(self):
        """Video element renders <video> tag with full HyperFrames P6.1 data attributes."""
        script = """
        import { renderSlide } from './templates/index.js';

        const videoSlide = {
          slideId: 's-vid-render',
          templateId: 'concept-explain',
          title: 'Mô phỏng Thí nghiệm',
          layoutVariant: 'default',
          elements: [
            {
              id: 'vid-exp',
              type: 'video',
              content: 'storage/projects/p1/videos/clip.mp4',
              trimStart: 1.5,
              trimEnd: 9.0,
              volume: 1.0,
              ducking: true
            }
          ],
          animations: [],
          voice: { narration: 'Quan sát chuyển động phân tử...', durationSeconds: 7.0, provider: 'vieneu' },
          durationSeconds: 12.0
        };

        const html = renderSlide(videoSlide, 0, 0);
        console.log(JSON.stringify({
          html,
          hasVideoTag: html.includes('<video'),
          hasDataStart: html.includes('data-start="0"'),
          hasDataMediaStart: html.includes('data-media-start="1.5"'),
          hasDataVolumeDucking: html.includes('data-volume="0.2"') || html.includes('data-ducking="true"'),
          hasDataHasAudio: html.includes('data-has-audio="true"')
        }));
        """
        res = run_node_script(script)
        self.assertTrue(res["hasVideoTag"])
        self.assertTrue(res["hasDataStart"])
        self.assertTrue(res["hasDataMediaStart"])
        self.assertTrue(res["hasDataVolumeDucking"])
        self.assertTrue(res["hasDataHasAudio"])


if __name__ == '__main__':
    unittest.main()
