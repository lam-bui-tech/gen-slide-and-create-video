"""
tests/pipeline/test_outline_generator.py
Unit tests for pedagogical outline generator and approval management.
Following TDD and deep module codebase design.
"""

import os
import json
import pytest
import jsonschema

from schemas.models import DocumentContext, LessonOutline, TemplateId
from scripts.llm_provider import FakeProvider
from scripts.outline_generator import OutlineGenerator, OutlineManager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures")
TEST_STORAGE = os.path.join(BASE_DIR, "storage", "test_outline_projects")


@pytest.fixture(scope="module")
def outline_schema():
    with open(os.path.join(BASE_DIR, "schemas", "lesson_outline.json"), "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def sample_doc_context():
    with open(os.path.join(FIXTURES_DIR, "document_context.sample.json"), "r", encoding="utf-8") as f:
        return DocumentContext.model_validate(json.load(f))


@pytest.fixture
def sample_outline_json():
    with open(os.path.join(FIXTURES_DIR, "outline.sample.json"), "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(autouse=True)
def clean_storage():
    os.makedirs(TEST_STORAGE, exist_ok=True)
    yield
    import shutil
    shutil.rmtree(TEST_STORAGE, ignore_errors=True)


def test_generate_outline_with_fake_provider(sample_doc_context, sample_outline_json, outline_schema):
    fake_llm = FakeProvider(default_response=json.dumps(sample_outline_json))
    generator = OutlineGenerator(llm_provider=fake_llm)

    answers = {
        "targetAudience": "Sinh viên năm 1",
        "subjectGoal": "Triết học Mác - Lênin",
        "durationMinutes": 15,
        "slideCount": 10,
        "language": "vi",
        "style": "academic-ocean",
        "includeQuiz": True,
        "voiceOver": "MyDuyen",
    }

    outline = generator.generate_outline(sample_doc_context, answers)

    assert isinstance(outline, LessonOutline)
    assert outline.topic == sample_outline_json["topic"]
    assert len(outline.slides) == 10
    assert outline.status == "draft"

    # Verify template assignments
    valid_templates = {t.value for t in TemplateId}
    for slide in outline.slides:
        assert slide.suggestedTemplateId in valid_templates
        assert slide.speakerNotesDraft != ""
        assert len(slide.keyTakeaways) > 0

    # Validate against JSON schema
    jsonschema.validate(instance=outline.model_dump(), schema=outline_schema)


def test_outline_manager_save_get_approve(sample_outline_json):
    manager = OutlineManager(storage_base=TEST_STORAGE)
    proj_id = "proj-test-outline-mgr"
    outline = LessonOutline.model_validate(sample_outline_json)
    outline.status = "draft"

    # Save
    saved = manager.save_outline(proj_id, outline)
    assert saved.status == "draft"

    # Get
    retrieved = manager.get_outline(proj_id)
    assert retrieved is not None
    assert retrieved.topic == outline.topic
    assert retrieved.status == "draft"
    assert manager.is_approved(proj_id) is False

    # Approve
    approved = manager.approve_outline(proj_id)
    assert approved.status == "approved"
    assert manager.is_approved(proj_id) is True
