"""
tests/test_contracts.py
Contract tests verifying synchronization between:
- JSON Schemas in schemas/*.json (v1 and v2)
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
    TemplatePack,
    TemplateId,
    AnimationPreset,
    SubjectTag,
    StyleTag,
    EffectTag,
    SlotRole,
    SlotAcceptsType,
    LayoutPurpose,
    MediaSourceType,
    MediaType,
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
    # Verify slides have template/layout references
    used_templates = {s.suggestedTemplateId for s in parsed.slides}
    assert len(used_templates) == 10


def test_lesson_scene_v1_contract():
    """Verify v1 scene fixture validates against lesson_scene_v1.json schema."""
    schema_v1 = load_json("schemas/lesson_scene_v1.json")
    sample_data = load_json("fixtures/scene.sample.json")

    jsonschema.validate(instance=sample_data, schema=schema_v1)


def test_lesson_scene_v2_contract():
    """Verify scene fixture parses with Pydantic v2 model and v2 JSON schema."""
    schema_v2 = load_json("schemas/lesson_scene.json")
    sample_data = load_json("fixtures/scene.sample.json")

    # JSON Schema v2 validation
    jsonschema.validate(instance=sample_data, schema=schema_v2)

    # Pydantic v2 model validation
    parsed = LessonSceneJSON.model_validate(sample_data)
    assert parsed.projectId == sample_data["projectId"]
    assert len(parsed.slides) == 10

    for slide in parsed.slides:
        assert slide.slideId.startswith("slide-")
        assert slide.durationSeconds >= 1.0
        assert slide.voice.narration
        assert slide.voice.provider in ["vieneu", "viettel", "fake"]


def test_template_pack_contract():
    """Verify template pack schema and model validation."""
    schema = load_json("schemas/template_pack.json")
    sample_pack = load_json("fixtures/basic_pack.sample.json")

    # 1. Validate against JSON schema
    jsonschema.validate(instance=sample_pack, schema=schema)

    # 2. Validate against Pydantic model
    pack = TemplatePack.model_validate(sample_pack)
    assert pack.id == "basic"
    assert len(pack.layouts) >= 2
    assert SubjectTag.TONG_HOP in pack.tags.subject
    assert StyleTag.HOC_THUAT_NGHIEM_TUC in pack.tags.style
    assert EffectTag.NANG_DONG_KINETIC in pack.tags.effect


def test_enum_no_drift():
    """Verify that JSON Schema enums and Python Pydantic enums stay identical."""
    v1_schema = load_json("schemas/lesson_scene_v1.json")
    pack_schema = load_json("schemas/template_pack.json")
    v2_scene_schema = load_json("schemas/lesson_scene.json")

    # 1. TemplateId enum match (v1 schema)
    json_templates = set(v1_schema["definitions"]["SlideScene"]["properties"]["templateId"]["enum"])
    pydantic_templates = {t.value for t in TemplateId}
    assert json_templates == pydantic_templates, f"TemplateId drifted! {json_templates ^ pydantic_templates}"

    # 2. AnimationPreset enum match
    json_presets = set(pack_schema["definitions"]["AnimationItem"]["properties"]["preset"]["enum"])
    pydantic_presets = {p.value for p in AnimationPreset}
    assert json_presets == pydantic_presets, f"AnimationPreset drifted! {json_presets ^ pydantic_presets}"

    # 3. Tags match
    json_subj = set(pack_schema["properties"]["tags"]["properties"]["subject"]["items"]["enum"])
    pydantic_subj = {s.value for s in SubjectTag}
    assert json_subj == pydantic_subj, f"SubjectTag drifted! {json_subj ^ pydantic_subj}"

    json_style = set(pack_schema["properties"]["tags"]["properties"]["style"]["items"]["enum"])
    pydantic_style = {s.value for s in StyleTag}
    assert json_style == pydantic_style, f"StyleTag drifted! {json_style ^ pydantic_style}"

    json_effect = set(pack_schema["properties"]["tags"]["properties"]["effect"]["items"]["enum"])
    pydantic_effect = {e.value for e in EffectTag}
    assert json_effect == pydantic_effect, f"EffectTag drifted! {json_effect ^ pydantic_effect}"

    # 4. Slot role & accepts match
    json_roles = set(pack_schema["definitions"]["Slot"]["properties"]["role"]["enum"])
    pydantic_roles = {r.value for r in SlotRole}
    assert json_roles == pydantic_roles, f"SlotRole drifted! {json_roles ^ pydantic_roles}"

    json_accepts = set(pack_schema["definitions"]["Slot"]["properties"]["accepts"]["items"]["enum"])
    pydantic_accepts = {a.value for a in SlotAcceptsType}
    assert json_accepts == pydantic_accepts, f"SlotAcceptsType drifted! {json_accepts ^ pydantic_accepts}"

    # 5. MediaCandidate enums match
    json_media_src = set(v2_scene_schema["definitions"]["MediaCandidate"]["properties"]["source"]["enum"])
    pydantic_media_src = {s.value for s in MediaSourceType}
    assert json_media_src == pydantic_media_src, f"MediaSourceType drifted! {json_media_src ^ pydantic_media_src}"

    json_media_type = set(v2_scene_schema["definitions"]["MediaCandidate"]["properties"]["type"]["enum"])
    pydantic_media_type = {t.value for t in MediaType}
    assert json_media_type == pydantic_media_type, f"MediaType drifted! {json_media_type ^ pydantic_media_type}"


def test_sample_pptx_fixture_valid():
    pptx_path = os.path.join(BASE_DIR, "fixtures", "sample.pptx")
    assert os.path.exists(pptx_path), "fixtures/sample.pptx is missing!"
    assert os.path.getsize(pptx_path) > 1000, "fixtures/sample.pptx is empty or corrupted!"

    with zipfile.ZipFile(pptx_path, "r") as z:
        names = z.namelist()
        assert "[Content_Types].xml" in names
        assert any(n.startswith("ppt/slides/slide") for n in names)
