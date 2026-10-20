import os
import json
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR
from scripts.llm_provider import FakeProvider

client = TestClient(app)


def test_slide_chat_edit_endpoint():
    project_id = "test-chat-edit-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    original_scene = {
        "projectId": project_id,
        "schemaVersion": 2,
        "packId": "basic",
        "title": "Bài giảng Triết học",
        "slides": [
            {
                "slideId": "slide-01",
                "layoutId": "title-slide",
                "slotValues": {
                    "title": "Tiêu đề ban đầu rất dài và cần được rút gọn lại",
                    "subtitle": "Phụ đề học phần",
                    "badge": "CHƯƠNG 1"
                },
                "durationSeconds": 5.0,
                "voice": {"narration": "Chào mừng các bạn."}
            }
        ]
    }

    scene_path = os.path.join(proj_dir, "scene.json")
    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(original_scene, f, ensure_ascii=False)

    try:
        # Call slide chat endpoint
        instruction_payload = {
            "instruction": "Hãy rút gọn tiêu đề thành 'Triết học Mác - Lênin'"
        }
        res = client.post(f"/projects/{project_id}/slides/slide-01/chat", json=instruction_payload)
        assert res.status_code == 200
        data = res.json()

        assert data["slideId"] == "slide-01"
        assert "patch" in data
        assert "diff" in data
        assert "explanation" in data

        # Check diff structure
        assert "title" in data["diff"]
        assert data["diff"]["title"]["from"] == "Tiêu đề ban đầu rất dài và cần được rút gọn lại"

        # Crucial Rule: NO persistence until PUT /scene
        with open(scene_path, "r", encoding="utf-8") as f:
            disk_scene = json.load(f)
        assert disk_scene["slides"][0]["slotValues"]["title"] == "Tiêu đề ban đầu rất dài và cần được rút gọn lại"

    finally:
        if os.path.exists(proj_dir):
            import shutil
            shutil.rmtree(proj_dir)
