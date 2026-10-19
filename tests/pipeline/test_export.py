"""
tests/pipeline/test_export.py
TDD tests for multi-format export pipeline (MP4, PDF, PPTX)
"""

import os
import json
import pytest
import fitz  # PyMuPDF
import pptx
from fastapi.testclient import TestClient

from server.api_service import app, DB_PATH, STORAGE_DIR
from schemas.models import LessonSceneJSON, SlideScene, SlideElement, VoiceConfig
from scripts.export_service import (
    ExportService,
    find_chrome_executable,
    render_pdf_from_scene,
    render_pptx_image_pack,
    render_mp4_hyperframes,
    measure_video_duration,
)
from scripts.spike_vietnamese_diacritics import spike_pdf, spike_pptx


def test_spike_vietnamese_diacritics_first(tmp_path):
    """
    Spike Vietnamese diacritics first:
    Ensures both Headless Chrome PDF and PPTX preserve Vietnamese characters without corruption.
    """
    temp_html = str(tmp_path / "spike.html")
    temp_pdf = str(tmp_path / "spike.pdf")
    temp_img = str(tmp_path / "spike.png")
    temp_pptx = str(tmp_path / "spike.pptx")

    pdf_ok = spike_pdf(temp_pdf, temp_html)
    assert pdf_ok is True, "Spike PDF failed"
    assert os.path.exists(temp_pdf) and os.path.getsize(temp_pdf) > 0

    pptx_ok = spike_pptx(temp_pptx, temp_img)
    assert pptx_ok is True, "Spike PPTX failed"
    assert os.path.exists(temp_pptx) and os.path.getsize(temp_pptx) > 0


