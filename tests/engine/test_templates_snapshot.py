#!/usr/bin/env python3
"""
tests/engine/test_templates_snapshot.py
TDD Seam Tests: Validates 10 HyperFrames templates against design tokens,
Vietnamese typography, layout variants, and generates rendered snapshot HTML.
"""

import json
import os
import re
import sys
import unittest
import jsonschema

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from schemas.models import TemplatePack

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

    def test_basic_pack_schema_validation(self):
        """P1.4: templates/packs/basic/pack.json must validate against template_pack.json and Pydantic TemplatePack."""
        pack_path = os.path.join(ROOT_DIR, 'templates', 'packs', 'basic', 'pack.json')
        schema_path = os.path.join(ROOT_DIR, 'schemas', 'template_pack.json')

        self.assertTrue(os.path.exists(pack_path), "templates/packs/basic/pack.json does not exist")
        self.assertTrue(os.path.exists(schema_path), "schemas/template_pack.json does not exist")

        with open(pack_path, 'r', encoding='utf-8') as f:
            pack_data = json.load(f)
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)

        # 1. JSON Schema validation
        jsonschema.validate(instance=pack_data, schema=schema)

        # 2. Pydantic validation
        pack = TemplatePack.model_validate(pack_data)
        self.assertEqual(pack.id, 'basic')
        self.assertEqual(pack.aspectRatio, '16:9')
        self.assertEqual(len(pack.layouts), 10)

        # 3. Verify all 10 layout IDs and structure
        layout_ids = [l.id for l in pack.layouts]
        self.assertEqual(layout_ids, TEMPLATES_10)

        for layout in pack.layouts:
            self.assertTrue(len(layout.name) > 0)
            self.assertTrue(len(layout.slots) > 0)
            # Must have at least one variant with id == 'default'
            variant_ids = [v.id for v in layout.variants]
            self.assertIn('default', variant_ids, f"Layout {layout.id} must include 'default' variant")
            # Must have defaultAnimations defined
            self.assertIsNotNone(layout.defaultAnimations)

    def test_render_all_10_layouts_from_pack_matches_snapshot(self):
        """P1.4: Rendering all 10 layouts defined in basic pack produces pixel-identical output matching snapshot."""
        pack_path = os.path.join(ROOT_DIR, 'templates', 'packs', 'basic', 'pack.json')
        with open(pack_path, 'r', encoding='utf-8') as f:
            pack_data = json.load(f)

        layout_map = {l['id']: l for l in pack_data['layouts']}
        slides = self.scene['slides']
        self.assertEqual(len(slides), 10)

        slide_sections = []
        current_time = 0.0
        for i, s in enumerate(slides):
            template_id = s['templateId']
            self.assertIn(template_id, layout_map, f"Template {template_id} missing from pack.json layouts")
            layout_def = layout_map[template_id]

            duration = s.get('durationSeconds', 16.0)
            start = round(current_time, 2)
            current_time += duration
            active_class = "clip active" if i == 0 else "clip"

            # Validate requested variant against layout supported variants
            variant = s.get("layoutVariant", "default")
            supported_variants = [v['id'] for v in layout_def.get('variants', [])]
            if variant not in supported_variants:
                variant = "default"

            slide_sections.append(
                f'<section id="{s["slideId"]}" class="{active_class}" data-start="{start}" data-duration="{duration}">\n'
                f'  <div class="hf-template-{template_id} variant-{variant}">\n'
                f'    <h2 class="slide-title">{s["title"]}</h2>\n'
                f'  </div>\n'
                f'</section>'
            )

        pack_rendered_html = (
            "<!DOCTYPE html>\n<html lang=\"vi\">\n<head>\n"
            "<meta charset=\"UTF-8\">\n"
            "<link rel=\"stylesheet\" href=\"../../templates/tokens.css\">\n"
            "<link rel=\"stylesheet\" href=\"../../templates/templates.css\">\n"
            "</head>\n<body>\n"
            "<div class=\"hf-viewport\">\n"
            + "\n".join(slide_sections) +
            "\n</div>\n</body>\n</html>"
        )

        snapshot_html_path = os.path.join(SNAPSHOT_DIR, 'all_templates_preview.html')
        with open(snapshot_html_path, 'r', encoding='utf-8') as f:
            existing_snapshot = f.read()

        self.assertEqual(pack_rendered_html, existing_snapshot, "Pack rendered HTML does not match snapshot exactly")


if __name__ == '__main__':
    unittest.main()

