"""
tests/pipeline/test_api_scene.py
Tests saving and retrieving custom LessonSceneJSON payloads (such as user generated scenes) via FastAPI.
"""

import os
import shutil
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR, DB_PATH
import sqlite3

client = TestClient(app)

def test_save_user_lesson_scene_payload():
    proj_id = "proj-89948069"
    proj_dir = os.path.join(STORAGE_DIR, proj_id)
    os.makedirs(proj_dir, exist_ok=True)

    # Ensure project row exists in DB
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO projects (id, title, pack_id, current_step) VALUES (?, ?, ?, ?)",
            (proj_id, "Bài Giảng Mới", "basic", "scene"),
        )
        conn.commit()

    try:
        payload = {
            "schemaVersion": 2,
            "projectId": proj_id,
            "title": "Bài Giảng Mới",
            "packId": "basic",
            "slides": [
                {
                    "slideId": "slide-01",
                    "layoutId": "title-slide",
                    "templateId": "title-slide",
                    "variantId": "default",
                    "layoutVariant": "default",
                    "title": "Tiêu Đề Bài Giảng Mới",
                    "subtitle": "Phụ đề giới thiệu bài giảng",
                    "slotValues": {},
                    "media": [],
                    "elements": [
                        {
                            "id": "txt-author",
                            "type": "text",
                            "content": "Giảng viên"
                        }
                    ],
                    "animations": [
                        {
                            "target": ".slide-title, .title-hero-heading",
                            "preset": "slide-in",
                            "delay": 0.2,
                            "duration": 0.8,
                            "easing": "power2.out"
                        }
                    ],
                    "voice": {
                        "narration": "Chào mừng các bạn đến với bài giảng hôm nay.",
                        "provider": "vieneu",
                        "voiceId": "BanMai",
                        "durationSeconds": 4
                    },
                    "durationSeconds": 5
                }
            ],
            "totalDurationSeconds": 5
        }

        # 1. PUT scene endpoint
        res = client.put(f"/projects/{proj_id}/scene", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["status"] == "saved"
        assert "savedAt" in data

        # 2. GET scene endpoint
        res_get = client.get(f"/projects/{proj_id}/scene")
        assert res_get.status_code == 200
        scene_json = res_get.json()
        assert scene_json["projectId"] == proj_id
        assert scene_json["title"] == "Bài Giảng Mới"
        assert len(scene_json["slides"]) == 1
        assert scene_json["slides"][0]["slideId"] == "slide-01"

    finally:
        if os.path.exists(proj_dir):
            shutil.rmtree(proj_dir, ignore_errors=True)
