"""
tests/pipeline/test_api_documents.py
Integration tests for POST /projects/{id}/documents API endpoint using FastAPI TestClient
"""

import os
import shutil
import pytest
from fastapi.testclient import TestClient

from server.api_service import app, DB_PATH, STORAGE_DIR

client = TestClient(app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures")


@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    yield
    # Cleanup test artifacts
    if os.path.exists(STORAGE_DIR):
        for item in os.listdir(STORAGE_DIR):
            if item.startswith("proj-test-"):
                p = os.path.join(STORAGE_DIR, item)
                if os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)


def test_create_project_and_upload_pptx():
    # 1. Create project
    res_proj = client.post("/projects", json={"title": "Test Bài Giảng PPTX"})
    assert res_proj.status_code == 201
    proj_id = res_proj.json()["projectId"]

    # 2. Upload PPTX
    pptx_path = os.path.join(FIXTURES_DIR, "sample.pptx")
    with open(pptx_path, "rb") as f:
        res_upload = client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample.pptx", f, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
        )

    assert res_upload.status_code == 200
    data = res_upload.json()
    assert data["fileType"] == "pptx"
    assert len(data["sections"]) > 0

    # 3. Verify GET
    res_get = client.get(f"/projects/{proj_id}/documents")
    assert res_get.status_code == 200
    assert res_get.json()["sourceFileName"] == "sample.pptx"


def test_upload_markdown():
    res_proj = client.post("/projects", json={"title": "Test MD"})
    proj_id = res_proj.json()["projectId"]

    md_path = os.path.join(FIXTURES_DIR, "sample.md")
    with open(md_path, "rb") as f:
        res_upload = client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample.md", f, "text/markdown")}
        )

    assert res_upload.status_code == 200
    data = res_upload.json()
    assert data["fileType"] == "md"
    assert "Triết học" in data["title"]
    assert len(data["sections"]) >= 2


def test_upload_docx():
    res_proj = client.post("/projects", json={"title": "Test DOCX"})
    proj_id = res_proj.json()["projectId"]

    docx_path = os.path.join(FIXTURES_DIR, "sample.docx")
    with open(docx_path, "rb") as f:
        res_upload = client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )

    assert res_upload.status_code == 200
    data = res_upload.json()
    assert data["fileType"] == "docx"
    assert len(data["sections"]) >= 1


def test_upload_pdf():
    res_proj = client.post("/projects", json={"title": "Test PDF"})
    proj_id = res_proj.json()["projectId"]

    pdf_path = os.path.join(FIXTURES_DIR, "sample.pdf")
    with open(pdf_path, "rb") as f:
        res_upload = client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample.pdf", f, "application/pdf")}
        )

    assert res_upload.status_code == 200
    data = res_upload.json()
    assert data["fileType"] == "pdf"
    assert len(data["sections"]) >= 2


def test_upload_unsupported_format():
    res_proj = client.post("/projects", json={"title": "Test Err"})
    proj_id = res_proj.json()["projectId"]

    res_upload = client.post(
        f"/projects/{proj_id}/documents",
        files={"file": ("test.unsupported", b"some binary data", "application/octet-stream")}
    )

    assert res_upload.status_code == 400
    detail = res_upload.json()["detail"]
    assert detail["error"]["code"] == "UNSUPPORTED_FORMAT"
