"""
tests/pipeline/test_static_assets.py
TDD tests for serving extracted images and uploaded videos safely without 404
Part of Ticket P1.1 (Person A)
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
def cleanup():
    yield
    if os.path.exists(STORAGE_DIR):
        for item in os.listdir(STORAGE_DIR):
            if item.startswith("proj-asset-test-"):
                p = os.path.join(STORAGE_DIR, item)
                if os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)


def test_extracted_images_served_with_200():
    # 1. Create project
    res_proj = client.post("/projects", json={"title": "Test Assets Serving"})
    assert res_proj.status_code == 201
    proj_id = res_proj.json()["projectId"]

    # 2. Upload PPTX that extracts images
    pptx_path = os.path.join(FIXTURES_DIR, "sample_with_image.pptx")
    with open(pptx_path, "rb") as f:
        res_upload = client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample_with_image.pptx", f, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
        )
    assert res_upload.status_code == 200
    doc_context = res_upload.json()

    extracted_images = doc_context.get("extractedImages", [])
    assert len(extracted_images) > 0, "sample.pptx should contain at least 1 extracted image"

    # 3. Request each image URL through the static endpoint
    for img in extracted_images:
        file_path = img["filePath"]  # e.g. "storage/projects/{id}/images/{filename}"
        url = f"/{file_path}"
        res_img = client.get(url)
        assert res_img.status_code == 200, f"Image {url} should return 200, got {res_img.status_code}"
        assert res_img.headers.get("content-type", "").startswith("image/")
        assert len(res_img.content) > 0


def test_path_traversal_prevention_on_images():
    res_proj = client.post("/projects", json={"title": "Test Traversal"})
    proj_id = res_proj.json()["projectId"]

    # Traversal attempts
    bad_urls = [
        f"/storage/projects/{proj_id}/images/..%2F..%2Flecture_studio.db",
        f"/storage/projects/{proj_id}/images/../../../etc/passwd",
        f"/storage/projects/{proj_id}/images/..\\..\\server.js",
    ]
    for url in bad_urls:
        res = client.get(url)
        assert res.status_code in [400, 404], f"Traversal attempt {url} should be rejected, got {res.status_code}"


def test_nonexistent_image_returns_404():
    res_proj = client.post("/projects", json={"title": "Test Nonexistent"})
    proj_id = res_proj.json()["projectId"]

    res = client.get(f"/storage/projects/{proj_id}/images/does_not_exist.png")
    assert res.status_code == 404
