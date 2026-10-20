import os
import json
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR
from scripts.subtitles import generate_subtitles, split_sentences_vietnamese

client = TestClient(app)


def test_split_sentences_vietnamese():
    text = "Chào mừng các bạn đến với môn Triết học Mác - Lênin. Hôm nay chúng ta sẽ học về thế giới quan khoa học! Hãy cùng chú ý lắng nghe nhé."
    cues = split_sentences_vietnamese(text, max_chars=45)
    assert len(cues) >= 3
    # Every chunk is non-empty
    for c in cues:
        assert len(c.strip()) > 0
        assert len(c) <= 60  # reasonable boundary


def test_generate_subtitles_srt_and_vtt():
    sample_scene = {
        "projectId": "proj-sub-test",
        "schemaVersion": "2.0.0",
        "packId": "basic",
        "slides": [
            {
                "id": "slide-1",
                "layoutId": "title-slide",
                "durationSeconds": 5.0,
                "voice": {
                    "narration": "Chào mừng quý vị sinh viên. Hôm nay chúng ta bắt đầu bài giảng.",
                    "audioUrl": "/storage/projects/proj-sub-test/audio/slide_001.mp3",
                    "durationSeconds": 4.5
                }
            },
            {
                "id": "slide-2",
                "layoutId": "concept-explain",
                "durationSeconds": 6.0,
                "voice": {
                    "narration": "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới.",
                    "audioUrl": "/storage/projects/proj-sub-test/audio/slide_002.mp3",
                    "durationSeconds": 5.5
                }
            }
        ]
    }

    # Test SRT format
    srt_output = generate_subtitles(sample_scene, format_type="srt")
    assert "1\n" in srt_output or "1\r\n" in srt_output
    assert "-->" in srt_output
    assert "," in srt_output  # SRT uses comma for milliseconds
    assert "Chào mừng quý vị sinh viên." in srt_output
    assert "Triết học là hệ thống tri thức" in srt_output

    # Test VTT format
    vtt_output = generate_subtitles(sample_scene, format_type="vtt")
    assert vtt_output.startswith("WEBVTT")
    assert "-->" in vtt_output
    assert "." in vtt_output  # VTT uses dot for milliseconds


def test_monotonic_and_no_overlap():
    sample_scene = {
        "projectId": "proj-mono",
        "slides": [
            {
                "id": "s1",
                "durationSeconds": 10.0,
                "voice": {
                    "narration": "Câu thứ nhất rất dài và chi tiết. Câu thứ hai tiếp nối câu thứ nhất. Và đây là kết luận của slide.",
                    "durationSeconds": 9.0
                }
            },
            {
                "id": "s2",
                "durationSeconds": 8.0,
                "voice": {
                    "narration": "Chuyển sang phần tiếp theo. Chúng ta cùng xem xét các luận điểm.",
                    "durationSeconds": 7.5
                }
            }
        ]
    }

    srt = generate_subtitles(sample_scene, format_type="srt")
    lines = srt.strip().split("\n")
    time_lines = [l.strip() for l in lines if "-->" in l]

    prev_end_sec = 0.0
    for tl in time_lines:
        parts = tl.split("-->")
        assert len(parts) == 2
        start_str, end_str = parts[0].strip(), parts[1].strip()

        # Parse 00:00:00,000 to seconds
        def to_sec(s):
            h, m, rest = s.split(":")
            sec, ms = rest.split(",")
            return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000.0

        start_sec = to_sec(start_str)
        end_sec = to_sec(end_str)

        # Monotonicity check
        assert start_sec < end_sec, f"Start {start_sec} not less than end {end_sec}"
        assert start_sec >= prev_end_sec - 0.001, f"Overlap detected: start {start_sec} < prev {prev_end_sec}"
        prev_end_sec = end_sec


def test_subtitles_endpoint(tmp_path):
    # Setup test project in storage
    project_id = "test-sub-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    scene_path = os.path.join(proj_dir, "scene.json")
    scene_data = {
        "projectId": project_id,
        "schemaVersion": "2.0.0",
        "packId": "basic",
        "slides": [
            {
                "id": "s1",
                "durationSeconds": 4.0,
                "voice": {
                    "narration": "Kiểm tra phát phụ đề tự động tiếng Việt.",
                    "durationSeconds": 3.5
                }
            }
        ]
    }
    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(scene_data, f, ensure_ascii=False)

    try:
        # Test .srt endpoint
        res_srt = client.get(f"/projects/{project_id}/subtitles.srt")
        assert res_srt.status_code == 200
        assert "-->" in res_srt.text
        assert "Kiểm tra phát phụ đề" in res_srt.text

        # Test .vtt endpoint
        res_vtt = client.get(f"/projects/{project_id}/subtitles.vtt")
        assert res_vtt.status_code == 200
        assert res_vtt.text.startswith("WEBVTT")

        # Test 404 for unknown project
        res_404 = client.get("/projects/nonexistent-proj-xyz/subtitles.srt")
        assert res_404.status_code == 404
    finally:
        if os.path.exists(proj_dir):
            import shutil
            shutil.rmtree(proj_dir)
