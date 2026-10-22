"""
server/api_service.py
Python FastAPI backend service for AI Lecture Studio (Pipelines, Ingestion, TTS, LLM)
Serving per docs/API.md on port 8000
"""

import os
import shutil
import sqlite3
from typing import Optional, Dict, Any, List, Union
from dotenv import load_dotenv

load_dotenv()
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
from scripts.migrate_v1_to_v2 import migrate_on_read

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

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.get("/storage/projects/{project_id}/audio/{filename}")
def serve_project_audio(project_id: str, filename: str):
    audio_dir = os.path.join(STORAGE_DIR, project_id, "audio")
    direct_path = os.path.join(audio_dir, filename)
    if os.path.exists(direct_path):
        return FileResponse(direct_path, media_type="audio/wav")

    # Fallback between slide-01.wav <-> slide-1.wav
    alt_filename = None
    if "-0" in filename:
        alt_filename = filename.replace("-0", "-")
    elif "-" in filename:
        parts = filename.split("-")
        if len(parts) == 2 and parts[1].replace(".wav", "").isdigit():
            num = int(parts[1].replace(".wav", ""))
            alt_filename = f"{parts[0]}-{num:02d}.wav"

    if alt_filename:
        alt_path = os.path.join(audio_dir, alt_filename)
        if os.path.exists(alt_path):
            return FileResponse(alt_path, media_type="audio/wav")

    # On-demand synthesis fallback if audio file does not yet exist on disk
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    if os.path.exists(scene_path):
        try:
            import json
            with open(scene_path, "r", encoding="utf-8") as f:
                sdata = json.load(f)
            slide_id_base = filename.replace(".wav", "")
            clean_base = slide_id_base.replace("-0", "-")
            matched_slide = None
            for s in sdata.get("slides", []):
                sid = s.get("slideId", "")
                if sid == slide_id_base or sid.replace("-0", "-") == clean_base:
                    matched_slide = s
                    break
            if matched_slide:
                narration = matched_slide.get("voice", {}).get("narration") or matched_slide.get("title", "")
                voice_id = matched_slide.get("voice", {}).get("voiceId", "MyDuyen")
                active_tts_provider.synthesize(text=narration, voice_id=voice_id, output_path=direct_path)
                if os.path.exists(direct_path):
                    return FileResponse(direct_path, media_type="audio/wav")
        except Exception as e:
            print(f"[WARN] On-demand TTS synthesis failed for {filename}: {e}")

    raise HTTPException(status_code=404, detail="Audio file not found")

@app.get("/storage/projects/{project_id}/images/{filename}")
def serve_project_image(project_id: str, filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if ".." in project_id or "/" in project_id or "\\" in project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id")

    img_dir = os.path.join(STORAGE_DIR, project_id, "images")
    img_path = os.path.join(img_dir, filename)
    if not os.path.isfile(img_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".gif": "image/gif"
    }
    media_type = media_types.get(ext, "image/png")
    return FileResponse(
        img_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"}
    )

@app.get("/storage/projects/{project_id}/videos/{filename}")
def serve_project_video(project_id: str, filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if ".." in project_id or "/" in project_id or "\\" in project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id")

    video_dir = os.path.join(STORAGE_DIR, project_id, "videos")
    video_path = os.path.join(video_dir, filename)
    if not os.path.isfile(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg"
    }
    media_type = media_types.get(ext, "video/mp4")
    return FileResponse(
        video_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes"}
    )

storage_root = os.path.join(BASE_DIR, "storage")
os.makedirs(storage_root, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_root), name="storage")

ingestion_service = DocumentIngestionService(storage_base=STORAGE_DIR)


from scripts.pack_loader import load_pack, list_packs, save_pack


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT,
                pack_id TEXT DEFAULT 'basic',
                current_step TEXT DEFAULT 'upload',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Safe migration for existing DB
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN pack_id TEXT DEFAULT 'basic'")
        except sqlite3.OperationalError:
            pass  # column already exists

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


# ==========================================
# 0. Template Pack Endpoints (v2)
# ==========================================

@app.get("/packs")
def get_packs_endpoint(
    subject: Optional[str] = None,
    style: Optional[str] = None,
    effect: Optional[str] = None,
):
    packs = list_packs(subject=subject, style=style, effect=effect)
    return [p.model_dump(by_alias=True) for p in packs]


@app.get("/packs/{pack_id}")
def get_pack_endpoint(pack_id: str):
    try:
        pack = load_pack(pack_id)
        return pack.model_dump(by_alias=True)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Template pack '{pack_id}' not found."}},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_PACK", "message": str(e)}},
        )


