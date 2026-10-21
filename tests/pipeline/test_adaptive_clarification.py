import os
import json
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR
from scripts.adaptive_clarification import AdaptiveClarificationService
from scripts.llm_provider import FakeProvider
from schemas.models import DocumentContext, DocumentSection, ExtractedImage
from scripts.pack_loader import load_pack

client = TestClient(app)


def make_sample_doc_context(title="Triết học Mác - Lênin", text_hint="giáo trình sinh viên đại học"):
    return DocumentContext(
        title=title,
        sourceFileName="triet_hoc.pptx",
        fileType="pptx",
        sections=[
            DocumentSection(
                sectionId="sec-1",
                title="Khái niệm triết học",
                bullets=[f"Tài liệu {text_hint} môn học cơ bản.", "Nguồn gốc nhận thức và xã hội."],
                contentOrder=1
            ),
            DocumentSection(
                sectionId="sec-2",
                title="Vấn đề cơ bản của triết học",
                bullets=["Mối quan hệ giữa vật chất và ý thức.", "Khả năng nhận thức thế giới."],
                contentOrder=2
            )
        ],
        extractedImages=[],
        tables=[],
    )


def test_adaptive_clarification_high_confidence():
    service = AdaptiveClarificationService(llm_provider=FakeProvider())
    doc = make_sample_doc_context()
    pack = load_pack("basic")

    result = service.analyze(doc, pack)
    assert len(result.inferred) >= 4

    inferred_keys = [item.key for item in result.inferred]
    assert "style" in inferred_keys
    assert "language" in inferred_keys
    assert "targetAudience" in inferred_keys

    # For clear academic doc + basic pack, high confidence skips extra questions
    # Only 2 pedagogical choices remain: voiceId and includeQuiz (Gate G2b)
    assert len(result.questions) <= 2
    q_ids = [q.id for q in result.questions]
    assert "voiceId" in q_ids
    assert "includeQuiz" in q_ids


def test_adaptive_clarification_low_confidence_triggers_question():
    service = AdaptiveClarificationService(llm_provider=FakeProvider())
    # Ambiguous document without clear audience or hints
    ambiguous_doc = DocumentContext(
        title="Ghi chú nhanh",
        sourceFileName="notes.txt",
        fileType="md",
        sections=[
            DocumentSection(
                sectionId="sec-1",
                title="Mục 1",
                bullets=["Một vài ý ngắn."],
                contentOrder=1
            )
        ]
    )
    pack = load_pack("basic")

    result = service.analyze(ambiguous_doc, pack)
    q_ids = [q.id for q in result.questions]
    # Should ask for targetAudience when confidence < 0.8
    assert "targetAudience" in q_ids
    assert len(result.questions) > 2


def test_clarify_endpoints_e2e():
    project_id = "test-clarify-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    # 1. Setup project and document_context.json
    doc = make_sample_doc_context()
    with open(os.path.join(proj_dir, "document_context.json"), "w", encoding="utf-8") as f:
        f.write(doc.model_dump_json(indent=2))

    # Also register project in SQLite
    client.post("/projects", json={"title": "Triết học v2", "packId": "basic"})

    try:
        # 2. GET /projects/{id}/clarify
        res_get = client.get(f"/projects/{project_id}/clarify")
        assert res_get.status_code == 200
        data = res_get.json()
        assert "inferred" in data
        assert "questions" in data
        assert len(data["questions"]) <= 2

        # 3. POST /projects/{id}/clarify
        answers = {
            "voiceId": "MyDuyen",
            "includeQuiz": True,
            "targetAudience": "Sinh viên đại học"
        }
        res_post = client.post(f"/projects/{project_id}/clarify", json=answers)
        assert res_post.status_code == 200
        saved_resp = res_post.json()
        assert saved_resp["status"] == "clarified"

        # Check file persisted on disk
        clarify_file = os.path.join(proj_dir, "clarification.json")
        assert os.path.exists(clarify_file)
        with open(clarify_file, "r", encoding="utf-8") as f:
            persisted = json.load(f)
        assert persisted["voiceId"] == "MyDuyen"

    finally:
        if os.path.exists(proj_dir):
            import shutil
            shutil.rmtree(proj_dir)
