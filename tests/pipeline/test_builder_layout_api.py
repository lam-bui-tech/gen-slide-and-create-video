import os
import shutil
import pytest
from fastapi.testclient import TestClient
from server.api_service import app
from scripts.pack_loader import PACKS_DIR

client = TestClient(app)


def test_add_layout_to_pack():
    custom_pack_id = "test-builder-pack"
    pack_dir = os.path.join(PACKS_DIR, custom_pack_id)
    if os.path.exists(pack_dir):
        shutil.rmtree(pack_dir)

    # 1. Create a custom pack first
    pack_payload = {
        "id": custom_pack_id,
        "schemaVersion": "2.0.0",
        "name": "Builder Test Pack",
        "description": "Pack for testing layout additions",
        "aspectRatio": "16:9",
        "tags": {
            "subject": ["toan-tin"],
            "style": ["hien-dai-toi-gian"],
            "effect": ["nang-dong-kinetic"]
        },
        "tokens": {
            "colors": {"primary": "#3B82F6", "bgCanvas": "#FFFFFF"},
            "fonts": {"heading": "Be Vietnam Pro", "body": "Be Vietnam Pro", "code": "monospace"},
            "spacing": {}
        },
        "layouts": [
            {
                "id": "existing-layout",
                "name": "Existing Layout",
                "purpose": "title",
                "slots": [
                    {"id": "title", "role": "title", "accepts": ["text"]}
                ],
                "decor": [],
                "variants": []
            }
        ]
    }
    create_pack_res = client.post("/packs", json=pack_payload)
    assert create_pack_res.status_code == 201

    try:
        # 2. Refuse modifying read-only basic pack
        new_layout = {
            "id": "new-math-layout",
            "name": "New Math Layout",
            "purpose": "formula-explain",
            "slots": [
                {"id": "formula", "role": "formula", "accepts": ["text", "formula"]}
            ],
            "decor": [],
            "variants": []
        }
        res_basic = client.post("/packs/basic/layouts", json=new_layout)
        assert res_basic.status_code == 403
        assert res_basic.json()["detail"]["error"]["code"] == "READ_ONLY_PACK"

        # 3. Reject duplicate layout id
        dup_layout = {
            "id": "existing-layout",  # Already in pack
            "name": "Duplicate Layout",
            "purpose": "concept-explain",
            "slots": [
                {"id": "title", "role": "title", "accepts": ["text"]}
            ],
            "decor": [],
            "variants": []
        }
        res_dup = client.post(f"/packs/{custom_pack_id}/layouts", json=dup_layout)
        assert res_dup.status_code in [409, 422]

        # 4. Successfully add new valid layout
        res_ok = client.post(f"/packs/{custom_pack_id}/layouts", json=new_layout)
        assert res_ok.status_code == 201
        updated_pack = res_ok.json()
        assert len(updated_pack["layouts"]) == 2
        layout_ids = [l["id"] for l in updated_pack["layouts"]]
        assert "new-math-layout" in layout_ids

        # 5. Verify it appears in GET /packs/{id}
        fetch_res = client.get(f"/packs/{custom_pack_id}")
        assert fetch_res.status_code == 200
        fetched_pack = fetch_res.json()
        assert any(l["id"] == "new-math-layout" for l in fetched_pack["layouts"])

    finally:
        if os.path.exists(pack_dir):
            shutil.rmtree(pack_dir)
