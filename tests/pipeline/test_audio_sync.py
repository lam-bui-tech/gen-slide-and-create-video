"""
tests/pipeline/test_audio_sync.py
Unit tests for Audio-First Sync pure function and TTSProvider adapters.
Covering:
- audio shorter than animations
- audio equal to animations
- audio longer than animations
- missing audio
- 1-slide deck
- cumulative timeline calculation
"""

import os
import shutil
import pytest

from schemas.models import (
    LessonSceneJSON,
    SlideScene,
    SlideElement,
    AnimationItem,
    VoiceConfig,
    TemplateId,
    AnimationPreset,
    TTSProvider,
)
from scripts.tts_provider import (
    TTSProviderBase,
    FakeTTSProvider,
    VieNeuProvider,
    measure_audio_duration,
    sync_audio_first_timeline,
    generate_slide_narration,
)
from scripts.llm_provider import FakeProvider

TEST_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "scratch_audio")


@pytest.fixture(autouse=True)
def clean_audio():
    os.makedirs(TEST_AUDIO_DIR, exist_ok=True)
    yield
    shutil.rmtree(TEST_AUDIO_DIR, ignore_errors=True)


def make_test_slide(slide_id: str, anim_delay: float, anim_dur: float, audio_dur: float = None):
    anims = [
        AnimationItem(
            target=".title",
            preset=AnimationPreset.FADE_IN,
            delay=anim_delay,
            duration=anim_dur,
        )
    ]
    voice = VoiceConfig(
        narration="Lời giảng thuyết minh test",
        provider=TTSProvider.FAKE,
        voiceId="MyDuyen",
        durationSeconds=audio_dur,
    )
    return SlideScene(
        slideId=slide_id,
        templateId=TemplateId.CONCEPT_EXPLAIN,
        layoutVariant="default",
        title=f"Title {slide_id}",
        elements=[SlideElement(id="el-1", type="text", content="Test")],
        animations=anims,
        voice=voice,
        durationSeconds=5.0,  # initial dummy duration
    )


def test_sync_audio_longer_than_animations():
    # Audio 10.0s + 0.8 padding = 10.8s > last anim end (2.0 + 3.0 = 5.0s)
    slide = make_test_slide("slide-01", anim_delay=2.0, anim_dur=3.0, audio_dur=10.0)
    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[slide])

    synced, meta = sync_audio_first_timeline(scene, padding=0.8)

    assert synced.slides[0].durationSeconds == 10.8
    assert meta["slide-01"]["startTime"] == 0.0
    assert meta["slide-01"]["durationSeconds"] == 10.8


def test_sync_audio_shorter_than_animations():
    # Audio 2.0s + 0.8 padding = 2.8s < last anim end (3.0 + 5.0 = 8.0s)
    slide = make_test_slide("slide-01", anim_delay=3.0, anim_dur=5.0, audio_dur=2.0)
    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[slide])

    synced, meta = sync_audio_first_timeline(scene, padding=0.8)

    assert synced.slides[0].durationSeconds == 8.0
    assert meta["slide-01"]["durationSeconds"] == 8.0


def test_sync_audio_equal_to_animations():
    # Audio 5.0s + 1.0 padding = 6.0s == last anim end (2.0 + 4.0 = 6.0s)
    slide = make_test_slide("slide-01", anim_delay=2.0, anim_dur=4.0, audio_dur=5.0)
    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[slide])

    synced, meta = sync_audio_first_timeline(scene, padding=1.0)

    assert synced.slides[0].durationSeconds == 6.0


def test_sync_missing_audio():
    # Audio duration is None
    slide = make_test_slide("slide-01", anim_delay=1.0, anim_dur=2.0, audio_dur=None)
    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[slide])

    synced, meta = sync_audio_first_timeline(scene, padding=0.8)

    # Max of last anim (3.0s) and fallback minimum (3.0s) -> 3.0s
    assert synced.slides[0].durationSeconds >= 3.0


def test_sync_single_slide_deck():
    slide = make_test_slide("slide-01", anim_delay=0.5, anim_dur=1.5, audio_dur=6.2)
    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[slide])

    synced, meta = sync_audio_first_timeline(scene, padding=0.8)

    assert len(synced.slides) == 1
    assert synced.slides[0].durationSeconds == 7.0
    assert synced.totalDurationSeconds == 7.0
    assert meta["slide-01"]["startTime"] == 0.0


def test_sync_cumulative_start_times_multiple_slides():
    s1 = make_test_slide("slide-01", anim_delay=0.0, anim_dur=2.0, audio_dur=4.2)  # dur = 5.0
    s2 = make_test_slide("slide-02", anim_delay=0.0, anim_dur=2.0, audio_dur=9.2)  # dur = 10.0
    s3 = make_test_slide("slide-03", anim_delay=0.0, anim_dur=2.0, audio_dur=2.2)  # dur = 3.0

    scene = LessonSceneJSON(projectId="p1", title="Test", slides=[s1, s2, s3])
    synced, meta = sync_audio_first_timeline(scene, padding=0.8)

    assert synced.slides[0].durationSeconds == 5.0
    assert synced.slides[1].durationSeconds == 10.0
    assert synced.slides[2].durationSeconds == 3.0

    assert meta["slide-01"]["startTime"] == 0.0
    assert meta["slide-02"]["startTime"] == 5.0
    assert meta["slide-03"]["startTime"] == 15.0
    assert synced.totalDurationSeconds == 18.0


def test_fake_tts_provider_synthesizes_valid_audio():
    provider = FakeTTSProvider(words_per_second=2.5)
    wav_path = os.path.join(TEST_AUDIO_DIR, "test_output.wav")
    text = "Triết học là hạt nhân lý luận của thế giới quan"  # 10 words -> 4.0s

    duration = provider.synthesize(text=text, voice_id="MyDuyen", output_path=wav_path)

    assert os.path.exists(wav_path)
    assert duration > 0.0
    measured = measure_audio_duration(wav_path)
    assert abs(measured - duration) < 0.1


def test_generate_slide_narration_with_llm():
    fake_llm = FakeProvider(default_response='{"narration": "Lời giảng thuyết minh mới do AI biên soạn."}')
    narration = generate_slide_narration(
        slide_title="Định nghĩa Triết học",
        slide_content="Hệ thống tri thức lý luận chung nhất về thế giới",
        speaker_notes="Nhấn mạnh tính khái quát",
        instruction="Làm cho dễ hiểu hơn",
        llm_provider=fake_llm,
    )
    assert narration == "Lời giảng thuyết minh mới do AI biên soạn."
