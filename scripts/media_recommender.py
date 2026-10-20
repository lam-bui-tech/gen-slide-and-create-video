"""
scripts/media_recommender.py
Media Recommender & Visual Need Analysis Engine for AI Lecture Studio v2 (P4.1 & P4.2)
Analyzes visual needs per slide (diagram, chart, photo, video, none),
and provides 3 MediaSource adapters: DocumentImageSource, DiagramSource, UploadSource.
"""

import os
import re
import unicodedata
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from schemas.models import (
    DocumentContext,
    SlideSceneV2,
    MediaCandidate,
    MediaSourceType,
    MediaType,
)


class VisualNeedType(str, Enum):
    DIAGRAM = "diagram"
    CHART = "chart"
    PHOTO = "photo"
    VIDEO = "video"
    NONE = "none"


class VisualNeed(BaseModel):
    type: VisualNeedType
    description: str
    searchQuery: Optional[str] = None
    altText: Optional[str] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)


# In-memory cache for visual need analysis: (slideId, content_hash) -> VisualNeed
_VISUAL_NEED_CACHE: Dict[str, VisualNeed] = {}


def _strip_accents(s: str) -> str:
    """Remove Vietnamese diacritics for robust keyword matching."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()


def analyze_visual_need(
    slide: SlideSceneV2,
    doc_context: Optional[DocumentContext] = None
) -> VisualNeed:
    """
    Analyzes pedagogical visual requirement for a slide.
    Rules:
    - Tables with numbers or percentage keywords -> chart
    - Math/science, processes, algorithms, workflows, systems -> diagram
    - Real world concepts, people, objects -> photo
    - Pure title/intro or conclusion slides -> none
    """
    slot_values = slide.slotValues or {}
    text_content = []

    for k, v in slot_values.items():
        if isinstance(v, str):
            text_content.append(v)
        elif isinstance(v, list):
            text_content.extend([str(item) for item in v if isinstance(item, (str, int, float))])

    full_text = " ".join(text_content).lower()
    norm_text = _strip_accents(full_text)

    # Cache lookup
    cache_key = f"{slide.slideId}:{hash(full_text)}"
    if cache_key in _VISUAL_NEED_CACHE:
        return _VISUAL_NEED_CACHE[cache_key]

    # Rule 1: Intro / Pure text slides without visual requirement
    if slide.layoutId in ["title-slide", "summary"] and not any(k in norm_text for k in ["do thi", "so do", "bang", "chart", "diagram"]):
        result = VisualNeed(
            type=VisualNeedType.NONE,
            description="Slide mở đầu / tổng kết tập trung vào văn bản và kịch bản thoại",
            confidence=0.9
        )
        _VISUAL_NEED_CACHE[cache_key] = result
        return result

    # Rule 2: Chart / Statistical data
    chart_keywords = ["thong ke", "ty le", "ti le", "%", "phan tram", "doanh thu", "tang truong", "so lieu", "bang"]
    has_tables = any(s.tables for s in doc_context.sections) if doc_context and hasattr(doc_context, "sections") else False
    if any(k in norm_text for k in chart_keywords) or has_tables:
        result = VisualNeed(
            type=VisualNeedType.CHART,
            description="Biểu đồ trực quan hóa dữ liệu định lượng hoặc số liệu thống kê",
            searchQuery=f"chart data {norm_text[:40]}",
            altText="Biểu đồ số liệu bài học",
            confidence=0.9
        )
        _VISUAL_NEED_CACHE[cache_key] = result
        return result

    # Rule 3: Diagram / Workflow / System architecture
    diagram_keywords = ["so do", "quy trinh", "do thi", "kien truc", "he thong", "chu trinh", "mo hinh", "thuat toan", "buoc 1", "buoc 2", "flow", "diagram"]
    if any(k in norm_text for k in diagram_keywords):
        result = VisualNeed(
            type=VisualNeedType.DIAGRAM,
            description="Sơ đồ khối thể hiện quy trình hoặc cấu trúc liên kết",
            searchQuery=f"diagram {norm_text[:40]}",
            altText="Sơ đồ minh họa kiến trúc hoặc quy trình",
            confidence=0.88
        )
        _VISUAL_NEED_CACHE[cache_key] = result
        return result

    # Default for pedagogical content: Photo / Illustration
    result = VisualNeed(
        type=VisualNeedType.PHOTO,
        description="Hình ảnh minh họa hỗ trợ nhận diện và liên tưởng thực tiễn",
        searchQuery=norm_text[:50],
        altText=f"Hình ảnh minh họa cho {norm_text[:30]}",
        confidence=0.80
    )
    _VISUAL_NEED_CACHE[cache_key] = result
    return result


class MediaSource(ABC):
    @abstractmethod
    def get_candidates(
        self,
        slide: SlideSceneV2,
        need: VisualNeed,
        doc_context: DocumentContext,
        project_id: str
    ) -> List[MediaCandidate]:
        pass


class DocumentImageSource(MediaSource):
    """Ranks images extracted from original document using keyword and section proximity."""

    def get_candidates(
        self,
        slide: SlideSceneV2,
        need: VisualNeed,
        doc_context: DocumentContext,
        project_id: str
    ) -> List[MediaCandidate]:
        candidates: List[MediaCandidate] = []
        if not doc_context.extractedImages:
            return candidates

        slide_text = " ".join([
            str(v) for v in (slide.slotValues or {}).values() if isinstance(v, (str, list))
        ])
        norm_slide_tokens = set(_strip_accents(slide_text).split())

        for img in doc_context.extractedImages:
            name_tokens = set(_strip_accents(img.originalName or img.id).replace("_", " ").replace("-", " ").split())
            intersection = norm_slide_tokens.intersection(name_tokens)
            score = 0.5 + (len(intersection) * 0.15)
            score = min(score, 0.98)

            candidates.append(MediaCandidate(
                id=img.id,
                source=MediaSourceType.DOCUMENT,
                type=MediaType.IMAGE,
                url=img.filePath,
                alt=img.originalName or "Hình ảnh từ tài liệu bài giảng",
                relevance=round(score, 2),
                license="document-original"
            ))

        # Sort descending by relevance
        candidates.sort(key=lambda c: c.relevance, reverse=True)
        return candidates


class DiagramSource(MediaSource):
    """Generates standalone SVG diagrams or charts and saves them as static assets."""

    def __init__(self, storage_base: str = "storage/projects"):
        self.storage_base = storage_base

    def get_candidates(
        self,
        slide: SlideSceneV2,
        need: VisualNeed,
        doc_context: DocumentContext,
        project_id: str
    ) -> List[MediaCandidate]:
        if need.type not in [VisualNeedType.DIAGRAM, VisualNeedType.CHART]:
            return []

        # Determine target directory
        out_dir = os.path.join(self.storage_base, project_id, "images")
        os.makedirs(out_dir, exist_ok=True)
        filename = f"diagram_{slide.slideId}.svg"
        file_path = os.path.join(out_dir, filename)

        # Generate a clean SVG workflow diagram
        title_text = str((slide.slotValues or {}).get("title") or "Sơ đồ Quy trình")
        bullets = (slide.slotValues or {}).get("bullets") or ["Bước 1: Khởi động", "Bước 2: Triển khai", "Bước 3: Đánh giá"]
        if not isinstance(bullets, list):
            bullets = [str(bullets)]

        svg_content = self._generate_svg_markup(title_text, bullets[:4])
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)

        rel_url = f"/storage/projects/{project_id}/images/{filename}"
        return [
            MediaCandidate(
                id=f"diag-{slide.slideId}",
                source=MediaSourceType.DIAGRAM,
                type=MediaType.DIAGRAM,
                url=rel_url,
                alt=f"Sơ đồ minh họa: {title_text}",
                relevance=0.88,
                license="ai-generated-svg"
            )
        ]

    def _generate_svg_markup(self, title: str, steps: List[str]) -> str:
        box_width = 180
        box_height = 80
        gap = 40
        start_x = 40
        start_y = 60
        total_width = max(len(steps) * (box_width + gap) + 40, 600)
        total_height = 200

        boxes_xml = []
        for i, step in enumerate(steps):
            x = start_x + i * (box_width + gap)
            y = start_y
            clean_step = step[:25] + "..." if len(step) > 25 else step
            boxes_xml.append(f"""
                <g>
                  <rect x="{x}" y="{y}" width="{box_width}" height="{box_height}" rx="12" fill="#FFFFFF" stroke="#0F4C81" stroke-width="2.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.08))"/>
                  <rect x="{x}" y="{y}" width="{box_width}" height="24" rx="12" fill="#0F4C81"/>
                  <text x="{x + box_width//2}" y="{y + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Giai đoạn {i+1}</text>
                  <text x="{x + box_width//2}" y="{y + 54}" font-family="sans-serif" font-size="13" fill="#1E293B" text-anchor="middle">{clean_step}</text>
                </g>
            """)
            if i < len(steps) - 1:
                arrow_start = x + box_width
                arrow_end = arrow_start + gap
                boxes_xml.append(f"""
                    <path d="M {arrow_start} {y + box_height//2} L {arrow_end} {y + box_height//2}" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow)"/>
                """)

        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_width} {total_height}" width="100%" height="100%">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#F59E0B"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#F8FAFC" rx="16"/>
  <text x="40" y="35" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0F172A">{title}</text>
  {"".join(boxes_xml)}
</svg>"""