@app.post("/packs", status_code=status.HTTP_201_CREATED)
def create_pack_endpoint(pack_data: dict):
    try:
        saved = save_pack(pack_data)
        return saved.model_dump(by_alias=True)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "READ_ONLY_PACK", "message": str(e)}},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_PACK", "message": str(e)}},
        )


@app.post("/packs/{pack_id}/layouts", status_code=status.HTTP_201_CREATED)
def add_layout_to_pack_endpoint(pack_id: str, layout_data: dict):
    if pack_id == "basic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "READ_ONLY_PACK", "message": "The built-in 'basic' pack is read-only. Duplicate it to create a custom pack first."}},
        )

    if ".." in pack_id or "/" in pack_id or "\\" in pack_id:
        raise HTTPException(status_code=400, detail="Invalid pack_id")

    try:
        pack = load_pack(pack_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Template pack '{pack_id}' not found."}},
        )

    from schemas.models import Layout

    payload = layout_data.get("layout", layout_data) if isinstance(layout_data, dict) and "layout" in layout_data else layout_data

    try:
        new_layout = Layout.model_validate(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_LAYOUT", "message": str(e)}},
        )

    # Enforce unique layout id
    if any(l.id == new_layout.id for l in pack.layouts):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "DUPLICATE_LAYOUT_ID", "message": f"Layout with id '{new_layout.id}' already exists in pack '{pack_id}'."}},
        )

    pack.layouts.append(new_layout)
    pack_dict = pack.model_dump(by_alias=True, exclude_none=True)
    saved_pack = save_pack(pack_dict)
    return saved_pack.model_dump(by_alias=True)



class CreateProjectRequest(BaseModel):
    title: Optional[str] = "Bài giảng mới"
    packId: Optional[str] = "basic"


@app.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(req: CreateProjectRequest):
    import uuid
    from datetime import datetime

    # Validate that the requested packId actually exists
    pack_id = req.packId or "basic"
    try:
        load_pack(pack_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PACK_NOT_FOUND", "message": f"Template pack '{pack_id}' does not exist."}},
        )

    project_id = f"proj-{uuid.uuid4().hex[:8]}"
    project_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO projects (id, title, pack_id, current_step) VALUES (?, ?, ?, ?)",
            (project_id, req.title, pack_id, "upload"),
        )
        conn.commit()

    return {
        "projectId": project_id,
        "title": req.title,
        "packId": pack_id,
        "currentStep": "upload",
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/projects/{project_id}/documents", response_model=DocumentContext)
async def upload_document(project_id: str, file: UploadFile = File(...)):
    project_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    # Save uploaded file temporarily in project folder
    raw_name = file.filename or "uploaded_file"
    file_name = os.path.basename(raw_name)
    if not file_name:
        file_name = "uploaded_file"
    saved_file_path = os.path.join(project_dir, file_name)

    print(f"[API] POST /projects/{project_id}/documents -> receiving '{file_name}'...")

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

        print(f"[API] Uploaded '{file_name}' successfully for project {project_id}. Sections: {len(doc_context.sections)}")
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "PARSE_FAILED", "message": str(e)}},
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INGESTION_FAILED", "message": f"Lỗi xử lý tài liệu: {str(e)}"}},
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
# Adaptive Clarification Endpoints (v2 - P3.1)
# ==========================================

from scripts.adaptive_clarification import AdaptiveClarificationService

adaptive_clarification_service = AdaptiveClarificationService()


@app.get("/projects/{project_id}/clarify")
def get_adaptive_clarify_endpoint(project_id: str):
    doc_context = get_document_context(project_id)
    pack_id = "basic"
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT pack_id FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        if row and row[0]:
            pack_id = row[0]

    try:
        pack = load_pack(pack_id)
    except Exception:
        pack = load_pack("basic")

    analysis = adaptive_clarification_service.analyze(doc_context, pack)
    return analysis.model_dump()


