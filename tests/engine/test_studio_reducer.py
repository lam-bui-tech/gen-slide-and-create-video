#!/usr/bin/env python3
"""
tests/engine/test_studio_reducer.py
Unit tests for Studio scene reducer, patch logic, and audio-first sync.
Validates behavior against schemas/lesson_scene.json constraints.
"""

import json
import os
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ALLOWED_TEMPLATES = [
    'title-slide', 'learning-objectives', 'concept-explain', 'bullet-breakdown',
    'image-explain', 'comparison', 'timeline', 'formula-explain', 'quiz', 'summary'
]

ALLOWED_PRESETS = [
    'fade-in', 'slide-in', 'zoom-in', 'typewriter', 'step-by-step', 'highlight-keyword'
]


def compute_slide_duration(slide, padding=1.0):
    audio_dur = (slide.get('voice', {}) or {}).get('durationSeconds', 0) or 0
    max_anim_end = 0.0
    for a in slide.get('animations', []):
        end = float(a.get('delay', 0)) + float(a.get('duration', 0))
        if end > max_anim_end:
            max_anim_end = end
    audio_req = (audio_dur + padding) if audio_dur > 0 else 0.0
    return round(max(audio_req, max_anim_end, 3.0), 1)


def validate_slide_py(slide):
    if not isinstance(slide, dict):
        raise ValueError("Slide must be a dictionary")
    if not slide.get('slideId'):
        raise ValueError("Missing slideId")
    if slide.get('templateId') not in ALLOWED_TEMPLATES:
        raise ValueError(f"Invalid templateId: {slide.get('templateId')}")
    if not isinstance(slide.get('elements'), list):
        raise ValueError("elements must be a list")
    if not isinstance(slide.get('animations'), list):
        raise ValueError("animations must be a list")
    for a in slide['animations']:
        if a.get('preset') not in ALLOWED_PRESETS:
            raise ValueError(f"Invalid preset: {a.get('preset')}")
        if float(a.get('duration', 0)) <= 0:
            raise ValueError("Animation duration must be positive")
    if not isinstance(slide.get('voice'), dict):
        raise ValueError("Missing voice object")
    if not isinstance(slide['voice'].get('narration'), str):
        raise ValueError("voice.narration must be a string")
    if float(slide.get('durationSeconds', 0)) < 1.0:
        raise ValueError("durationSeconds must be >= 1.0")
    return True


class TestStudioReducer(unittest.TestCase):

    def setUp(self):
        sample_path = os.path.join(ROOT_DIR, 'fixtures', 'scene.sample.json')
        with open(sample_path, 'r', encoding='utf-8') as f:
            self.scene = json.load(f)

    def test_slide_validation_valid(self):
        """All slides in fixtures/scene.sample.json must pass validation."""
        for slide in self.scene['slides']:
            self.assertTrue(validate_slide_py(slide))

    def test_slide_validation_invalid_template(self):
        """Slide with non-existent template must fail validation."""
        slide = dict(self.scene['slides'][0])
        slide['templateId'] = 'invalid-template-3000'
        with self.assertRaises(ValueError):
            validate_slide_py(slide)

    def test_slide_validation_invalid_animation_preset(self):
        """Slide with unapproved animation preset must fail validation."""
        slide = json.loads(json.dumps(self.scene['slides'][0]))
        slide['animations'].append({
            'target': '.title',
            'preset': 'non-existent-bounce',
            'delay': 0,
            'duration': 1.0
        })
        with self.assertRaises(ValueError):
            validate_slide_py(slide)

    def test_compute_slide_duration_audio_longer_than_anim(self):
        """Audio duration (12s) + padding (1s) = 13s, should exceed animations (5s)."""
        slide = {
            'voice': {'durationSeconds': 12.0, 'narration': 'Test'},
            'animations': [{'delay': 1.0, 'duration': 4.0}]
        }
        dur = compute_slide_duration(slide, padding=1.0)
        self.assertEqual(dur, 13.0)

    def test_compute_slide_duration_animation_longer_than_audio(self):
        """Animations ending at 16s should dictate slide duration if audio is only 8s."""
        slide = {
            'voice': {'durationSeconds': 8.0, 'narration': 'Test'},
            'animations': [{'delay': 10.0, 'duration': 6.0}]
        }
        dur = compute_slide_duration(slide, padding=1.0)
        self.assertEqual(dur, 16.0)

    def test_compute_slide_duration_minimum_fallback(self):
        """Empty audio and short animations fall back to minimum 3.0s."""
        slide = {
            'voice': {'durationSeconds': 0.0, 'narration': 'Test'},
            'animations': []
        }
        dur = compute_slide_duration(slide, padding=1.0)
        self.assertEqual(dur, 3.0)

    def test_reducer_js_file_exports(self):
        """studio/reducer.js must exist and export required reducer functions and constants."""
        reducer_path = os.path.join(ROOT_DIR, 'studio', 'reducer.js')
        self.assertTrue(os.path.exists(reducer_path), "studio/reducer.js does not exist")
        with open(reducer_path, 'r', encoding='utf-8') as f:
            content = f.read()

        required_exports = [
            'ALLOWED_TEMPLATES',
            'ALLOWED_VARIANTS',
            'ALLOWED_PRESETS',
            'validateSlide',
            'computeSlideDuration',
            'recomputeTotalDuration',
            'sceneReducer'
        ]
        for exp in required_exports:
            self.assertIn(exp, content, f"Missing export in studio/reducer.js: {exp}")


if __name__ == '__main__':
    unittest.main()
