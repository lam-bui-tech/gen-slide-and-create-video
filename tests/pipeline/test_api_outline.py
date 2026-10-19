"""
tests/pipeline/test_api_outline.py
Integration tests for outline generation, edit, approve, and scene generation gating.
"""

import os
import json
import shutil
import pytest
from fastapi.testclient import TestClient

from server.api_service import app, STORAGE_DIR

client = TestClient(app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures")


@pytest.fixture(scope="module", autouse=True)
def setup_project():
    # Create project and upload sample document
    res_proj = client.post("/projects", json={"title": "Test Outline Gate"})
    proj_id = res_proj.json()["projectId"]

    md_path = os.path.join(FIXTURES_DIR, "sample.md")
    with open(md_path, "rb") as f:
        client.post(f"/projects/{proj_id}/documents", files={"file": ("sample.md", f, "text/markdown")})

    # Submit clarification
    client.post(
        f"/projects/{proj_id}/clarification",
        json={"answers": {"targetAudience": "Sinh viên năm 1", "slideCount": 10}}
    )

    yield proj_id

    # Cleanup
    pdir = os.path.join(STORAGE_DIR, proj_id)
    if os.path.exists(pdir):
        shutil.rmtree(pdir, ignore_errors=True)


def test_outline_flow_and_scene_gating(setup_project):
    proj_id = setup_project

    # 1. Generate outline (will use FakeProvider fallback in test mode)
    res_gen = client.post(f"/projects/{proj_id}/outline")
    assert res_gen.status_code == 200
    outline_data = res_gen.json()
    assert outline_data["status"] == "draft"
    assert len(outline_data["slides"]) > 0

    # 2. Attempt to generate scene before approval -> MUST FAIL with 422
    res_scene_fail = client.post(f"/projects/{proj_id}/scene")
    assert res_scene_fail.status_code == 422
    err_code = res_scene_fail.json()["detail"]["error"]["code"]
    assert err_code == "OUTLINE_NOT_APPROVED"

    # 3. Edit / Approve outline via PUT
    outline_data["status"] = "approved"
    outline_data["slides"][0]["title"] = "Tiêu đề đã được giảng viên phê duyệt"
    res_put = client.put(f"/projects/{proj_id}/outline", json=outline_data)
    assert res_put.status_code == 200
    assert res_put.json()["status"] == "approved"
    assert res_put.json()["slides"][0]["title"] == "Tiêu đề đã được giảng viên phê duyệt"

    # 4. Generate scene after approval -> UNBLOCKED
    res_scene_ok = client.post(f"/projects/{proj_id}/scene")
    assert res_scene_ok.status_code in [200, 201]
    scene_data = res_scene_ok.json()
    assert "slides" in scene_data

    # 5. Studio Autosave PUT /projects/{id}/scene
    scene_data["slides"][0]["title"] = "Tiêu đề đã sửa trực tiếp trên Studio Canvas"
    res_put_scene = client.put(f"/projects/{proj_id}/scene", json=scene_data)
    assert res_put_scene.status_code == 200
    assert res_put_scene.json()["status"] == "saved"
    assert "savedAt" in res_put_scene.json()

    # Verify GET reflects the saved changes
    res_get_scene = client.get(f"/projects/{proj_id}/scene")
    assert res_get_scene.status_code == 200
    assert res_get_scene.json()["slides"][0]["title"] == "Tiêu đề đã sửa trực tiếp trên Studio Canvas"

