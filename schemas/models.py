"""
schemas/models.py
Pydantic Models matching schemas/ JSON Schema contracts (v2)
- DocumentContext
- LessonOutline
- LessonSceneJSON (v2 with v1 compatibility)
- TemplatePack
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


# ==========================================
# 0. Common & Tag Enums (Centralized per SPEC_V2)
# ==========================================

class SubjectTag(str, Enum):
    TOAN_TIN = "toan-tin"
    KHOA_HOC_TU_NHIEN = "khoa-hoc-tu-nhien"
    XA_HOI_NHAN_VAN = "xa-hoi-nhan-van"
    NGOAI_NGU = "ngoai-ngu"
    KINH_TE_QUAN_TRI = "kinh-te-quan-tri"
    TONG_HOP = "tong-hop"


class StyleTag(str, Enum):
    HOC_THUAT_NGHIEM_TUC = "hoc-thuat-nghiem-tuc"
    HIEN_DAI_TOI_GIAN = "hien-dai-toi-gian"
    SINH_DONG_TRE_TRUNG = "sinh-dong-tre-trung"
    CONG_NGHE_TUONG_LAI = "cong-nghe-tuong-lai"


class EffectTag(str, Enum):
    NHE_NHANG_FADE = "nhe-nhang-fade"
    NANG_DONG_KINETIC = "nang-dong-kinetic"
    CHU_DANH_MAY_TYPEWRITER = "chu-danh-may-typewriter"


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


class SlotRole(str, Enum):
    TITLE = "title"
    SUBTITLE = "subtitle"
    BADGE = "badge"
    BODY = "body"
    BULLETS = "bullets"
    MEDIA = "media"
    DIAGRAM = "diagram"
    FORMULA = "formula"
    QUIZ = "quiz"
    TIMELINE = "timeline"


class SlotAcceptsType(str, Enum):
    TEXT = "text"
    LIST = "list"
    IMAGE = "image"
    VIDEO = "video"
    DIAGRAM = "diagram"
    CHART = "chart"
    FORMULA = "formula"


class LayoutPurpose(str, Enum):
    TITLE = "title"
    CONCEPT_EXPLAIN = "concept-explain"
    BULLET_BREAKDOWN = "bullet-breakdown"
    IMAGE_EXPLAIN = "image-explain"
    COMPARISON = "comparison"
    TIMELINE = "timeline"
    FORMULA_EXPLAIN = "formula-explain"
    QUIZ = "quiz"
    SUMMARY = "summary"
    CUSTOM = "custom"


class MediaSourceType(str, Enum):
    DOCUMENT = "document"
    DIAGRAM = "diagram"
    CHART = "chart"
    UPLOAD = "upload"
    AI_IMAGE = "ai-image"


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DIAGRAM = "diagram"


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
    title: str
    keyTakeaways: List[str]
    speakerNotesDraft: str
    suggestedLayoutId: Optional[str] = None
    suggestedTemplateId: Optional[Union[TemplateId, str]] = None
    contentPayload: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def sync_layout_and_template(cls, data: Any) -> Any:
        if isinstance(data, dict):
            layout = data.get("suggestedLayoutId")
            template = data.get("suggestedTemplateId")
            if not layout and template:
                data["suggestedLayoutId"] = str(template)
            elif not template and layout:
                data["suggestedTemplateId"] = str(layout)
        return data


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
# 3. TemplatePack Models (v2)
# ==========================================

class SlotConstraints(BaseModel):
    maxChars: Optional[int] = None
    maxItems: Optional[int] = None
    aspectRatio: Optional[str] = None


class Slot(BaseModel):
    id: str
    role: SlotRole
    accepts: List[SlotAcceptsType]
    constraints: Optional[SlotConstraints] = None
    optional: bool = False
    defaultValue: Optional[Any] = None


class Variant(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    layoutType: Optional[str] = None


class DecorElement(BaseModel):
    id: str
    type: str
    content: Optional[Any] = None
    style: Optional[Dict[str, Any]] = None


class AnimationItem(BaseModel):
    target: str
    preset: AnimationPreset
    delay: float = Field(ge=0.0)
    duration: float = Field(ge=0.1)
    easing: str = "power2.out"


class Layout(BaseModel):
    id: str
    name: str
    purpose: LayoutPurpose
    slots: List[Slot]
    decor: List[DecorElement] = Field(default_factory=list)
    variants: List[Variant] = Field(default_factory=list)
    defaultAnimations: List[AnimationItem] = Field(default_factory=list)


class PackTags(BaseModel):
    subject: List[SubjectTag]
    style: List[StyleTag]
    effect: List[EffectTag]


class PackColors(BaseModel):
    primary: Optional[str] = None
    primaryHover: Optional[str] = None
    accent: Optional[str] = None
    bgCanvas: Optional[str] = None
    bgCard: Optional[str] = None
    textMain: Optional[str] = None
    textSub: Optional[str] = None
    border: Optional[str] = None


class PackFonts(BaseModel):
    heading: str = "Be Vietnam Pro, sans-serif"
    body: str = "Be Vietnam Pro, sans-serif"
    code: str = "JetBrains Mono, monospace"


class PackTokens(BaseModel):
    colors: PackColors
    fonts: PackFonts = Field(default_factory=PackFonts)
    spacing: Optional[Dict[str, Any]] = None


class TemplatePack(BaseModel):
    schemaVersion: Optional[str] = Field(default="2.0.0", alias="schemaVersion")
    id: str
    name: str
    description: str
    previewVideoUrl: Optional[str] = None
    aspectRatio: str = "16:9"
    tags: PackTags
    tokens: PackTokens
    layouts: List[Layout]


# ==========================================
# 4. LessonSceneJSON Models (v2)
# ==========================================

class MediaCandidate(BaseModel):
    id: str
    source: MediaSourceType
    type: MediaType
    url: str
    alt: Optional[str] = None
    relevance: float = Field(default=1.0, ge=0.0, le=1.0)
    license: str = "educational-fair-use"


class VoiceConfig(BaseModel):
    narration: str
    provider: TTSProvider = TTSProvider.VIENEU
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
    layoutId: Optional[str] = None
    templateId: Optional[Union[TemplateId, str]] = None
    variantId: str = "default"
    layoutVariant: Optional[str] = "default"
    title: Optional[str] = ""
    subtitle: Optional[str] = None
    slotValues: Dict[str, Any] = Field(default_factory=dict)
    media: List[MediaCandidate] = Field(default_factory=list)
    elements: List[SlideElement] = Field(default_factory=list)
    animations: List[AnimationItem] = Field(default_factory=list)
    voice: VoiceConfig
    durationSeconds: float = Field(ge=1.0)
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_slide_ids(cls, data: Any) -> Any:
        if isinstance(data, dict):
            s_id = data.get("slideId") or data.get("id")
            if s_id:
                data["slideId"] = s_id

            layout = data.get("layoutId")
            template = data.get("templateId")
            if not layout and template:
                data["layoutId"] = str(template)
            elif not template and layout:
                data["templateId"] = str(layout)

            variant = data.get("variantId")
            layout_var = data.get("layoutVariant")
            if not variant and layout_var:
                data["variantId"] = layout_var
            elif not layout_var and variant:
                data["layoutVariant"] = variant
        return data


class LessonSceneJSON(BaseModel):
    schemaVersion: int = 2
    packId: str = "basic"
    projectId: str
    title: str
    slides: List[SlideScene]
    theme: Optional[Dict[str, Any]] = None
    totalDurationSeconds: Optional[float] = None


# Aliases for v2 spec naming
SlideSceneV2 = SlideScene
SlideVoiceConfig = VoiceConfig

