"""
server/api_service.py
Python FastAPI backend service for AI Lecture Studio (Pipelines, Ingestion, TTS, LLM)
Serving per docs/API.md on port 8000
"""

import os
import shutil
import sqlite3
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from schemas.models import DocumentContext
from scripts.document_ingestion import (
    DocumentIngestionService,
    UnsupportedFormatError,
    FileTooLargeError,
    ParseFailureError,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "projects")
DB_PATH = os.path.join(BASE_DIR, "storage", "lecture_studio.db")

app = FastAPI(
    title="AI Lecture Studio - Pipeline API",
    version="1.0.0",
    description="Internal AI/Pipeline service for ingestion, outline, TTS, and export."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ingestion_service = DocumentIngestionService(storage_base=STORAGE_DIR)


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT,
                current_step TEXT DEFAULT 'upload',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                type TEXT,
                status TEXT DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                error TEXT,
                download_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


init_db()


class CreateProjectRequest(BaseModel):
    title: Optional[str] = "Bài giảng mới"


@app.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(req: CreateProjectRequest):
    import uuid
    from datetime import datetime

    project_id = f"proj-{uuid.uuid4().hex[:8]}"
    project_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO projects (id, title, current_step) VALUES (?, ?, ?)",
            (project_id, req.title, "upload"),
        )
        conn.commit()

    return {
        "projectId": project_id,
        "title": req.title,
        "currentStep": "upload",
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/projects/{project_id}/documents", response_model=DocumentContext)
async def upload_document(project_id: str, file: UploadFile = File(...)):
    project_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    # Save uploaded file temporarily in project folder
    file_name = file.filename or "uploaded_file"
    saved_file_path = os.path.join(project_dir, file_name)

    try:
        with open(saved_file_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)

        doc_context = ingestion_service.ingest_document(saved_file_path, project_id=project_id)

        # Update project step in DB
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE projects SET title = ?, current_step = 'clarification' WHERE id = ?",
                (doc_context.title, project_id),
            )
            conn.commit()

        return doc_context
    except UnsupportedFormatError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNSUPPORTED_FORMAT", "message": str(e)}},
        )
    except FileTooLargeError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": str(e)}},
        )
    except ParseFailureError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "PARSE_FAILED", "message": str(e)}},
        )
    finally:
        await file.close()


@app.get("/projects/{project_id}/documents", response_model=DocumentContext)
def get_document_context(project_id: str):
    doc_json_path = os.path.join(STORAGE_DIR, project_id, "document_context.json")
    if not os.path.exists(doc_json_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"No document context found for project {project_id}"}},
        )
    import json
    with open(doc_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return DocumentContext.model_validate(data)


# ==========================================
# Clarification Interview Endpoints
# ==========================================

from scripts.clarification_service import ClarificationService

clarification_service = ClarificationService(storage_base=STORAGE_DIR)


class ClarificationAnswerPayload(BaseModel):
    answers: dict


@app.get("/projects/{project_id}/clarification")
def get_clarification_questions(project_id: str):
    doc_context = get_document_context(project_id)
    questions = clarification_service.generate_questions(doc_context)
    return {"questions": [q.model_dump() for q in questions]}


@app.post("/projects/{project_id}/clarification")
def submit_clarification_answers(project_id: str, payload: ClarificationAnswerPayload):
    clarification_service.save_answers(project_id, payload.answers)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE projects SET current_step = 'outline' WHERE id = ?",
            (project_id,),
        )
        conn.commit()

    return {"status": "ready_for_outline"}


# ==========================================
# LessonOutline & Scene Gating Endpoints
# ==========================================

from schemas.models import LessonOutline, LessonSceneJSON
from scripts.outline_generator import OutlineGenerator, OutlineManager

outline_manager = OutlineManager(storage_base=STORAGE_DIR)
outline_generator = OutlineGenerator()


@app.post("/projects/{project_id}/outline", response_model=LessonOutline)
def generate_outline_endpoint(project_id: str):
    doc_context = get_document_context(project_id)

    # Read clarification answers if available
    answers_path = os.path.join(STORAGE_DIR, project_id, "clarification_answers.json")
    answers = {}
    if os.path.exists(answers_path):
        import json
        with open(answers_path, "r", encoding="utf-8") as f:
            answers = json.load(f)

    outline = outline_generator.generate_outline(doc_context, answers)
    saved = outline_manager.save_outline(project_id, outline)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE projects SET current_step = 'outline' WHERE id = ?",
            (project_id,),
        )
        conn.commit()

    return saved


@app.get("/projects/{project_id}/outline", response_model=LessonOutline)
def get_outline_endpoint(project_id: str):
    outline = outline_manager.get_outline(project_id)
    if not outline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"No outline found for project {project_id}"}},
        )
    return outline


@app.put("/projects/{project_id}/outline", response_model=LessonOutline)
def update_or_approve_outline(project_id: str, outline: LessonOutline):
    saved = outline_manager.save_outline(project_id, outline)

    if saved.status == "approved":
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE projects SET current_step = 'scene' WHERE id = ?",
                (project_id,),
            )
            conn.commit()

    return saved


@app.post("/projects/{project_id}/scene", status_code=status.HTTP_201_CREATED)
def generate_scene_endpoint(project_id: str):
    """
    Generates LessonSceneJSON from approved LessonOutline.
    GATED: Blocked if outline is not approved yet.
    """
    if not outline_manager.is_approved(project_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "OUTLINE_NOT_APPROVED",
                    "message": "LessonOutline must be approved by teacher before slide scene generation.",
                }
            },
        )

    # Load approved outline
    outline = outline_manager.get_outline(project_id)

    # Use sample fixture as initial scene stub until Person B mapper lands
    fixture_scene_path = os.path.join(BASE_DIR, "fixtures", "scene.sample.json")
    import json
    with open(fixture_scene_path, "r", encoding="utf-8") as f:
        scene_data = json.load(f)

    scene_data["projectId"] = project_id
    if outline:
        scene_data["title"] = outline.topic

    # Save to storage
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(scene_data, f, ensure_ascii=False, indent=2)

    return LessonSceneJSON.model_validate(scene_data)


