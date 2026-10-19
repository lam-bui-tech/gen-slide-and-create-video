"""
scripts/outline_generator.py
Pedagogical Outline Generator and Approval Manager for AI Lecture Studio
Uses LLMProvider (Gemini 3.7 Flash default) to transform DocumentContext + Clarification Answers
into a structured LessonOutline with 10 academic templates and draft speaker notes.
"""

import os
import json
from typing import Dict, Any, Optional

from schemas.models import DocumentContext, LessonOutline, TemplateId
from scripts.llm_provider import LLMProvider, GeminiProvider, FakeProvider, MissingAPIKeyError

SYSTEM_INSTRUCTION = """Bạn là Chuyên gia Thiết kế Sư phạm và Kịch bản Giảng dạy Đại học Xuất sắc.
Nhiệm vụ của bạn là chuyển đổi tài liệu bài giảng thô thành một Dàn bài bài giảng tương tác chuẩn sư phạm (LessonOutline).

Quy tắc sư phạm bắt buộc:
1. Mỗi slide PHẢI được gán chính xác một trong 10 Template ID chuẩn:
   - 'title-slide': Slide bìa mở đầu bài giảng
   - 'learning-objectives': 3-4 mục tiêu chuẩn đầu ra cốt lõi
   - 'concept-explain': Giải thích khái niệm/định nghĩa trọng tâm
   - 'bullet-breakdown': Phân tích luận điểm theo các thẻ card
   - 'image-explain': Sơ đồ tư duy hoặc hình ảnh trực quan lớn kèm chú thích
   - 'comparison': Đối sánh 2 cột đối xứng (Ưu/Nhược, Duy vật vs Duy tâm, Trước vs Sau)
   - 'timeline': Trục thời gian lịch sử hoặc quy trình các bước
   - 'formula-explain': Quy luật, công thức logic hoặc cơ chế vận hành
   - 'quiz': Câu hỏi trắc nghiệm kiểm tra nhanh (check-in) với 4 phương án và lời giải
   - 'summary': Tổng kết bài học và dặn dò sinh viên
2. Mỗi slide phải có 'speakerNotesDraft' là kịch bản lời giảng thuyết minh tiếng Việt tự nhiên, truyền cảm, có lời dẫn nhập và kết nối nhịp nhàng giữa các slide.
3. 'contentPayload' chứa dữ liệu chi tiết phù hợp với template tương ứng (ví dụ comparison: columnA, columnB; timeline: milestones; quiz: question, options, correctIndex).
4. Luôn trả về định dạng JSON hợp lệ theo schema LessonOutline."""


class OutlineGenerator:
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        if llm_provider is not None:
            self.provider = llm_provider
        else:
            try:
                self.provider = GeminiProvider()
            except MissingAPIKeyError:
                # If no API key, check if we have a default fixture fallback
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                fixture_path = os.path.join(base_dir, "fixtures", "outline.sample.json")
                default_data = "{}"
                if os.path.exists(fixture_path):
                    with open(fixture_path, "r", encoding="utf-8") as f:
                        default_data = f.read()
                self.provider = FakeProvider(default_response=default_data)

    def generate_outline(self, doc_context: DocumentContext, answers: Dict[str, Any]) -> LessonOutline:
        prompt = self._build_prompt(doc_context, answers)
        outline = self.provider.generate_structured(
            prompt=prompt,
            schema_class=LessonOutline,
            system_instruction=SYSTEM_INSTRUCTION,
            max_retries=3,
        )
        outline.status = "draft"
        return outline

    def _build_prompt(self, doc_context: DocumentContext, answers: Dict[str, Any]) -> str:
        sections_summary = []
        for s in doc_context.sections[:15]:
            bullets_txt = "; ".join(s.bullets[:4])
            sections_summary.append(f"- [{s.title}]: {bullets_txt}")

        target_audience = answers.get("targetAudience", "Sinh viên đại học năm thứ nhất")
        duration = answers.get("durationMinutes", 15)
        slide_count = answers.get("slideCount", 10)
        style = answers.get("style", "academic-ocean")
        include_quiz = answers.get("includeQuiz", True)

        return f"""Hãy tạo Dàn bài Sư phạm (LessonOutline) cho bài giảng sau:

THÔNG TIN BÀI GIẢNG ĐẦU VÀO:
- Tiêu đề gốc: {doc_context.title}
- Môn học / Lĩnh vực: {doc_context.subject or doc_context.title}
- Tác giả / Đơn vị: {doc_context.author or 'Bộ môn'}
- Nội dung trích xuất từ tài liệu:
{chr(10).join(sections_summary)}

YÊU CẦU SƯ PHẠM CỦA GIẢNG VIÊN:
- Đối tượng người học: {target_audience}
- Thời lượng bài giảng: {duration} phút
- Số lượng slide dự kiến: {slide_count} slides
- Phong cách hình ảnh: {style}
- Tích hợp câu hỏi trắc nghiệm kiểm tra: {include_quiz}

Yêu cầu xuất ra JSON LessonOutline hoàn chỉnh, phân bổ đầy đủ 10 template phù hợp nội dung, có kịch bản thuyết minh tiếng Việt chuẩn mực cho từng slide."""


class OutlineManager:
    def __init__(self, storage_base: str = "storage/projects"):
        self.storage_base = storage_base

    def get_outline_path(self, project_id: str) -> str:
        return os.path.join(self.storage_base, project_id, "lesson_outline.json")

    def get_outline(self, project_id: str) -> Optional[LessonOutline]:
        path = self.get_outline_path(project_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return LessonOutline.model_validate(data)

    def save_outline(self, project_id: str, outline: LessonOutline) -> LessonOutline:
        path = self.get_outline_path(project_id)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(outline.model_dump(), f, ensure_ascii=False, indent=2)
        return outline

    def approve_outline(self, project_id: str) -> LessonOutline:
        outline = self.get_outline(project_id)
        if not outline:
            raise FileNotFoundError(f"No outline found for project {project_id}")
        outline.status = "approved"
        return self.save_outline(project_id, outline)

    def is_approved(self, project_id: str) -> bool:
        outline = self.get_outline(project_id)
        return outline is not None and outline.status == "approved"
