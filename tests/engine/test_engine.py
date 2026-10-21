#!/usr/bin/env python3
"""
tests/engine/test_engine.py
Test suite for Person B (Engine & Studio)
- Validates 10 HyperFrames templates against fixtures/scene.sample.json
- Verifies design tokens in templates/tokens.css
- Verifies layout variants in templates/templates.css
- Verifies pure mapper outline_to_hyperframes.js
"""

import json
import os
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EXPECTED_TEMPLATES = [
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

REQUIRED_TOKENS = [
    '--hf-bg-main',
    '--hf-primary',
    '--hf-accent-amber',
    '--hf-accent-emerald',
    '--hf-accent-rose',
    '--hf-text-main',
    '--hf-text-sub',
    '--hf-border-card',
    '--hf-canvas-width',
    '--hf-canvas-height'
]


class TestEngineAndTemplates(unittest.TestCase):

    def test_tokens_css_exists_and_contains_design_tokens(self):
        """Tokens file must define required Academic Ocean & Amber tokens."""
        tokens_path = os.path.join(ROOT_DIR, 'templates', 'tokens.css')
        self.assertTrue(os.path.exists(tokens_path), "templates/tokens.css does not exist")
        with open(tokens_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for token in REQUIRED_TOKENS:
            self.assertIn(token, content, f"Missing token definition: {token}")

    def test_templates_css_defines_all_10_templates(self):
        """templates/templates.css must define classes for all 10 templates."""
        css_path = os.path.join(ROOT_DIR, 'templates', 'templates.css')
        self.assertTrue(os.path.exists(css_path), "templates/templates.css does not exist")
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for t_id in EXPECTED_TEMPLATES:
            class_name = f".hf-template-{t_id}"
            self.assertIn(class_name, content, f"CSS class missing for template: {class_name}")

    def test_templates_index_js_registers_all_10_templates(self):
        """templates/index.js must export TEMPLATES with all 10 templates."""
        index_js_path = os.path.join(ROOT_DIR, 'templates', 'index.js')
        self.assertTrue(os.path.exists(index_js_path), "templates/index.js does not exist")
        with open(index_js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for t_id in EXPECTED_TEMPLATES:
            self.assertIn(f"'{t_id}':", content, f"Template registry missing: {t_id}")

    def test_sample_scene_contains_all_10_templates(self):
        """fixtures/scene.sample.json must represent all 10 templates across its slides."""
        scene_path = os.path.join(ROOT_DIR, 'fixtures', 'scene.sample.json')
        self.assertTrue(os.path.exists(scene_path), "fixtures/scene.sample.json does not exist")
        with open(scene_path, 'r', encoding='utf-8') as f:
            scene = json.load(f)

        self.assertIn('slides', scene)
        self.assertEqual(len(scene['slides']), 10, "Scene sample must have 10 slides")

        found_templates = [s.get('templateId') for s in scene['slides']]
        for t_id in EXPECTED_TEMPLATES:
            self.assertIn(t_id, found_templates, f"Template {t_id} not present in scene.sample.json")

    def test_vietnamese_typography_integrity(self):
        """Verify Vietnamese diacritics and text characters in sample fixtures are intact."""
        scene_path = os.path.join(ROOT_DIR, 'fixtures', 'scene.sample.json')
        with open(scene_path, 'r', encoding='utf-8') as f:
            raw_text = f.read()

        # Check essential Vietnamese diacritics
        vietnamese_samples = ['Triết học', 'Mác - Lênin', 'nguồn gốc', 'thế giới', 'biện chứng', 'nhận thức']
        for sample in vietnamese_samples:
            self.assertIn(sample, raw_text, f"Vietnamese text sample missing or corrupted: {sample}")

    def test_outline_to_hyperframes_mapper_file(self):
        """outline_to_hyperframes.js must export outlineToScene and sceneToHyperFramesHtml."""
        mapper_path = os.path.join(ROOT_DIR, 'outline_to_hyperframes.js')
        self.assertTrue(os.path.exists(mapper_path), "outline_to_hyperframes.js does not exist")
        with open(mapper_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn('export function outlineToScene', content)
        self.assertIn('export function sceneToHyperFramesHtml', content)
        self.assertIn('window.__timelines', content)

    def test_studio_html_wysiwyg_editor(self):
        """index.html (primary frontend) must include live canvas, contentEditable, image modal, and autosave."""
        target_path = os.path.join(ROOT_DIR, 'index.html')
        if not os.path.exists(target_path):
            target_path = os.path.join(ROOT_DIR, 'studio.html')
        self.assertTrue(os.path.exists(target_path), "Neither index.html nor studio.html exists")
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn('id="live-canvas"', content)
        self.assertIn('class="slide-navigator"', content)
        self.assertIn('id="prop-template-select"', content)
        self.assertIn('id="prop-variant-select"', content)
        self.assertIn('id="image-modal"', content)
        self.assertIn('contenteditable', content)
        self.assertIn('undo', content)
        self.assertIn('redo', content)



if __name__ == '__main__':
    unittest.main()