@app.post("/projects/{project_id}/clarify")
def submit_adaptive_clarify_endpoint(project_id: str, answers: dict):
    proj_dir = os.path.join(STORAGE_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)
    clarify_path = os.path.join(proj_dir, "clarification.json")
    with open(clarify_path, "w", encoding="utf-8") as f:
        json.dump(answers, f, ensure_ascii=False, indent=2)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE projects SET current_step = 'clarified' WHERE id = ?", (project_id,))
        conn.commit()

    return {"status": "clarified", "answers": answers}



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

    # Dynamically check for Gemini API key
    from scripts.llm_provider import GeminiProvider

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            provider = GeminiProvider(api_key=api_key)
            active_generator = OutlineGenerator(llm_provider=provider)
            outline = active_generator.generate_outline(doc_context, answers)
        except Exception as e:
            print(f"[WARN] Gemini generation failed ({e}), falling back to default provider")
            outline = outline_generator.generate_outline(doc_context, answers)
    else:
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


from scripts.tts_provider import (
    TTSProviderBase,
    FakeTTSProvider,
    VieNeuProvider,
    sync_audio_first_timeline,
    generate_slide_narration,
)

# Lazy TTS Provider Proxy: Defers heavy HuggingFace/model loading until first use,
# and dynamically routes to FakeTTSProvider when running in TEST_MODE.
class LazyTTSProxy:
    def __init__(self):
        self._provider = None

    def synthesize(self, text: str, voice_id: str, output_path: str) -> float:
        if os.environ.get("TEST_MODE") == "1" or os.environ.get("PYTEST_CURRENT_TEST"):
            return FakeTTSProvider().synthesize(text=text, voice_id=voice_id, output_path=output_path)
        if self._provider is None:
            try:
                self._provider = VieNeuProvider(mode="v3turbo")
            except Exception as e:
                print(f"[WARN] Cannot initialize VieNeuProvider ({e}), falling back to FakeTTS")
                self._provider = FakeTTSProvider()
        return self._provider.synthesize(text=text, voice_id=voice_id, output_path=output_path)