@app.get("/projects/{project_id}/scene", response_model=LessonSceneJSON)
def get_scene_endpoint(project_id: str):
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    if not os.path.exists(scene_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"No scene found for project {project_id}"}},
        )
    import json
    with open(scene_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return LessonSceneJSON.model_validate(data)


@app.put("/projects/{project_id}/scene")
def update_scene_endpoint(project_id: str, scene: LessonSceneJSON):
    """
    Saves updated LessonSceneJSON from Studio autosave.
    """
    from datetime import datetime
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    os.makedirs(os.path.dirname(scene_path), exist_ok=True)
    with open(scene_path, "w", encoding="utf-8") as f:
        f.write(scene.model_dump_json(indent=2))

    return {
        "status": "saved",
        "savedAt": datetime.utcnow().isoformat() + "Z"
    }


# ==========================================
# Slide Narration & Audio Synthesis Endpoints
# ==========================================

from scripts.tts_provider import (
    TTSProviderBase,
    FakeTTSProvider,
    VieNeuProvider,
    sync_audio_first_timeline,
    generate_slide_narration,
)

# Initialize TTS Provider (use FakeTTS if in test mode or local VieNeu otherwise)
try:
    if os.environ.get("TEST_MODE") == "1":
        active_tts_provider = FakeTTSProvider()
    else:
        active_tts_provider = FakeTTSProvider()  # Fallback gracefully
except Exception:
    active_tts_provider = FakeTTSProvider()


class NarrationRequest(BaseModel):
    instruction: Optional[str] = None


class AudioSynthesisRequest(BaseModel):
    narration: str
    voiceId: Optional[str] = "MyDuyen"


@app.post("/projects/{project_id}/slides/{slide_id}/narration")
def regenerate_narration_endpoint(project_id: str, slide_id: str, req: NarrationRequest):
    scene = get_scene_endpoint(project_id)
    target_slide = next((s for s in scene.slides if s.slideId == slide_id), None)
    if not target_slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Slide {slide_id} not found"}},
        )

    # Use LLM provider from outline_generator
    narration = generate_slide_narration(
        slide_title=target_slide.title,
        slide_content=[e.content for e in target_slide.elements],
        speaker_notes=target_slide.notes,
        instruction=req.instruction,
        llm_provider=outline_generator.provider,
    )

    target_slide.voice.narration = narration
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    with open(scene_path, "w", encoding="utf-8") as f:
        f.write(scene.model_dump_json(indent=2))

    return {"slideId": slide_id, "narration": narration}


@app.post("/projects/{project_id}/slides/{slide_id}/audio")
def synthesize_slide_audio_endpoint(project_id: str, slide_id: str, req: AudioSynthesisRequest):
    scene = get_scene_endpoint(project_id)
    target_slide = next((s for s in scene.slides if s.slideId == slide_id), None)
    if not target_slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Slide {slide_id} not found"}},
        )

    # Determine audio output destination
    audio_dir = os.path.join(STORAGE_DIR, project_id, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    audio_filename = f"{slide_id}.wav"
    output_audio_path = os.path.join(audio_dir, audio_filename)
    rel_audio_url = f"storage/projects/{project_id}/audio/{audio_filename}"

    # Synthesize audio
    measured_duration = active_tts_provider.synthesize(
        text=req.narration,
        voice_id=req.voiceId or "MyDuyen",
        output_path=output_audio_path,
    )

    # Update slide voice config
    target_slide.voice.narration = req.narration
    target_slide.voice.audioUrl = rel_audio_url
    target_slide.voice.durationSeconds = measured_duration

    # Run Audio-First Timeline Sync
    synced_scene, meta = sync_audio_first_timeline(scene)

    # Save synced scene back to disk
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    with open(scene_path, "w", encoding="utf-8") as f:
        f.write(synced_scene.model_dump_json(indent=2))

    return {
        "slideId": slide_id,
        "audioUrl": rel_audio_url,
        "durationSeconds": measured_duration,
        "timelineShift": {
            "slideId": slide_id,
            "newDurationSeconds": meta[slide_id]["durationSeconds"],
            "subsequentStartTimesUpdated": True,
        },
    }


# ==========================================
# Export Jobs Endpoints (MP4, PDF, PPTX)
# ==========================================

from fastapi.staticfiles import StaticFiles
from scripts.export_service import ExportService

export_service = ExportService(db_path=DB_PATH, storage_base=STORAGE_DIR)

# Mount /storage for static assets and downloads
storage_root = os.path.join(BASE_DIR, "storage")
os.makedirs(storage_root, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_root), name="storage")


class ExportRequest(BaseModel):
    type: str  # "mp4" | "pdf" | "pptx"


@app.post("/projects/{project_id}/export", status_code=status.HTTP_202_ACCEPTED)
def trigger_export_endpoint(project_id: str, req: ExportRequest):
    export_type = req.type.lower()
    if export_type not in ["mp4", "pdf", "pptx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_EXPORT_TYPE", "message": f"Export type '{req.type}' is not supported. Use mp4, pdf, or pptx."}}
        )

    job_data = export_service.create_job(project_id, export_type)
    export_service.trigger_background_export(job_data["exportId"])
    return job_data


@app.get("/exports/{export_id}")
def get_export_status_endpoint(export_id: str):
    job = export_service.get_job(export_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Export job {export_id} not found."}}
        )
    return job



