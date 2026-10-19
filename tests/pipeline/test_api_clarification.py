"""
tests/pipeline/test_api_clarification.py
Integration tests for clarification API endpoints
GET /projects/{id}/clarification
POST /projects/{id}/clarification
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
def setup_project_with_doc():
    # Create project and upload sample document
    res_proj = client.post("/projects", json={"title": "Test Clarification"})
    proj_id = res_proj.json()["projectId"]

    md_path = os.path.join(FIXTURES_DIR, "sample.md")
    with open(md_path, "rb") as f:
        client.post(
            f"/projects/{proj_id}/documents",
            files={"file": ("sample.md", f, "text/markdown")}
        )

    yield proj_id

    # Teardown
    proj_dir = os.path.join(STORAGE_DIR, proj_id)
    if os.path.exists(proj_dir):
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_get_clarification_questions(setup_project_with_doc):
    proj_id = setup_project_with_doc
    res = client.get(f"/projects/{proj_id}/clarification")
    assert res.status_code == 200

    data = res.json()
    assert "questions" in data
    assert len(data["questions"]) == 8

    # Verify questions structure
    for q in data["questions"]:
        assert "id" in q
        assert "question" in q
        assert "suggestedAnswer" in q


def test_submit_clarification_answers(setup_project_with_doc):
    proj_id = setup_project_with_doc
    answers_payload = {
        "answers": {
            "targetAudience": "Sinh viên năm 1",
            "subjectGoal": "Triết học Mác - Lênin",
            "durationMinutes": 20,
            "slideCount": 10,
            "language": "vi",
            "style": "academic-ocean",
            "includeQuiz": True,
            "voiceOver": "MyDuyen",
        }
    }

    res = client.post(f"/projects/{proj_id}/clarification", json=answers_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "ready_for_outline"

    # Verify answers file saved in project dir
    saved_answers_file = os.path.join(STORAGE_DIR, proj_id, "clarification_answers.json")
    assert os.path.exists(saved_answers_file)