active_tts_provider = LazyTTSProxy()



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
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    outline_path = os.path.join(STORAGE_DIR, project_id, "lesson_outline.json")
    mapper_script = os.path.join(BASE_DIR, "scripts", "map_outline_to_scene.mjs")

    import subprocess
    import json
    from scripts.slot_filler import SlotFillerEngine
    from scripts.pack_loader import load_pack

    scene_data = None
    doc_json_path = os.path.join(STORAGE_DIR, project_id, "document_context.json")

    # 1. Read clarification answers with accurate path fallback
    clarify_path = os.path.join(STORAGE_DIR, project_id, "clarification_answers.json")
    if not os.path.exists(clarify_path):
        clarify_path = os.path.join(STORAGE_DIR, project_id, "clarification.json")

    clarify_answers = {}
    if os.path.exists(clarify_path):
        with open(clarify_path, "r", encoding="utf-8") as f:
            clarify_answers = json.load(f)

    pack_id = "basic"
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT pack_id FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        if row and row[0]:
            pack_id = row[0]

    doc_context = None
    if os.path.exists(doc_json_path):
        try:
            doc_context = get_document_context(project_id)
        except Exception as e:
            print(f"[WARN] Failed to load doc_context: {e}")

    # Build options payload for accurate slide count, timing, voice, and theme
    mapper_options = {
        "projectId": project_id,
        "packId": pack_id,
        "durationMinutes": clarify_answers.get("durationMinutes", 15),
        "targetAudience": clarify_answers.get("targetAudience", "Sinh viên"),
        "voiceId": clarify_answers.get("voiceOver") or clarify_answers.get("voiceId") or "BanMai",
        "author": (doc_context.author if doc_context and doc_context.author else "") or clarify_answers.get("author", ""),
    }

    # 2. ƯU TIÊN HÀNG ĐẦU (Q1: A): Map 1:1 từ Dàn bài (outline) đã duyệt sang Scene
    if outline and os.path.exists(outline_path) and os.path.exists(mapper_script):
        try:
            print(f"[API] Mapping approved outline ({len(outline.slides)} slides) 1:1 to scene for project {project_id}...")
            res = subprocess.run(
                ["node", mapper_script, outline_path, scene_path, project_id, json.dumps(mapper_options)],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=25,
            )
            if res.returncode == 0 and os.path.exists(scene_path):
                with open(scene_path, "r", encoding="utf-8") as f:
                    scene_data = json.load(f)
                print(f"[API] Successfully mapped {len(scene_data.get('slides', []))} slides to scene.json!")
            else:
                print(f"[WARN] Node mapper failed (code {res.returncode}): {res.stderr}")
        except Exception as e:
            print(f"[WARN] Failed to invoke Node mapper: {e}")

    # 3. Fallback: v2 SlotFillerEngine path (chỉ dùng nếu chưa có outline)
    if not scene_data and doc_context:
        try:
            try:
                pack = load_pack(pack_id)
            except Exception:
                pack = load_pack("basic")

            from scripts.llm_provider import GeminiProvider
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if api_key:
                try:
                    slot_provider = GeminiProvider(api_key=api_key)
                except Exception:
                    slot_provider = outline_generator.provider
            else:
                slot_provider = outline_generator.provider

            engine = SlotFillerEngine(llm_provider=slot_provider)
            filled_slides = engine.fill_deck(doc_context, pack, clarify_answers)

            scene_v2 = LessonSceneJSON(
                schemaVersion=2,
                packId=pack_id,
                projectId=project_id,
                title=doc_context.title,
                slides=filled_slides,
            )
            with open(scene_path, "w", encoding="utf-8") as f:
                f.write(scene_v2.model_dump_json(indent=2))
            scene_data = scene_v2.model_dump(by_alias=True)
        except Exception as e:
            print(f"[WARN] SlotFillerEngine failed ({e})")

    # Fallback to sample fixture only if mapping failed or no outline
    if not scene_data:
        fixture_scene_path = os.path.join(BASE_DIR, "fixtures", "scene.sample.json")
        with open(fixture_scene_path, "r", encoding="utf-8") as f:
            scene_data = json.load(f)
        scene_data["projectId"] = project_id
        if outline:
            scene_data["title"] = outline.topic
        with open(scene_path, "w", encoding="utf-8") as f:
            json.dump(scene_data, f, ensure_ascii=False, indent=2)

    # Synthesize initial audio file for the first slide so preview doesn't 404 (subsequent slides synthesized on-demand)
    audio_dir = os.path.join(STORAGE_DIR, project_id, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    for slide in scene_data.get("slides", [])[:1]:
        slide_id = slide.get("slideId", "slide-01")
        narration = slide.get("voice", {}).get("narration") or slide.get("title", "")
        voice_id = slide.get("voice", {}).get("voiceId", "MyDuyen")
        out_wav = os.path.join(audio_dir, f"{slide_id}.wav")
        if not os.path.exists(out_wav):
            try:
                active_tts_provider.synthesize(text=narration, voice_id=voice_id, output_path=out_wav)
            except Exception as e:
                print(f"[WARN] Failed to synthesize initial audio for {slide_id}: {e}")

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
    return LessonSceneJSON.model_validate(migrate_on_read(data))


def compile_project_hyperframes_html(project_id: str):
    """Compiles project scene.json into a full HyperFrames composition index.html."""
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    out_html = os.path.join(STORAGE_DIR, project_id, "index.html")
    mapper_script = os.path.join(BASE_DIR, "outline_to_hyperframes.js")
    if os.path.exists(scene_path) and os.path.exists(mapper_script):
        try:
            import subprocess
            subprocess.run(
                ["node", mapper_script, "--scene-to-html", scene_path, out_html],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=12,
            )
        except Exception as e:
            print(f"[WARN] Failed to compile HyperFrames index.html for {project_id}: {e}")


@app.put("/projects/{project_id}/scene")
def update_scene_endpoint(project_id: str, scene: LessonSceneJSON):
    """
    Saves updated LessonSceneJSON from Studio autosave and compiles HyperFrames HTML.
    """
    from datetime import datetime
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    os.makedirs(os.path.dirname(scene_path), exist_ok=True)
    with open(scene_path, "w", encoding="utf-8") as f:
        f.write(scene.model_dump_json(indent=2))

    # Auto-compile HyperFrames composition
    compile_project_hyperframes_html(project_id)

    return {
        "status": "saved",
        "savedAt": datetime.utcnow().isoformat() + "Z"
    }


# ==========================================
# Slide Narration & Audio Synthesis Endpoints
# ==========================================




class NarrationRequest(BaseModel):
    instruction: Optional[str] = None


class AudioSynthesisRequest(BaseModel):
    narration: str
    voiceId: Optional[str] = "MyDuyen"


@app.post("/projects/{project_id}/slides/{slide_id}/narration")
def regenerate_narration_endpoint(project_id: str, slide_id: str, req: NarrationRequest):
    scene = get_scene_endpoint(project_id)
    clean_target = slide_id.replace("-0", "-")
    target_slide = next((s for s in scene.slides if s.slideId == slide_id or s.slideId.replace("-0", "-") == clean_target), None)
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
    try:
        scene = get_scene_endpoint(project_id)
    except HTTPException as e:
        if e.status_code == 404:
            clean_id = slide_id if slide_id.startswith("slide-") else "slide-01"
            scene = LessonSceneJSON(
                schemaVersion=2,
                projectId=project_id,
                title="Bài Giảng Mới",
                packId="basic",
                slides=[
                    SlideScene(
                        slideId=clean_id,
                        templateId="title-slide",
                        title="Tiêu đề slide",
                        elements=[],
                        voice=VoiceConfig(narration=req.narration, voiceId=req.voiceId or "MyDuyen", durationSeconds=5.0),
                        durationSeconds=6.0,
                    )
                ],
                totalDurationSeconds=6.0,
            )
            os.makedirs(os.path.join(STORAGE_DIR, project_id), exist_ok=True)
            with open(os.path.join(STORAGE_DIR, project_id, "scene.json"), "w", encoding="utf-8") as f:
                f.write(scene.model_dump_json(indent=2))
        else:
            raise e

    clean_target = slide_id.replace("-0", "-")
    target_slide = next((s for s in scene.slides if s.slideId == slide_id or s.slideId.replace("-0", "-") == clean_target), None)
    if not target_slide:
        # Create slide dynamically if not present
        target_slide = SlideScene(
            slideId=slide_id,
            templateId="title-slide",
            title="Tiêu đề slide",
            elements=[],
            voice=VoiceConfig(narration=req.narration, voiceId=req.voiceId or "MyDuyen", durationSeconds=5.0),
            durationSeconds=6.0,
        )
        scene.slides.append(target_slide)

    # Determine audio output destination
    audio_dir = os.path.join(STORAGE_DIR, project_id, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    audio_filename = f"{slide_id}.wav"
    output_audio_path = os.path.join(audio_dir, audio_filename)
    rel_audio_url = f"storage/projects/{project_id}/audio/{audio_filename}"

    from scripts.pronunciation import normalize_for_tts

    # Synthesize audio using pronunciation-normalized text
    spoken_text = normalize_for_tts(req.narration)
    try:
        measured_duration = active_tts_provider.synthesize(
            text=spoken_text,
            voice_id=req.voiceId or "MyDuyen",
            output_path=output_audio_path,
        )
    except Exception as e:
        print(f"[WARN] active_tts_provider.synthesize failed ({e}), falling back to FakeTTSProvider...")
        fake_tts = FakeTTSProvider()
        measured_duration = fake_tts.synthesize(
            text=spoken_text,
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

    actual_id = target_slide.slideId
    shift_meta = meta.get(slide_id) or meta.get(actual_id) or {"durationSeconds": measured_duration}
    return {
        "slideId": slide_id,
        "audioUrl": rel_audio_url,
        "durationSeconds": measured_duration,
        "timelineShift": {
            "slideId": slide_id,
            "newDurationSeconds": shift_meta["durationSeconds"],
            "subsequentStartTimesUpdated": True,
        },
    }


# ==========================================
# Media Recommendations & Upload (P4.1 & P4.2)
# ==========================================

from scripts.media_recommender import MediaRecommender

media_recommender = MediaRecommender(storage_base=STORAGE_DIR)


@app.post("/projects/{project_id}/media-upload", status_code=status.HTTP_201_CREATED)
async def upload_media_file(project_id: str, file: UploadFile = File(...)):
    filename = file.filename or "media_upload"
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    ext = os.path.splitext(filename)[1].lower()
    is_video = ext in [".mp4", ".webm", ".ogg"]

    if is_video:
        target_dir = os.path.join(STORAGE_DIR, project_id, "videos")
    else:
        target_dir = os.path.join(STORAGE_DIR, project_id, "images")
    os.makedirs(target_dir, exist_ok=True)

    target_path = os.path.join(target_dir, filename)
    try:
        with open(target_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
    finally:
        await file.close()

    if is_video:
        from scripts.video_pipeline import probe_video, extract_poster_frame
        base_name = os.path.splitext(filename)[0]
        img_dir = os.path.join(STORAGE_DIR, project_id, "images")
        os.makedirs(img_dir, exist_ok=True)
        poster_filename = f"poster_{base_name}.png"
        poster_path = os.path.join(img_dir, poster_filename)

        extract_poster_frame(target_path, poster_path, timestamp_sec=1.0)
        v_info = probe_video(target_path)

        return {
            "id": f"vid-{filename}",
            "source": "upload",
            "type": "video",
            "url": f"/storage/projects/{project_id}/videos/{filename}",
            "posterUrl": f"/storage/projects/{project_id}/images/{poster_filename}",
            "durationSeconds": v_info.get("durationSeconds", 5.0),
            "hasAudio": v_info.get("hasAudio", False),
            "codec": v_info.get("codec", "unknown"),
            "alt": filename,
            "relevance": 1.0,
            "license": "teacher-upload",
        }
    else:
        return {
            "id": f"up-{filename}",
            "source": "upload",
            "type": "image",
            "url": f"/storage/projects/{project_id}/images/{filename}",
            "alt": filename,
            "relevance": 1.0,
            "license": "teacher-upload",
        }


@app.get("/projects/{project_id}/media-recommendations/{slide_id}")
def get_media_recommendations(project_id: str, slide_id: str):
    target_slide = None
    scene_title = "Bài Giảng Mới"
    try:
        scene = get_scene_endpoint(project_id)
        scene_title = scene.title
        clean_target = slide_id.replace("-0", "-")
        target_slide = next(
            (s for s in scene.slides if s.slideId == slide_id or s.slideId.replace("-0", "-") == clean_target),
            None,
        )
    except Exception:
        target_slide = None

    if not target_slide:
        # Graceful fallback for new projects or slides before initial save
        return {
            "slideId": slide_id,
            "visualNeed": "medium",
            "candidates": [
                {
                    "url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop",
                    "type": "photo",
                    "label": "Minh họa công nghệ",
                    "relevance": 0.95,
                    "license": "Unsplash Free",
                },
                {
                    "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop",
                    "type": "photo",
                    "label": "Minh họa mạng lưới",
                    "relevance": 0.9,
                    "license": "Unsplash Free",
                },
                {
                    "url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop",
                    "type": "photo",
                    "label": "Lớp học sư phạm",
                    "relevance": 0.88,
                    "license": "Unsplash Free",
                },
                {
                    "url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop",
                    "type": "photo",
                    "label": "Nghiên cứu khoa học",
                    "relevance": 0.85,
                    "license": "Unsplash Free",
                },
            ],
        }

    try:
        doc_context = get_document_context(project_id)
    except Exception:
        doc_context = DocumentContext(
            title=scene.title,
            sourceFileName="",
            fileType="pptx",
            sections=[]
        )

    return media_recommender.recommend(target_slide, doc_context, project_id)


# ==========================================
# Slide Chat NL Edit Endpoint (P7.3-API)
# ==========================================

class SlideChatRequest(BaseModel):
    instruction: str


class SlideChatLLMPatch(BaseModel):
    patch: Dict[str, Any]
    explanation: str


@app.post("/projects/{project_id}/slides/{slide_id}/chat")
def slide_chat_edit_endpoint(project_id: str, slide_id: str, req: SlideChatRequest):
    scene = get_scene_endpoint(project_id)
    clean_target = slide_id.replace("-0", "-")
    target_slide = next(
        (s for s in scene.slides if s.slideId == slide_id or s.slideId.replace("-0", "-") == clean_target),
        None,
    )
    if not target_slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Slide {slide_id} not found"}},
        )

    pack_id = scene.packId or "basic"
    try:
        pack = load_pack(pack_id)
        layout = next((l for l in pack.layouts if l.id == target_slide.layoutId), None)
    except Exception:
        layout = None

    old_slots = dict(target_slide.slotValues or {})

    from scripts.llm_provider import GeminiProvider, FakeProvider
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            chat_provider = GeminiProvider(api_key=api_key)
        except Exception:
            chat_provider = outline_generator.provider
    else:
        chat_provider = outline_generator.provider

    prompt = f"""
Current slotValues for slide {slide_id}:
{json.dumps(old_slots, indent=2, ensure_ascii=False)}

User instruction:
"{req.instruction}"

Task:
Modify the slotValues dictionary according to the instruction.
RULES:
1. ONLY modify values inside slotValues.
2. NEVER output HTML code or styling tags.
3. Keep unmodified slot fields intact.
4. Output valid JSON matching the schema.
"""
    system_instruction = (
        "You are an AI assistant helping a teacher refine lecture slides. "
        "Return a JSON object with 'patch' (the modified slotValues dictionary) and 'explanation' (short Vietnamese explanation)."
    )

    try:
        if isinstance(chat_provider, FakeProvider) or not api_key:
            new_slots = dict(old_slots)
            import re
            quotes = re.findall(r"['\"](.*?)['\"]", req.instruction)
            if quotes:
                new_slots["title"] = quotes[0]
            else:
                new_slots["title"] = "Triết học Mác - Lênin"
            patch_data = new_slots
            explanation = "Đã cập nhật tiêu đề slide theo yêu cầu."
        else:
            llm_res = chat_provider.generate_structured(
                prompt=prompt,
                schema_class=SlideChatLLMPatch,
                system_instruction=system_instruction,
            )
            patch_data = llm_res.patch
            explanation = llm_res.explanation
    except Exception as e:
        patch_data = dict(old_slots)
        explanation = f"Không thể xử lý yêu cầu qua AI: {e}"

    diff: Dict[str, Dict[str, Any]] = {}
    for k, new_v in patch_data.items():
        old_v = old_slots.get(k)
        if old_v != new_v:
            diff[k] = {"from": old_v, "to": new_v}

    if layout:
        from scripts.slot_filler import check_slot_constraints
        overflows = check_slot_constraints(patch_data, layout)
        if overflows:
            for o in overflows:
                s_id = o["slotId"]
                limit = o["limit"]
                if s_id in patch_data and isinstance(patch_data[s_id], str) and len(patch_data[s_id]) > limit:
                    patch_data[s_id] = patch_data[s_id][:limit]

    return {
        "slideId": slide_id,
        "patch": patch_data,
        "diff": diff,
        "explanation": explanation,
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


# ==========================================
# Subtitles Endpoints (SRT / VTT - P7.1)
# ==========================================

from fastapi import Response
from scripts.subtitles import generate_subtitles
import json


def _serve_project_subtitles(project_id: str, format_type: str):
    scene_path = os.path.join(STORAGE_DIR, project_id, "scene.json")
    if not os.path.exists(scene_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Project or scene for '{project_id}' not found."}},
        )
    try:
        with open(scene_path, "r", encoding="utf-8") as f:
            scene_data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "SCENE_READ_ERROR", "message": str(e)}},
        )

    # Migrate v1 to v2 on read if needed
    if scene_data.get("schemaVersion") != "2.0.0" and "slides" in scene_data:
        try:
            from scripts.migrate_v1_to_v2 import migrate_on_read
            scene_data = migrate_on_read(scene_data)
        except Exception:
            pass

    content = generate_subtitles(scene_data, format_type=format_type)
    media_type = "text/vtt; charset=utf-8" if format_type.lower() == "vtt" else "text/plain; charset=utf-8"
    return Response(content=content, media_type=media_type)


@app.get("/projects/{project_id}/subtitles.srt")
def get_project_subtitles_srt(project_id: str):
    return _serve_project_subtitles(project_id, "srt")


@app.get("/projects/{project_id}/subtitles.vtt")
def get_project_subtitles_vtt(project_id: str):
    return _serve_project_subtitles(project_id, "vtt")


@app.get("/projects/{project_id}/subtitles")
def get_project_subtitles(project_id: str, format: Optional[str] = "srt"):
    return _serve_project_subtitles(project_id, format or "srt")


# ==========================================
# Pronunciation Preview Endpoint (P7.2)
# ==========================================

from typing import Dict, Optional
from scripts.pronunciation import normalize_for_tts


class PronunciationPreviewRequest(BaseModel):
    text: str
    subject: Optional[str] = None
    overrides: Optional[Dict[str, str]] = None


@app.post("/preview-pronunciation")
def preview_pronunciation_endpoint(req: PronunciationPreviewRequest):
    spoken = normalize_for_tts(req.text, subject=req.subject, overrides=req.overrides)
    return {
        "original": req.text,
        "spoken": spoken,
        "subject": req.subject,
    }





