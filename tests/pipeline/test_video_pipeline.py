import os
import shutil
import pytest
from fastapi.testclient import TestClient
from server.api_service import app, STORAGE_DIR
from scripts.video_pipeline import probe_video, extract_poster_frame
from scripts.tts_provider import sync_audio_first_timeline
from schemas.models import (
    LessonSceneJSON,
    SlideSceneV2,
    SlideVoiceConfig,
)

client = TestClient(app)
SAMPLE_VIDEO_PATH = "spikes/p6_1/sample_clip.mp4"


def test_probe_and_extract_poster():
    assert os.path.exists(SAMPLE_VIDEO_PATH), "Run spike first to generate sample_clip.mp4"

    # 1. Test probe
    info = probe_video(SAMPLE_VIDEO_PATH)
    assert info["durationSeconds"] >= 4.5
    assert info["hasAudio"] is True
    assert "h264" in info["codec"].lower()

    # 2. Test poster frame extraction
    out_poster = "spikes/p6_1/test_extracted_poster.png"
    if os.path.exists(out_poster):
        os.remove(out_poster)

    success = extract_poster_frame(SAMPLE_VIDEO_PATH, out_poster, timestamp_sec=1.0)
    assert success is True
    assert os.path.exists(out_poster)
    assert os.path.getsize(out_poster) > 1000


def test_video_upload_endpoint_and_range_request():
    project_id = "test-video-upload-proj"
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    try:
        # 1. Upload video
        with open(SAMPLE_VIDEO_PATH, "rb") as f:
            upload_res = client.post(
                f"/projects/{project_id}/media-upload",
                files={"file": ("lecture_clip.mp4", f.read(), "video/mp4")}
            )
        assert upload_res.status_code == 201
        data = upload_res.json()
        assert data["type"] == "video"
        assert data["url"] == f"/storage/projects/{project_id}/videos/lecture_clip.mp4"
        assert "posterUrl" in data
        assert data["durationSeconds"] >= 4.5
        assert data["hasAudio"] is True

        # Check physical files exist
        vid_disk = os.path.join(proj_dir, "videos", "lecture_clip.mp4")
        poster_disk = os.path.join(proj_dir, "images", "poster_lecture_clip.png")
        assert os.path.exists(vid_disk)
        assert os.path.exists(poster_disk)

        # 2. Test HTTP Range request on served video (206 Partial Content)
        range_res = client.get(
            f"/storage/projects/{project_id}/videos/lecture_clip.mp4",
            headers={"Range": "bytes=0-1024"}
        )
        assert range_res.status_code in [200, 206]
        if range_res.status_code == 206:
            assert "Content-Range" in range_res.headers

    finally:
        if os.path.exists(proj_dir):
            shutil.rmtree(proj_dir)


def test_timeline_sync_with_video_clip():
    # Slide with 3.0s narration but 7.0s video clip -> duration must be 7.0s
    slide_with_video = SlideSceneV2(
        slideId="slide-v",
        layoutId="concept-explain",
        slotValues={
            "title": "Slide có video",
            "media": {
                "type": "video",
                "durationSeconds": 7.0,
                "trimStart": 0.0,
                "trimEnd": None
            }
        },
        durationSeconds=5.0,
        voice=SlideVoiceConfig(
            narration="Thuyết minh ngắn.",
            durationSeconds=3.0
        )
    )

    # Slide without video: 4.0s narration -> duration is 4.0 + 0.8 = 4.8s
    slide_without_video = SlideSceneV2(
        slideId="slide-nov",
        layoutId="concept-explain",
        slotValues={"title": "Slide không video"},
        durationSeconds=5.0,
        voice=SlideVoiceConfig(
            narration="Thuyết minh bình thường.",
            durationSeconds=4.0
        )
    )

    scene = LessonSceneJSON(
        projectId="proj-sync-test",
        title="Test Sync",
        slides=[slide_with_video, slide_without_video]
    )

    synced_scene, meta = sync_audio_first_timeline(scene)

    # Slide with video: duration should be max(3.0 + 0.8, 7.0, 3.0) = 7.0s
    assert synced_scene.slides[0].durationSeconds == 7.0

    # Slide without video: duration should be 4.0 + 0.8 = 4.8s
    assert synced_scene.slides[1].durationSeconds == 4.8
