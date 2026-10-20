"""
tests/pipeline/test_migration.py
Unit and Integration Tests for migrate_v1_to_v2.py
Verifies idempotency, zero data loss, unknown elements preservation, CLI, and backups.
Part of Ticket P1.3 (Person A)
"""

import os
import json
import shutil
import tempfile
import pytest

from scripts.migrate_v1_to_v2 import (
    migrate_scene_v1_to_v2,
    migrate_on_read,
    migrate_file,
)
from schemas.models import LessonSceneJSON

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures", "migration")


@pytest.fixture
def v1_scene_data():
    v1_path = os.path.join(FIXTURES_DIR, "v1_all_10_layouts.json")
    with open(v1_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def expected_v2_scene_data():
    v2_path = os.path.join(FIXTURES_DIR, "expected_v2_all_10_layouts.json")
    with open(v2_path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_migrate_all_10_layouts_matches_golden_fixture(v1_scene_data, expected_v2_scene_data):
    """Test that migrating v1 produces the expected v2 golden fixture."""
    result = migrate_scene_v1_to_v2(v1_scene_data)
    assert result == expected_v2_scene_data
    # Must also parse with LessonSceneJSON Pydantic model
    parsed = LessonSceneJSON.model_validate(result)
    assert parsed.schemaVersion == 2
    assert parsed.packId == "basic"
    assert len(parsed.slides) == 10


def test_migration_idempotency(expected_v2_scene_data):
    """Running migration on already-migrated v2 scene must produce exact same result."""
    once = migrate_scene_v1_to_v2(expected_v2_scene_data)
    twice = migrate_scene_v1_to_v2(once)
    assert once == twice
    assert once == expected_v2_scene_data


def test_no_data_loss(v1_scene_data):
    """Verify that every text, narration, image, and duration from v1 is retained in v2."""
    v2 = migrate_scene_v1_to_v2(v1_scene_data)

    assert v2["projectId"] == v1_scene_data["projectId"]
    assert v2["title"] == v1_scene_data["title"]
    assert len(v2["slides"]) == len(v1_scene_data["slides"])

    for s1, s2 in zip(v1_scene_data["slides"], v2["slides"]):
        assert s2["slideId"] == s1["slideId"]
        assert s2["title"] == s1["title"]
        assert s2["durationSeconds"] == s1["durationSeconds"]
        assert s2["voice"]["narration"] == s1["voice"]["narration"]
        assert s2["voice"]["provider"] == s1["voice"]["provider"]

        # Check that elements converted into slotValues
        for el in s1.get("elements", []):
            el_type = el.get("type")
            content = el.get("content")
            slots = s2["slotValues"]

            if el_type == "badge":
                assert slots.get("badge") == content
            elif el_type == "bullet-list":
                assert slots.get("bullets") == content
            elif el_type == "image":
                assert slots.get("media") == content
                assert any(m["url"] == content for m in s2.get("media", []))
            elif el_type == "formula":
                assert slots.get("formula") == content
            elif el_type == "quiz-block":
                assert slots.get("quiz") == content
            elif el_type == "timeline-step":
                assert slots.get("timeline") == content


def test_preserve_unknown_elements():
    """Unmapped/custom elements must not be discarded; they stay in elements[]."""
    custom_element = {"id": "custom-decor", "type": "svg-star", "content": "<svg></svg>"}
    v1_custom = {
        "projectId": "proj-custom",
        "title": "Custom Test",
        "slides": [
            {
                "slideId": "slide-01",
                "templateId": "concept-explain",
                "elements": [
                    {"id": "txt-def", "type": "text", "content": "Khái niệm"},
                    custom_element
                ],
                "voice": {"narration": "Lời giảng", "provider": "vieneu"},
                "durationSeconds": 10.0
            }
        ]
    }

    v2 = migrate_scene_v1_to_v2(v1_custom)
    slide0 = v2["slides"][0]
    assert slide0["slotValues"]["body"] == "Khái niệm"
    assert custom_element in slide0["elements"]


def test_migrate_on_read_helper(v1_scene_data):
    """migrate_on_read must upgrade v1 on the fly and leave non-scene dict untouched."""
    migrated = migrate_on_read(v1_scene_data)
    assert migrated["schemaVersion"] == 2
    assert migrated["packId"] == "basic"

    # Non-scene object
    non_scene = {"someKey": "someValue"}
    assert migrate_on_read(non_scene) == non_scene


def test_cli_migrate_file_with_backup():
    """Test file migration with automatic .v1.bak creation and dry-run mode."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_file = os.path.join(tmp_dir, "lecture.json")
        v1_sample = {
            "projectId": "proj-tmp",
            "title": "Test Temp",
            "slides": [
                {
                    "slideId": "slide-01",
                    "templateId": "title-slide",
                    "elements": [{"id": "badge-1", "type": "badge", "content": "Bắt đầu"}],
                    "voice": {"narration": "Xin chào", "provider": "fake"},
                    "durationSeconds": 5.0
                }
            ]
        }
        with open(test_file, "w", encoding="utf-8") as f:
            json.dump(v1_sample, f)

        # 1. Test dry-run
        res_dry = migrate_file(test_file, dry_run=True, create_backup=True)
        assert res_dry is True
        assert not os.path.exists(f"{test_file}.v1.bak")

        # 2. Test real migration
        res_real = migrate_file(test_file, dry_run=False, create_backup=True)
        assert res_real is True
        assert os.path.exists(f"{test_file}.v1.bak")

        # 3. Verify migrated content
        with open(test_file, "r", encoding="utf-8") as f:
            migrated_data = json.load(f)
        assert migrated_data["schemaVersion"] == 2
        assert migrated_data["packId"] == "basic"
        assert migrated_data["slides"][0]["slotValues"]["badge"] == "Bắt đầu"
