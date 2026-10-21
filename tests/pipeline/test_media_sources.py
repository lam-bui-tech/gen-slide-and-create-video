import os
import json
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR
from scripts.media_recommender import (
    analyze_visual_need,
    VisualNeed,
    VisualNeedType,
    DocumentImageSource,
    DiagramSource,
    MediaRecommender,
)
from schemas.models import (
    DocumentContext,
    DocumentSection,
    ExtractedImage,
    SlideSceneV2,
    SlideVoiceConfig,
    DocumentTable,
)

client = TestClient(app)


def make_test_context():
    return DocumentContext(
        title="Toán Rời Rạc và Đồ Thị",
        sourceFileName="discrete_math.pptx",
        fileType="pptx",
        sections=[
            DocumentSection(
                sectionId="sec-1",
                title="Khái niệm Đồ thị có hướng",
                contentOrder=1,
                bullets=["Tập đỉnh V và tập cạnh E.", "Biểu diễn ma trận kề."],
                imageIds=["img_graph_01"],
                tables=[
                    DocumentTable(
                        headers=["Đỉnh", "Bậc vào", "Bậc ra"],
                        rows=[["A", "1", "2"], ["B", "2", "1"]]
                    )
                ]
            )
        ],
        extractedImages=[
            ExtractedImage(
                id="img_graph_01",
                filePath="storage/projects/sample-project/images/matrix_diagram.png",
                originalName="directed_graph.png"
            )
        ]
    )


def test_visual_need_analysis_rules():
    # 1. Slide with chart/table content
    chart_slide = SlideSceneV2(
        slideId="s-chart",
        layoutId="concept-explain",
        slotValues={"title": "Bảng thống kê số liệu điểm số", "bullets": ["Tỉ lệ 80% đạt giỏi, 20% khá"]},
        durationSeconds=5.0,
        voice=SlideVoiceConfig(narration="Thống kê kết quả.")
    )
    need_chart = analyze_visual_need(chart_slide)
    assert need_chart.type in [VisualNeedType.CHART, VisualNeedType.DIAGRAM]

    # 2. Slide with abstract title only -> none
    title_slide = SlideSceneV2(
        slideId="s-title",
        layoutId="title-slide",
        slotValues={"title": "Lời mở đầu khóa học", "subtitle": "Chào mừng các em sinh viên"},
        durationSeconds=5.0,
        voice=SlideVoiceConfig(narration="Lời mở đầu.")
    )
    need_title = analyze_visual_need(title_slide)
    assert need_title.type == VisualNeedType.NONE


def test_document_image_source_ranking():
    doc = make_test_context()
    source = DocumentImageSource()
    slide = SlideSceneV2(
        slideId="s-graph",
        layoutId="image-explain",
        slotValues={"title": "Minh họa đồ thị có hướng directed graph"},
        durationSeconds=5.0,
        voice=SlideVoiceConfig(narration="Quan sát đồ thị.")
    )
    need = VisualNeed(type=VisualNeedType.PHOTO, description="Minh họa đồ thị")
    candidates = source.get_candidates(slide, need, doc, project_id="sample-project")

    assert len(candidates) >= 1
    top = candidates[0]
    assert top.id == "img_graph_01"
    assert top.source.value == "document" or top.source == "document"
    assert top.relevance > 0.0


def test_diagram_source_generation():
    doc = make_test_context()
    source = DiagramSource(storage_base=STORAGE_DIR)
    slide = SlideSceneV2(
        slideId="s-diag",
        layoutId="concept-explain",
        slotValues={"title": "Quy trình xử lý dữ liệu", "bullets": ["Bước 1: Thu thập", "Bước 2: Phân loại"]},
        durationSeconds=5.0,
        voice=SlideVoiceConfig(narration="Quy trình gồm hai bước.")
    )
    need = VisualNeed(type=VisualNeedType.DIAGRAM, description="Sơ đồ quy trình")
    project_id = "test-diag-proj"
    candidates = source.get_candidates(slide, need, doc, project_id=project_id)

    assert len(candidates) >= 1
    diag = candidates[0]
    assert diag.type.value == "diagram" or diag.type == "diagram"
    assert diag.url.endswith(".svg")

    # Verify physical SVG file exists
    svg_rel = diag.url.lstrip("/")
    svg_abs = os.path.join(STORAGE_DIR, "..", svg_rel) if not svg_rel.startswith("storage") else os.path.join(os.path.dirname(STORAGE_DIR), svg_rel)
    assert os.path.exists(svg_abs) or os.path.exists(os.path.join(STORAGE_DIR, project_id, "images", f"diagram_{slide.slideId}.svg"))


def test_media_recommendation_and_upload_endpoint():
    project_id = "test-media-endpoints-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(os.path.join(proj_dir, "images"), exist_ok=True)

    # 1. Setup scene and doc
    doc = make_test_context()
    with open(os.path.join(proj_dir, "document_context.json"), "w", encoding="utf-8") as f:
        f.write(doc.model_dump_json(indent=2))

    scene_data = {
        "projectId": project_id,
        "title": "Toán Rời Rạc và Đồ Thị",
        "schemaVersion": 2,
        "packId": "basic",
        "slides": [
            {
                "slideId": "slide-01",
                "layoutId": "image-explain",
                "slotValues": {"title": "Minh họa đồ thị có hướng"},
                "durationSeconds": 5.0,
                "voice": {"narration": "Minh họa đồ thị."}
            }
        ]
    }
    with open(os.path.join(proj_dir, "scene.json"), "w", encoding="utf-8") as f:
        json.dump(scene_data, f, ensure_ascii=False)

    try:
        # 2. Test Media Upload endpoint
        test_file_content = b"<svg xmlns='http://www.w3.org/2000/svg'><circle r='10'/></svg>"
        upload_res = client.post(
            f"/projects/{project_id}/media-upload",
            files={"file": ("circle.svg", test_file_content, "image/svg+xml")}
        )
        assert upload_res.status_code == 201
        upload_data = upload_res.json()
        assert upload_data["source"] == "upload"
        assert upload_data["url"].endswith("circle.svg")

        # 3. Test Recommendations endpoint
        rec_res = client.get(f"/projects/{project_id}/media-recommendations/slide-01")
        assert rec_res.status_code == 200
        rec_data = rec_res.json()
        assert "visualNeed" in rec_data
        assert "candidates" in rec_data
        assert len(rec_data["candidates"]) >= 1

    finally:
        if os.path.exists(proj_dir):
            import shutil
            shutil.rmtree(proj_dir)
