import os
import json
import pytest
from schemas.models import (
    DocumentContext,
    DocumentSection,
    ExtractedImage,
    TemplatePack,
    SlideSceneV2,
)
from scripts.pack_loader import load_pack
from scripts.slot_filler import SlotFillerEngine, check_slot_constraints
from scripts.llm_provider import FakeProvider


def make_sample_doc_with_images():
    return DocumentContext(
        title="Đại số Tuyến tính và Ma trận",
        sourceFileName="linear_algebra.pptx",
        fileType="pptx",
        sections=[
            DocumentSection(
                sectionId="sec-1",
                title="Giới thiệu ma trận",
                contentOrder=1,
                bullets=["Ma trận là bảng chữ nhật các số.", "Ứng dụng trong đồ họa máy tính và AI."],
                imageIds=["img_matrix_01"]
            ),
            DocumentSection(
                sectionId="sec-2",
                title="Các phép toán ma trận",
                contentOrder=2,
                bullets=["Phép cộng ma trận cùng kích thước.", "Phép nhân ma trận hàng với cột."],
                imageIds=[]
            )
        ],
        extractedImages=[
            ExtractedImage(
                id="img_matrix_01",
                filePath="storage/projects/sample-project/images/matrix_diagram.png",
                originalName="matrix_diagram.png",
                width=800,
                height=600,
                format="png"
            )
        ],
        tables=[]
    )


def test_slot_constraint_checker():
    pack = load_pack("basic")
    title_layout = next(l for l in pack.layouts if l.id == "title-slide")

    # 1. Valid slots
    valid_slots = {
        "title": "Tiêu đề ngắn gọn",
        "subtitle": "Phụ đề bài học",
        "badge": "CHƯƠNG 1"
    }
    overflows = check_slot_constraints(valid_slots, title_layout)
    assert len(overflows) == 0

    # 2. Exceeding maxChars
    invalid_slots = {
        "title": "A" * 150,  # exceeds maxChars
        "badge": "B" * 50
    }
    overflows = check_slot_constraints(invalid_slots, title_layout)
    assert len(overflows) > 0
    overflow_keys = [o["slotId"] for o in overflows]
    assert "title" in overflow_keys


def test_slot_filler_references_existing_images_only():
    pack = load_pack("basic")
    doc = make_sample_doc_with_images()

    # Fake LLM response attempting to reference both valid and fake image
    fake_plan = {
        "slides": [
            {
                "layoutId": "title-slide",
                "slotValues": {
                    "title": "Đại số Tuyến tính",
                    "subtitle": "Nhập môn ma trận và ứng dụng",
                    "badge": "TOÁN HỌC"
                },
                "narration": "Chào mừng các bạn đến với bài học."
            },
            {
                "layoutId": "image-explain",
                "slotValues": {
                    "title": "Minh họa ma trận",
                    "media": {
                        "type": "image",
                        "id": "img_matrix_01",  # valid id
                        "url": "storage/projects/sample-project/images/matrix_diagram.png"
                    },
                    "bullets": ["Cấu trúc hàng và cột", "Kích thước m nhân n"]
                },
                "narration": "Quan sát hình vẽ trên slide để thấy cấu trúc ma trận."
            },
            {
                "layoutId": "image-explain",
                "slotValues": {
                    "title": "Ảnh ảo",
                    "media": {
                        "type": "image",
                        "id": "ghost_image_999",  # INVENTED ID: MUST BE REJECTED OR STRIPPED
                        "url": "storage/projects/ghost/image.png"
                    },
                    "bullets": ["Nội dung"]
                },
                "narration": "Giải thích thêm."
            }
        ]
    }

    provider = FakeProvider(default_response=json.dumps(fake_plan))
    engine = SlotFillerEngine(llm_provider=provider)

    slides = engine.fill_deck(doc, pack, answers={"voiceId": "MyDuyen", "includeQuiz": False})
    assert len(slides) >= 2

    # Slide 2 should have valid image
    slide_2 = slides[1]
    assert "media" in slide_2.slotValues
    assert slide_2.slotValues["media"]["id"] == "img_matrix_01"

    # Slide 3: Invented image id must NOT survive validation
    slide_3 = slides[2]
    if "media" in slide_3.slotValues and slide_3.slotValues["media"]:
        assert slide_3.slotValues["media"]["id"] != "ghost_image_999"


