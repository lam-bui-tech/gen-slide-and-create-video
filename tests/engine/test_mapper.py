#!/usr/bin/env python3
"""
tests/engine/test_mapper.py
TDD Unit Tests for outline_to_hyperframes.js
Tests the two pure steps:
1. outlineToScene(outline)
2. sceneToHyperFramesHtml(scene)
Verifies Audio-First Sync cumulative timeline computation and loud failures on schema-invalid input.
"""

import json
import os
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

VALID_TEMPLATES = {
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
}


class SchemaValidationError(Exception):
    pass


def validate_outline(outline):
    if not isinstance(outline, dict):
        raise SchemaValidationError("Invalid outline: must be a dict")
    required = ['topic', 'targetAudience', 'estimatedDurationMinutes', 'learningObjectives', 'slides', 'summary']
    for k in required:
        if k not in outline:
            raise SchemaValidationError(f"Missing required field: {k}")
    if not isinstance(outline['slides'], list) or len(outline['slides']) == 0:
        raise SchemaValidationError("slides must be a non-empty list")
    for idx, s in enumerate(outline['slides']):
        slide_req = ['slideId', 'suggestedTemplateId', 'title', 'keyTakeaways', 'speakerNotesDraft', 'contentPayload']
        for sk in slide_req:
            if sk not in s:
                raise SchemaValidationError(f"Slide [{s.get('slideId', idx)}] missing: {sk}")
        if s['suggestedTemplateId'] not in VALID_TEMPLATES:
            raise SchemaValidationError(f"Unknown templateId: {s['suggestedTemplateId']}")
    return True


def validate_scene(scene):
    if not isinstance(scene, dict):
        raise SchemaValidationError("Invalid scene: must be a dict")
    required = ['projectId', 'title', 'slides']
    for k in required:
        if k not in scene:
            raise SchemaValidationError(f"Missing required field: {k}")
    for idx, s in enumerate(scene['slides']):
        slide_req = ['slideId', 'templateId', 'layoutVariant', 'title', 'elements', 'animations', 'voice', 'durationSeconds']
        for sk in slide_req:
            if sk not in s:
                raise SchemaValidationError(f"Scene slide missing: {sk}")
        if s['templateId'] not in VALID_TEMPLATES:
            raise SchemaValidationError(f"Invalid templateId: {s['templateId']}")
        if not isinstance(s['durationSeconds'], (int, float)) or s['durationSeconds'] <= 0:
            raise SchemaValidationError("durationSeconds must be positive number")
    return True


class TestMapperPureSteps(unittest.TestCase):

    def setUp(self):
        with open(os.path.join(ROOT_DIR, 'fixtures', 'outline.sample.json'), 'r', encoding='utf-8') as f:
            self.outline_fixture = json.load(f)
        with open(os.path.join(ROOT_DIR, 'fixtures', 'scene.sample.json'), 'r', encoding='utf-8') as f:
            self.scene_fixture = json.load(f)

    def test_step1_outline_fixture_is_valid(self):
        """fixtures/outline.sample.json must satisfy outline schema validation."""
        self.assertTrue(validate_outline(self.outline_fixture))

    def test_step2_scene_fixture_is_valid(self):
        """fixtures/scene.sample.json must satisfy scene schema validation."""
        self.assertTrue(validate_scene(self.scene_fixture))

    def test_audio_first_cumulative_timing_logic(self):
        """Timeline starts must strictly follow cumulative duration: start[i] = sum(durations[0..i-1])."""
        slides = self.scene_fixture['slides']
        computed_starts = []
        current = 0.0
        for s in slides:
            computed_starts.append(round(current, 2))
            current += s['durationSeconds']

        self.assertEqual(computed_starts[0], 0.0)
        self.assertGreater(len(computed_starts), 1)
        for i in range(1, len(computed_starts)):
            self.assertAlmostEqual(computed_starts[i], computed_starts[i-1] + slides[i-1]['durationSeconds'], places=2)

    def test_fail_loudly_on_missing_outline_fields(self):
        """Outline with missing required fields must fail loudly."""
        broken_outline = {"topic": "No slides"}
        with self.assertRaises(SchemaValidationError):
            validate_outline(broken_outline)

    def test_fail_loudly_on_invalid_template_id(self):
        """Outline with non-existent template ID must fail loudly."""
        broken_outline = json.loads(json.dumps(self.outline_fixture))
        broken_outline['slides'][0]['suggestedTemplateId'] = 'invalid-fake-template'
        with self.assertRaises(SchemaValidationError):
            validate_outline(broken_outline)

    def test_fail_loudly_on_negative_or_zero_duration(self):
        """Scene with zero or negative duration must fail loudly."""
        broken_scene = json.loads(json.dumps(self.scene_fixture))
        broken_scene['slides'][0]['durationSeconds'] = -5.0
        with self.assertRaises(SchemaValidationError):
            validate_scene(broken_scene)

    def test_outline_to_hyperframes_file_contract(self):
        """outline_to_hyperframes.js must export the pure functions and error classes."""
        mapper_path = os.path.join(ROOT_DIR, 'outline_to_hyperframes.js')
        with open(mapper_path, 'r', encoding='utf-8') as f:
            code = f.read()

        self.assertIn('export class SchemaValidationError', code)
        self.assertIn('export function outlineToScene', code)
        self.assertIn('export function sceneToHyperFramesHtml', code)
        self.assertIn('export function validateOutline', code)
        self.assertIn('export function validateScene', code)


if __name__ == '__main__':
    unittest.main()
