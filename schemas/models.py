"""
Pydantic Models matching schemas/ JSON Schema contracts
- DocumentContext
- LessonOutline
- LessonSceneJSON
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Common Enums
# ==========================================

class TemplateId(str, Enum):
    TITLE_SLIDE = "title-slide"
    LEARNING_OBJECTIVES = "learning-objectives"
    CONCEPT_EXPLAIN = "concept-explain"
    BULLET_BREAKDOWN = "bullet-breakdown"
    IMAGE_EXPLAIN = "image-explain"
    COMPARISON = "comparison"
    TIMELINE = "timeline"
    FORMULA_EXPLAIN = "formula-explain"
    QUIZ = "quiz"
    SUMMARY = "summary"


class AnimationPreset(str, Enum):
    FADE_IN = "fade-in"
    SLIDE_IN = "slide-in"
    ZOOM_IN = "zoom-in"
    TYPEWRITER = "typewriter"
    STEP_BY_STEP = "step-by-step"
    HIGHLIGHT_KEYWORD = "highlight-keyword"


class TTSProvider(str, Enum):
    VIENEU = "vieneu"
    VIETTEL = "viettel"
    FAKE = "fake"


class FileType(str, Enum):
    PPTX = "pptx"
    PDF = "pdf"
    DOCX = "docx"
    MD = "md"


# ==========================================
# 1. DocumentContext Models
# ==========================================

class ExtractedImage(BaseModel):
    id: str
    filePath: str
    originalName: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None


class DocumentTable(BaseModel):
    headers: Optional[List[str]] = None
    rows: Optional[List[List[str]]] = None


class DocumentSection(BaseModel):
    sectionId: str
    title: str
    contentOrder: int
    bullets: List[str] = Field(default_factory=list)
    tables: List[DocumentTable] = Field(default_factory=list)
    speakerNotes: Optional[str] = None
    imageIds: List[str] = Field(default_factory=list)


class DocumentContext(BaseModel):
    title: str
    sourceFileName: str
    fileType: FileType
    sections: List[DocumentSection]
    author: Optional[str] = None
    subject: Optional[str] = None
    extractedImages: List[ExtractedImage] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==========================================
# 2. LessonOutline Models
# ==========================================

class OutlineSlide(BaseModel):
    slideId: str
    suggestedTemplateId: TemplateId
    title: str
    keyTakeaways: List[str]
    speakerNotesDraft: str
    contentPayload: Optional[Dict[str, Any]] = None


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctIndex: int
    explanation: str


class OutlineSection(BaseModel):
    sectionTitle: str
    description: Optional[str] = None
    slideCount: int


class LessonOutline(BaseModel):
    topic: str
    targetAudience: str
    estimatedDurationMinutes: float
    learningObjectives: List[str]
    slides: List[OutlineSlide]
    summary: str
    sections: List[OutlineSection] = Field(default_factory=list)
    quiz: List[QuizQuestion] = Field(default_factory=list)
    status: str = "draft"


# ==========================================
# 3. LessonSceneJSON Models
# ==========================================

class AnimationItem(BaseModel):
    target: str
    preset: AnimationPreset
    delay: float = Field(ge=0.0)
    duration: float = Field(ge=0.1)
    easing: str = "power2.out"


class VoiceConfig(BaseModel):
    narration: str
    provider: TTSProvider
    voiceId: Optional[str] = None
    audioUrl: Optional[str] = None
    durationSeconds: Optional[float] = Field(default=None, ge=0.0)


class SlideElement(BaseModel):
    id: str
    type: str
    content: Optional[Any] = None
    style: Optional[Dict[str, Any]] = None


class SlideScene(BaseModel):
    slideId: str
    templateId: TemplateId
    layoutVariant: str = "default"
    title: str
    subtitle: Optional[str] = None
    elements: List[SlideElement] = Field(default_factory=list)
    animations: List[AnimationItem] = Field(default_factory=list)
    voice: VoiceConfig
    durationSeconds: float = Field(ge=1.0)
    notes: Optional[str] = None


class LessonSceneJSON(BaseModel):
    projectId: str
    title: str
    slides: List[SlideScene]
    theme: Optional[Dict[str, Any]] = None
    totalDurationSeconds: Optional[float] = None