def test_slot_filler_output_schema_and_nullable_voice():
    pack = load_pack("basic")
    doc = make_sample_doc_with_images()

    fake_plan = {
        "slides": [
            {
                "layoutId": "title-slide",
                "slotValues": {
                    "title": "Tiêu đề hợp lệ",
                    "subtitle": "Phụ đề hợp lệ",
                    "badge": "CHƯƠNG 1"
                },
                "narration": "Kịch bản thuyết minh slide 1."
            }
        ]
    }
    provider = FakeProvider(default_response=json.dumps(fake_plan))
    engine = SlotFillerEngine(llm_provider=provider)

    slides = engine.fill_deck(doc, pack, answers={"voiceId": "MyDuyen"})
    assert len(slides) >= 1
    first_slide = slides[0]

    # Validate SlideSceneV2 structure
    assert isinstance(first_slide, SlideSceneV2)
    assert first_slide.voice.audioUrl is None  # Must be null before synthesis
    assert first_slide.voice.durationSeconds is None  # Must be null before synthesis
    assert first_slide.voice.narration == "Kịch bản thuyết minh slide 1."
    assert first_slide.durationSeconds >= 3.0


def test_slot_filler_imageless_document():
    pack = load_pack("basic")
    doc_no_images = DocumentContext(
        title="Lý thuyết Số học",
        sourceFileName="math.docx",
        fileType="docx",
        sections=[
            DocumentSection(
                sectionId="sec-1",
                title="Số nguyên tố",
                contentOrder=1,
                bullets=["Số chỉ chia hết cho 1 và chính nó."]
            )
        ],
        extractedImages=[]
    )

    fake_plan = {
        "slides": [
            {
                "layoutId": "concept-explain",
                "slotValues": {
                    "title": "Định nghĩa Số nguyên tố",
                    "bullets": ["Tập hợp số nguyên lớn hơn 1"]
                },
                "narration": "Số nguyên tố là các số đặc biệt trong số học."
            }
        ]
    }
    provider = FakeProvider(default_response=json.dumps(fake_plan))
    engine = SlotFillerEngine(llm_provider=provider)

    slides = engine.fill_deck(doc_no_images, pack)
    assert len(slides) == 1
    assert "media" not in slides[0].slotValues
    assert slides[0].slotValues["title"] == "Định nghĩa Số nguyên tố"


def test_generate_scene_endpoint_v2():
    from fastapi.testclient import TestClient
    from server.api_service import app, STORAGE_DIR

    client = TestClient(app)
    project_id = "test-slot-e2e-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    # Setup document_context.json
    doc = make_sample_doc_with_images()
    with open(os.path.join(proj_dir, "document_context.json"), "w", encoding="utf-8") as f:
        f.write(doc.model_dump_json(indent=2))

    # Setup approved outline so gating passes
    outline_data = {
        "topic": "Đại số Tuyến tính",
        "targetAudience": "Sinh viên đại học",
        "estimatedDurationMinutes": 10.0,
        "learningObjectives": ["Hiểu ma trận"],
        "slides": [
            {
                "slideId": "s1",
                "title": "Nhập môn",
                "keyTakeaways": ["Ma trận"],
                "speakerNotesDraft": "Ghi chú",
                "suggestedLayoutId": "title-slide"
            }
        ],
        "summary": "Tóm tắt",
        "status": "approved"
    }
    with open(os.path.join(proj_dir, "lesson_outline.json"), "w", encoding="utf-8") as f:
        json.dump(outline_data, f, ensure_ascii=False)

    try:
        # Generate scene via API
        res = client.post(f"/projects/{project_id}/scene")
        assert res.status_code == 201
        scene_res = res.json()
        assert scene_res["projectId"] == project_id
        assert scene_res["schemaVersion"] == 2
        assert scene_res["packId"] == "basic"
        assert len(scene_res["slides"]) >= 1

        # Check that file on disk is valid v2
        scene_on_disk = os.path.join(proj_dir, "scene.json")
        assert os.path.exists(scene_on_disk)
        with open(scene_on_disk, "r", encoding="utf-8") as f:
            disk_data = json.load(f)
        assert disk_data["schemaVersion"] == 2
        assert "slotValues" in disk_data["slides"][0]

    finally:
        if os.path.exists(proj_dir):
            import shutil
            shutil.rmtree(proj_dir)


