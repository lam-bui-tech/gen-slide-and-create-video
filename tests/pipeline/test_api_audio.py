"""
tests/pipeline/test_api_audio.py
Integration tests for slide narration and audio synthesis endpoints
POST /projects/{id}/slides/{sid}/narration
POST /projects/{id}/slides/{sid}/audio
"""

import os
import shutil
import pytest
from fastapi.testclient import TestClient

from server.api_service import app, STORAGE_DIR

client = TestClient(app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures")


@pytest.fixture(scope="module", autouse=True)
def setup_project_with_scene():
    res_proj = client.post("/projects", json={"title": "Test Audio Project"})
    proj_id = res_proj.json()["projectId"]

    # Ingest document
    md_path = os.path.join(FIXTURES_DIR, "sample.md")
    with open(md_path, "rb") as f:
        client.post(f"/projects/{proj_id}/documents", files={"file": ("sample.md", f, "text/markdown")})

    # Clarification
    client.post(f"/projects/{proj_id}/clarification", json={"answers": {"targetAudience": "Sinh viên"}})

    # Outline + Approve
    res_out = client.post(f"/projects/{proj_id}/outline")
    outline_data = res_out.json()
    outline_data["status"] = "approved"
    client.put(f"/projects/{proj_id}/outline", json=outline_data)

    # Generate scene
    client.post(f"/projects/{proj_id}/scene")

    yield proj_id

    # Teardown
    pdir = os.path.join(STORAGE_DIR, proj_id)
    if os.path.exists(pdir):
        shutil.rmtree(pdir, ignore_errors=True)


def test_regenerate_slide_narration_api(setup_project_with_scene):
    proj_id = setup_project_with_scene
    res = client.post(
        f"/projects/{proj_id}/slides/slide-01/narration",
        json={"instruction": "Chào mừng ngắn gọn 1 câu"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["slideId"] == "slide-01"
    assert "narration" in data
    assert len(data["narration"]) > 0


def test_synthesize_slide_audio_api(setup_project_with_scene):
    proj_id = setup_project_with_scene
    res = client.post(
        f"/projects/{proj_id}/slides/slide-01/audio",
        json={
            "narration": "Chào mừng các bạn đến với học phần Triết học Mác Lênin.",
            "voiceId": "MyDuyen"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["slideId"] == "slide-01"
    assert "audioUrl" in data
    assert data["durationSeconds"] > 0
    assert "timelineShift" in data
    assert data["timelineShift"]["newDurationSeconds"] > 0

    # Verify that the generated audio file actually exists on disk
    audio_full_path = os.path.join(BASE_DIR, data["audioUrl"])
    assert os.path.exists(audio_full_path)
