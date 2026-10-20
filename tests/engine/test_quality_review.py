#!/usr/bin/env python3
"""
tests/engine/test_quality_review.py
TDD Table-driven Unit tests for Studio v2 Pedagogical Quality Review (P7.4).
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


class TestPedagogicalQualityReview(unittest.TestCase):

    def test_audit_deck_quality_pure_function(self):
        """Table-driven evaluation of pedagogical rules across sample deck."""
        script = """
        import { auditDeckQuality, DEFAULT_THRESHOLDS } from './studio/quality.js';

        const testDeck = {
          projectId: 'p-pedagogy-test',
          title: 'Khóa học Mẫu',
          slides: [
            // Slide 0: Perfect slide
            {
              slideId: 's-good',
              templateId: 'concept-explain',
              title: 'Mô hình Client-Server',
              slotValues: {
                title: 'Mô hình Client-Server',
                body: 'Client gửi yêu cầu, Server xử lý và trả về phản hồi.'
              },
              elements: [
                { id: 'img-1', type: 'image', content: 'https://img.com/cs.png', alt: 'Sơ đồ Client-Server' }
              ],
              voice: { narration: 'Client gửi yêu cầu, Server xử lý và trả về kết quả.', durationSeconds: 6.0 },
              durationSeconds: 7.0
            },
            // Slide 1: High text density (> 300 chars)
            {
              slideId: 's-dense',
              templateId: 'bullet-breakdown',
              title: 'Văn bản quá dài',
              slotValues: {
                title: 'Văn bản quá dài',
                body: 'A'.repeat(450)
              },
              elements: [],
              voice: { narration: 'Văn bản rất dài cần được phân tách ra.', durationSeconds: 15.0 },
              durationSeconds: 16.0
            },
            // Slide 2: Too fast reading speed (> 4.5 words/s)
            {
              slideId: 's-fast',
              templateId: 'concept-explain',
              title: 'Đọc vội vã',
              slotValues: { title: 'Đọc vội vã', body: 'Nội dung ngắn.' },
              elements: [],
              // 25 words in 3 seconds = 8.3 words/s
              voice: {
                narration: 'Một hai ba bốn năm sáu bảy tám chín mười mười một mười hai mười ba mười bốn mười lăm mười sáu mười bảy mười tám mười chín hai mươi hai mốt hai hai hai ba hai bốn hai lăm.',
                durationSeconds: 3.0
              },
              durationSeconds: 3.5
            },
            // Slide 3: Missing alt text on image
            {
              slideId: 's-missing-alt',
              templateId: 'image-explain',
              title: 'Ảnh không chú thích',
              slotValues: { title: 'Ảnh không chú thích' },
              elements: [
                { id: 'img-no-alt', type: 'image', content: 'https://img.com/raw.png' }
              ],
              voice: { narration: 'Quan sát hình ảnh sau đây.', durationSeconds: 5.0 },
              durationSeconds: 6.0
            },
            // Slide 4: Too short duration (< 3s)
            {
              slideId: 's-short',
              templateId: 'summary',
              title: 'Quá ngắn',
              slotValues: { title: 'Quá ngắn' },
              elements: [],
              voice: { narration: 'Hết.', durationSeconds: 1.0 },
              durationSeconds: 1.5
            }
          ]
        };

        const report = auditDeckQuality(testDeck);
        console.log(JSON.stringify(report));
        """
        report = run_node_script(script)

        self.assertIn("score", report)
        self.assertIn("issues", report)
        issues = report["issues"]

        # Slide 0 should have no critical issues
        slide0_issues = [i for i in issues if i["slideIndex"] == 0]
        self.assertEqual(len(slide0_issues), 0)

        # Slide 1: High text density
        dense_issue = next((i for i in issues if i["slideIndex"] == 1 and i["rule"] == "TEXT_DENSITY_HIGH"), None)
        self.assertIsNotNone(dense_issue)
        self.assertEqual(dense_issue["level"], "warning")

        # Slide 2: Fast reading speed
        fast_issue = next((i for i in issues if i["slideIndex"] == 2 and i["rule"] == "READING_SPEED_FAST"), None)
        self.assertIsNotNone(fast_issue)
        self.assertEqual(fast_issue["level"], "warning")

        # Slide 3: Missing alt text
        alt_issue = next((i for i in issues if i["slideIndex"] == 3 and i["rule"] == "MISSING_ALT_TEXT"), None)
        self.assertIsNotNone(alt_issue)

        # Slide 4: Too short
        short_issue = next((i for i in issues if i["slideIndex"] == 4 and i["rule"] == "SLIDE_TOO_SHORT"), None)
        self.assertIsNotNone(short_issue)
        self.assertEqual(short_issue["level"], "error")

    def test_custom_thresholds_override(self):
        """Pure function respects user-defined custom thresholds."""
        script = """
        import { auditDeckQuality } from './studio/quality.js';

        const deck = {
          slides: [
            {
              slideId: 's-1',
              title: 'Test',
              slotValues: { body: '1234567890' }, // 10 chars
              voice: { narration: 'Một hai ba', durationSeconds: 5.0 },
              durationSeconds: 5.0
            }
          ]
        };

        // Override maxChars to 5 -> should trigger TEXT_DENSITY_HIGH
        const report = auditDeckQuality(deck, { maxTextChars: 5 });
        const hasIssue = report.issues.some(i => i.rule === 'TEXT_DENSITY_HIGH');
        console.log(JSON.stringify({ hasIssue }));
        """
        res = run_node_script(script)
        self.assertTrue(res["hasIssue"])


if __name__ == '__main__':
    unittest.main()