class UploadSource(MediaSource):
    """Provides candidates from teacher uploaded images or videos."""

    def __init__(self, storage_base: str = "storage/projects"):
        self.storage_base = storage_base

    def get_candidates(
        self,
        slide: SlideSceneV2,
        need: VisualNeed,
        doc_context: DocumentContext,
        project_id: str
    ) -> List[MediaCandidate]:
        img_dir = os.path.join(self.storage_base, project_id, "images")
        candidates = []
        if not os.path.exists(img_dir):
            return candidates

        for filename in os.listdir(img_dir):
            if filename.startswith("diagram_"):
                continue  # Skip auto-generated SVGs
            ext = os.path.splitext(filename)[1].lower()
            if ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
                candidates.append(MediaCandidate(
                    id=f"up-{filename}",
                    source=MediaSourceType.UPLOAD,
                    type=MediaType.IMAGE,
                    url=f"/storage/projects/{project_id}/images/{filename}",
                    alt=filename,
                    relevance=0.75,
                    license="teacher-upload"
                ))

        return candidates


class MediaRecommender:
    def __init__(self, storage_base: str = "storage/projects"):
        self.storage_base = storage_base
        self.doc_source = DocumentImageSource()
        self.diag_source = DiagramSource(storage_base=storage_base)
        self.upload_source = UploadSource(storage_base=storage_base)

    def recommend(
        self,
        slide: SlideSceneV2,
        doc_context: DocumentContext,
        project_id: str,
        limit: int = 4
    ) -> Dict[str, Any]:
        need = analyze_visual_need(slide, doc_context)
        all_candidates: List[MediaCandidate] = []

        all_candidates.extend(self.doc_source.get_candidates(slide, need, doc_context, project_id))
        all_candidates.extend(self.diag_source.get_candidates(slide, need, doc_context, project_id))
        all_candidates.extend(self.upload_source.get_candidates(slide, need, doc_context, project_id))

        # Sort and deduplicate by URL
        seen_urls = set()
        unique_candidates = []
        for c in sorted(all_candidates, key=lambda x: x.relevance, reverse=True):
            if c.url not in seen_urls:
                seen_urls.add(c.url)
                unique_candidates.append(c)

        return {
            "visualNeed": need.model_dump(),
            "candidates": [c.model_dump() for c in unique_candidates[:limit]]
        }