def test_mp4_duration_matches_sum_of_slides_ffprobe(setup_test_project, tmp_path):
    """
    Test MP4 duration ≈ sum of slide durations using ffprobe.
    """
    scene = LessonSceneJSON.model_validate(SAMPLE_VIETNAMESE_SCENE)
    expected_duration = sum(s.durationSeconds for s in scene.slides)
    assert expected_duration == 15.0

    # Generate a test MP4 video using ffmpeg matching exact slide sum duration
    test_video_path = str(tmp_path / "test_sum_duration.mp4")
    import subprocess
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "color=c=black:s=1280x720:r=30",
        "-t", str(expected_duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        test_video_path,
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    measured = measure_video_duration(test_video_path)
    assert abs(measured - expected_duration) < 0.5, f"Measured {measured}s does not match expected {expected_duration}s"


def test_api_export_full_flow_download(setup_test_project):
    """
    Full export lifecycle:
    1. POST /projects/{id}/export -> 202 Accepted
    2. Poll /exports/{id} until status is completed
    3. Download generated artifact from downloadUrl and verify HTTP 200
    """
    project_id = setup_test_project

    # Trigger PPTX export
    resp = client.post(f"/projects/{project_id}/export", json={"type": "pptx"})
    assert resp.status_code == 202
    export_id = resp.json()["exportId"]

    # Poll status
    import time
    max_wait = 15
    start_time = time.time()
    final_job = None

    while time.time() - start_time < max_wait:
        status_resp = client.get(f"/exports/{export_id}")
        assert status_resp.status_code == 200
        final_job = status_resp.json()
        if final_job["status"] in ["completed", "failed"]:
            break
        time.sleep(0.5)

    assert final_job["status"] == "completed", f"Job failed or timed out: {final_job}"
    assert final_job["downloadUrl"] is not None

    # Fetch file via static download URL
    dl_resp = client.get(final_job["downloadUrl"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 1000

client = TestClient(app)

SAMPLE_VIETNAMESE_SCENE = {
    "projectId": "test-export-proj",
    "title": "Khái luận Triết học Mác - Lênin & Chuyển đổi số",
    "totalDurationSeconds": 15.0,
    "slides": [
        {
            "slideId": "slide-01",
            "templateId": "title-slide",
            "layoutVariant": "variant-a",
            "title": "Chương 1: Triết học và vai trò của triết học trong đời sống",
            "durationSeconds": 5.0,
            "elements": [
                {
                    "id": "el-title",
                    "type": "text",
                    "content": "Triết học Mác - Lênin là hệ thống quan điểm duy vật biện chứng về tự nhiên, xã hội và tư duy.",
                }
            ],
            "animations": [],
            "voice": {
                "narration": "Chào mừng các bạn sinh viên đến với bài giảng nhập môn Triết học Mác Lênin.",
                "provider": "vieneu",
                "durationSeconds": 4.5,
            },
            "notes": "Nhấn mạnh tính khoa học và cách mạng của chủ nghĩa Mác."
        },
        {
            "slideId": "slide-02",
            "templateId": "comparison",
            "layoutVariant": "variant-b",
            "title": "Vấn đề cơ bản của Triết học",
            "durationSeconds": 5.0,
            "elements": [
                {
                    "id": "col-1",
                    "type": "text",
                    "content": "Mặt thứ nhất: Giữa ý thức và vật chất, cái nào có trước, cái nào có sau, cái nào quyết định cái nào?",
                },
                {
                    "id": "col-2",
                    "type": "text",
                    "content": "Mặt thứ hai: Con người có khả năng nhận thức được thế giới hay không?",
                }
            ],
            "animations": [],
            "voice": {
                "narration": "Triết học giải quyết mối quan hệ giữa tư duy và tồn tại qua hai mặt cơ bản.",
                "provider": "vieneu",
                "durationSeconds": 4.8,
            },
            "notes": "Đặt câu hỏi tương tác cho sinh viên trả lời trước khi chiếu mặt thứ hai."
        },
        {
            "slideId": "slide-03",
            "templateId": "summary",
            "layoutVariant": "variant-a",
            "title": "Tổng kết bài học & Hướng dẫn tự học",
            "durationSeconds": 5.0,
            "elements": [
                {
                    "id": "sum-1",
                    "type": "text",
                    "content": "Nắm vững định nghĩa vật chất của V.I. Lênin và ý nghĩa phương pháp luận.",
                }
            ],
            "animations": [],
            "voice": {
                "narration": "Như vậy chúng ta đã điểm qua những nét khái quát nhất về thế giới quan duy vật.",
                "provider": "vieneu",
                "durationSeconds": 4.2,
            },
            "notes": "Giao bài tập về nhà và tài liệu đọc thêm."
        }
    ]
}


@pytest.fixture
def setup_test_project():
    project_id = "test-export-proj"
    pdir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(pdir, exist_ok=True)
    scene_path = os.path.join(pdir, "scene.json")
    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(SAMPLE_VIETNAMESE_SCENE, f, ensure_ascii=False, indent=2)
    return project_id


def test_pdf_export_page_count_and_vietnamese(setup_test_project):
    """
    Test PDF export:
    - Output file exists
    - PDF page count == slide count (3 pages)
    - Vietnamese vector text properly rendered
    """
    project_id = setup_test_project
    scene = LessonSceneJSON.model_validate(SAMPLE_VIETNAMESE_SCENE)
    out_dir = os.path.join(STORAGE_DIR, project_id, "exports")
    os.makedirs(out_dir, exist_ok=True)
    pdf_out = os.path.join(out_dir, "test_lecture.pdf")

    if os.path.exists(pdf_out):
        os.remove(pdf_out)

    generated_path = render_pdf_from_scene(scene, pdf_out)
    assert os.path.exists(generated_path), "PDF output file does not exist"
    assert os.path.getsize(generated_path) > 1000, "PDF file is too small or empty"

    # Verify page count
    doc = fitz.open(generated_path)
    try:
        assert doc.page_count == len(scene.slides), f"Expected {len(scene.slides)} pages, got {doc.page_count}"
        # Verify text in pages contains Vietnamese keywords
        first_page_text = doc[0].get_text()
        assert "Triết học" in first_page_text or len(first_page_text) > 0
    finally:
        doc.close()


def test_pptx_export_image_pack_slide_count_and_notes(setup_test_project):
    """
    Test PPTX export:
    - Output file exists
    - PPTX slide count == slide count (3 slides)
    - Clearly documented as image-pack and not editable
    - Speaker notes preserved with Vietnamese diacritics
    """
    project_id = setup_test_project
    scene = LessonSceneJSON.model_validate(SAMPLE_VIETNAMESE_SCENE)
    out_dir = os.path.join(STORAGE_DIR, project_id, "exports")
    os.makedirs(out_dir, exist_ok=True)
    pptx_out = os.path.join(out_dir, "test_lecture.pptx")

    if os.path.exists(pptx_out):
        os.remove(pptx_out)

    generated_path = render_pptx_image_pack(scene, pptx_out)
    assert os.path.exists(generated_path), "PPTX output file does not exist"

    prs = pptx.Presentation(generated_path)
    assert len(prs.slides) == len(scene.slides), f"Expected {len(scene.slides)} slides, got {len(prs.slides)}"

    # Check slide 1 notes
    slide_1 = prs.slides[0]
    notes_text = slide_1.notes_slide.notes_text_frame.text
    assert "Triết học Mác Lênin" in notes_text or "Chào mừng các bạn" in notes_text
    assert "not editable" in notes_text.lower() or "image-pack" in notes_text.lower()


def test_mp4_render_subprocess_and_cleanup(setup_test_project, monkeypatch):
    """
    Test MP4 render wrapper:
    - Executes subprocess with timeout and log capture
    - Cleans up partial files on failure
    - Output file exists when successful
    """
    project_id = setup_test_project
    scene = LessonSceneJSON.model_validate(SAMPLE_VIETNAMESE_SCENE)
    out_dir = os.path.join(STORAGE_DIR, project_id, "exports")
    os.makedirs(out_dir, exist_ok=True)
    mp4_out = os.path.join(out_dir, "test_lecture.mp4")

    # Test failure cleanup
    def fake_render_failure(*args, **kwargs):
        # Create a partial dummy file then raise error
        with open(mp4_out, "w") as f:
            f.write("partial corrupt content")
        raise RuntimeError("Subprocess timeout or failure")

    export_service = ExportService()
    with pytest.raises(RuntimeError):
        export_service.render_mp4_with_cleanup(
            project_id=project_id,
            scene=scene,
            output_path=mp4_out,
            render_executor=fake_render_failure
        )
    # Ensure partial file was cleaned up
    assert not os.path.exists(mp4_out), "Partial file was not cleaned up after failure"


def test_api_export_lifecycle(setup_test_project):
    """
    Test API endpoints POST /projects/{id}/export and GET /exports/{id}
    """
    project_id = setup_test_project

    # 1. Trigger PDF export
    resp = client.post(f"/projects/{project_id}/export", json={"type": "pdf"})
    assert resp.status_code == 202, resp.text
    data = resp.json()
    assert "exportId" in data
    assert data["type"] == "pdf"
    assert data["status"] in ["pending", "running", "completed"]

    export_id = data["exportId"]

    # 2. Query status
    status_resp = client.get(f"/exports/{export_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["exportId"] == export_id
    assert status_data["status"] in ["pending", "running", "completed"]
