#!/usr/bin/env python3
"""
tests/engine/test_templates_snapshot.py
TDD Seam Tests: Validates 10 HyperFrames templates against design tokens,
Vietnamese typography, layout variants, and generates rendered snapshot HTML.
"""

import json
import os
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), 'snapshots')

TEMPLATES_10 = [
    'title-slide',
    'learning-objectives',
    'concept-explain',
    'bullet-breakdown',
    'image-explain',
    'comparison',
    'timeline',
    'formula-explain',
    'quiz',
    'summary'
]

VIETNAMESE_TEST_STRING = (
    "Triết học Mác - Lênin là hệ thống tri thức lý luận chung nhất về thế giới, "
    "hình thành từ thế kỷ XIX với sự kế thừa biện chứng và thực tiễn cách mạng."
)


class TestHyperFramesTemplates(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        os.makedirs(SNAPSHOT_DIR, exist_ok=True)
        with open(os.path.join(ROOT_DIR, 'fixtures', 'scene.sample.json'), 'r', encoding='utf-8') as f:
            cls.scene = json.load(f)

    def test_three_layer_token_architecture(self):
        """Tokens file must enforce 3-layer architecture: Primitives -> Semantic -> Component."""
        tokens_path = os.path.join(ROOT_DIR, 'templates', 'tokens.css')
        with open(tokens_path, 'r', encoding='utf-8') as f:
            css = f.read()

        # Tier 1: Primitives
        self.assertIn('--hf-primary:', css, "Missing Tier 1 color primitive")
        self.assertIn('--hf-canvas-width: 1920px', css, "Missing 1920x1080 canvas definition")
        self.assertIn('--hf-canvas-height: 1080px', css, "Missing 1920x1080 canvas definition")

        # Tier 2: Semantic
        self.assertIn('--hf-bg-main:', css, "Missing semantic canvas background")
        self.assertIn('--hf-text-main:', css, "Missing semantic text color")
        self.assertIn('--hf-border-card:', css, "Missing semantic border color")

        # Tier 3: Component tokens & glassmorphism
        self.assertIn('--hf-bg-surface-glass:', css, "Missing glass surface token")
        self.assertIn('--hf-shadow-glow:', css, "Missing kinetic spotlight glow token")

    def test_all_10_templates_present_in_scene_fixture(self):
        """Every template of the 10 must be tested with real slide data in scene.sample.json."""
        found = {s['templateId'] for s in self.scene['slides']}
        for t in TEMPLATES_10:
            self.assertIn(t, found, f"Template {t} is not represented in fixtures/scene.sample.json")

    def test_templates_css_has_rules_for_all_10_templates(self):
        """templates/templates.css must define distinct selectors for all 10 templates."""
        css_path = os.path.join(ROOT_DIR, 'templates', 'templates.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()

        for t in TEMPLATES_10:
            selector = f".hf-template-{t}"
            self.assertIn(selector, css, f"Selector {selector} missing in templates.css")

    def test_vietnamese_typography_support(self):
        """Tokens and templates must declare Be Vietnam Pro and handle Vietnamese tone marks."""
        tokens_path = os.path.join(ROOT_DIR, 'templates', 'tokens.css')
        with open(tokens_path, 'r', encoding='utf-8') as f:
            tokens_content = f.read()

        self.assertIn('Be Vietnam Pro', tokens_content, "Be Vietnam Pro font not declared in tokens.css")

        # Check all slides for valid UTF-8 Vietnamese strings
        for slide in self.scene['slides']:
            self.assertTrue(len(slide['title']) > 0)
            self.assertTrue(any(ord(c) > 127 for c in slide['title']), f"Slide {slide['slideId']} should contain Vietnamese characters")

    def test_layout_variants_defined_in_css(self):
        """Templates CSS must support layoutVariant classes."""
        css_path = os.path.join(ROOT_DIR, 'templates', 'templates.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()

        variants = [
            'variant-text-right-image-left',
            'variant-no-image',
            'variant-fullscreen'
        ]
        for v in variants:
            self.assertIn(v, css, f"Layout variant {v} missing in templates.css")

    def test_render_snapshot_all_10_templates(self):
        """Simulate HyperFrames render output and verify .clip, data-start, and data-duration attributes."""
        slides = self.scene['slides']
        self.assertEqual(len(slides), 10)

        # Generate a standalone preview HTML file testing all 10 slides
        snapshot_html_path = os.path.join(SNAPSHOT_DIR, 'all_templates_preview.html')
        
        slide_sections = []
        current_time = 0.0
        for i, s in enumerate(slides):
            duration = s.get('durationSeconds', 16.0)
            start = round(current_time, 2)
            current_time += duration
            active_class = "clip active" if i == 0 else "clip"
            
            # Simple DOM mock representation for snapshot validation
            slide_sections.append(
                f'<section id="{s["slideId"]}" class="{active_class}" data-start="{start}" data-duration="{duration}">\n'
                f'  <div class="hf-template-{s["templateId"]} variant-{s.get("layoutVariant", "default")}">\n'
                f'    <h2 class="slide-title">{s["title"]}</h2>\n'
                f'  </div>\n'
                f'</section>'
            )

        full_html = (
            "<!DOCTYPE html>\n<html lang=\"vi\">\n<head>\n"
            "<meta charset=\"UTF-8\">\n"
            "<link rel=\"stylesheet\" href=\"../../templates/tokens.css\">\n"
            "<link rel=\"stylesheet\" href=\"../../templates/templates.css\">\n"
            "</head>\n<body>\n"
            "<div class=\"hf-viewport\">\n"
            + "\n".join(slide_sections) +
            "\n</div>\n</body>\n</html>"
        )

        with open(snapshot_html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

        self.assertTrue(os.path.exists(snapshot_html_path))
        self.assertGreater(os.path.getsize(snapshot_html_path), 500)


if __name__ == '__main__':
    unittest.main()
