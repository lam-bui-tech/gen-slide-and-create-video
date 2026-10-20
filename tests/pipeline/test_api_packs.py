import os
import shutil
import pytest
from fastapi.testclient import TestClient
from server.api_service import app
from scripts.pack_loader import PACKS_DIR

client = TestClient(app)


def test_list_packs():
    response = client.get("/packs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that basic pack is in the list
    basic_pack = next((p for p in data if p["id"] == "basic"), None)
    assert basic_pack is not None
    assert "Academic Basic" in basic_pack["name"]
    assert "tong-hop" in basic_pack["tags"]["subject"]


def test_list_packs_filtering():
    # Filter by subject
    res_general = client.get("/packs?subject=tong-hop")
    assert res_general.status_code == 200
    assert any(p["id"] == "basic" for p in res_general.json())

    res_empty = client.get("/packs?subject=nonexistent_subject_12345")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0


def test_get_pack_basic():
    response = client.get("/packs/basic")
    assert response.status_code == 200
    pack = response.json()
    assert pack["id"] == "basic"
    assert pack["schemaVersion"] == "2.0.0"
    assert len(pack["layouts"]) == 10
    layout_ids = [l["id"] for l in pack["layouts"]]
    assert "title-slide" in layout_ids
    assert "concept-explain" in layout_ids
    assert "comparison" in layout_ids
    assert "summary" in layout_ids


def test_get_pack_not_found():
    response = client.get("/packs/nonexistent-pack-999")
    assert response.status_code == 404
    err = response.json()
    assert "detail" in err
    assert err["detail"]["error"]["code"] == "NOT_FOUND"


def test_create_project_with_valid_pack():
    res = client.post("/projects", json={"title": "Test Lecture", "packId": "basic"})
    assert res.status_code == 201
    data = res.json()
    assert data["packId"] == "basic"
    assert "projectId" in data


def test_create_project_with_invalid_pack():
    res = client.post("/projects", json={"title": "Invalid Lecture", "packId": "ghost-pack"})
    assert res.status_code == 404
    err = res.json()
    assert err["detail"]["error"]["code"] == "PACK_NOT_FOUND"


def test_create_and_protect_pack():
    test_pack_id = "test-custom-pack"
    test_pack_dir = os.path.join(PACKS_DIR, test_pack_id)
    if os.path.exists(test_pack_dir):
        shutil.rmtree(test_pack_dir)

    try:
        # 1. Attempt to overwrite basic pack -> must fail with 403
        bad_res = client.post(
            "/packs",
            json={
                "id": "basic",
                "schemaVersion": "2.0.0",
                "name": "Hacked Basic",
                "description": "test",
                "tags": {
                    "subject": ["toan-tin"],
                    "style": ["hoc-thuat-nghiem-tuc"],
                    "effect": ["nhe-nhang-fade"],
                },
                "tokens": {"colors": {"primary": "#000"}},
                "layouts": [],
            },
        )
        assert bad_res.status_code == 403
        assert bad_res.json()["detail"]["error"]["code"] == "READ_ONLY_PACK"

        # 2. Create valid custom pack -> 201
        new_pack_payload = {
            "id": test_pack_id,
            "schemaVersion": "2.0.0",
            "name": "Custom Test Pack",
            "description": "A pack created in unit test",
            "aspectRatio": "16:9",
            "tags": {
                "subject": ["toan-tin"],
                "style": ["hien-dai-toi-gian"],
                "effect": ["nang-dong-kinetic"],
            },
            "tokens": {
                "colors": {"primary": "#4F46E5", "bgCanvas": "#FFFFFF"},
                "fonts": {
                    "heading": "Be Vietnam Pro, sans-serif",
                    "body": "Be Vietnam Pro, sans-serif",
                    "code": "JetBrains Mono, monospace",
                },
                "spacing": {},
            },
            "layouts": [
                {
                    "id": "custom-layout-1",
                    "name": "Custom Layout 1",
                    "purpose": "title",
                    "slots": [
                        {
                            "id": "headline",
                            "role": "title",
                            "accepts": ["text"],
                            "constraints": {"maxChars": 60},
                            "optional": False,
                        }
                    ],
                    "decor": [],
                    "variants": [],
                }
            ],
        }
        create_res = client.post("/packs", json=new_pack_payload)
        assert create_res.status_code == 201
        created_data = create_res.json()
        assert created_data["id"] == test_pack_id
        assert created_data["schemaVersion"] == "2.0.0"

        # 3. Verify it is queryable
        fetch_res = client.get(f"/packs/{test_pack_id}")
        assert fetch_res.status_code == 200
        assert fetch_res.json()["name"] == "Custom Test Pack"

    finally:
        # Cleanup
        if os.path.exists(test_pack_dir):
            shutil.rmtree(test_pack_dir)
