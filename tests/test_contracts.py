"""
tests/test_contracts.py
Contract tests verifying synchronization between:
- JSON Schemas in schemas/*.json
- Pydantic models in schemas/models.py
- Fixture samples in fixtures/*.sample.json
"""

import json
import os
import zipfile
import pytest
import jsonschema

from schemas.models import (
    DocumentContext,
    LessonOutline,
    LessonSceneJSON,
    TemplateId,
    AnimationPreset,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(relative_path: str):
    path = os.path.join(BASE_DIR, relative_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_document_context_contract():
    schema = load_json("schemas/document_context.json")
    sample_data = load_json("fixtures/document_context.sample.json")

    # 1. Validate against JSON Schema
    jsonschema.validate(instance=sample_data, schema=schema)

    # 2. Validate against Pydantic model
    parsed = DocumentContext.model_validate(sample_data)
    assert parsed.title == sample_data["title"]
    assert len(parsed.sections) == len(sample_data["sections"])
    assert len(parsed.extractedImages) == len(sample_data["extractedImages"])


def test_lesson_outline_contract():
    schema = load_json("schemas/lesson_outline.json")
    sample_data = load_json("fixtures/outline.sample.json")

    # 1. Validate against JSON Schema
    jsonschema.validate(instance=sample_data, schema=schema)

    # 2. Validate against Pydantic model
    parsed = LessonOutline.model_validate(sample_data)
    assert parsed.topic == sample_data["topic"]
    assert len(parsed.slides) == 10
    # Verify all 10 templates are represented
    used_templates = {s.suggestedTemplateId.value for s in parsed.slides}
    assert len(used_templates) == 10


def test_lesson_scene_contract():
    schema = load_json("schemas/lesson_scene.json")
    sample_data = load_json("fixtures/scene.sample.json")

    # 1. Validate against JSON Schema
    jsonschema.validate(instance=sample_data, schema=schema)

    # 2. Validate against Pydantic model
    parsed = LessonSceneJSON.model_validate(sample_data)
    assert parsed.projectId == sample_data["projectId"]
    assert len(parsed.slides) == 10

    # Verify per-slide invariants required by the spec
    for slide in parsed.slides:
        assert slide.slideId.startswith("slide-")
        assert slide.durationSeconds >= 1.0
        assert slide.voice.narration
        assert slide.voice.provider in ["vieneu", "viettel", "fake"]
        assert len(slide.animations) > 0
        for anim in slide.animations:
            assert anim.preset in AnimationPreset
            assert anim.delay >= 0.0
            assert anim.duration >= 0.1


def test_enum_no_drift():
    """Verify that JSON Schema enums and Python Pydantic enums stay identical."""
    scene_schema = load_json("schemas/lesson_scene.json")

    # 1. TemplateId enum match
    json_templates = set(scene_schema["definitions"]["SlideScene"]["properties"]["templateId"]["enum"])
    pydantic_templates = {t.value for t in TemplateId}
    assert json_templates == pydantic_templates, f"TemplateId drifted! {json_templates ^ pydantic_templates}"

    # 2. AnimationPreset enum match
    json_presets = set(scene_schema["definitions"]["AnimationItem"]["properties"]["preset"]["enum"])
    pydantic_presets = {p.value for p in AnimationPreset}
    assert json_presets == pydantic_presets, f"AnimationPreset drifted! {json_presets ^ pydantic_presets}"


def test_sample_pptx_fixture_valid():
    pptx_path = os.path.join(BASE_DIR, "fixtures", "sample.pptx")
    assert os.path.exists(pptx_path), "fixtures/sample.pptx is missing!"
    assert os.path.getsize(pptx_path) > 1000, "fixtures/sample.pptx is empty or corrupted!"

    with zipfile.ZipFile(pptx_path, "r") as z:
        names = z.namelist()
        assert "[Content_Types].xml" in names
        assert any(n.startswith("ppt/slides/slide") for n in names)
