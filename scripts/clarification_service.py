"""
scripts/clarification_service.py
Pedagogical Clarification Service for AI Lecture Studio
Generates 8 core clarification questions with intelligent pre-filled answers
inferred from DocumentContext.
"""

import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from schemas.models import DocumentContext


class ClarificationQuestion(BaseModel):
    id: str
    question: str
    type: str  # "single-choice", "number", "boolean", "text"
    options: Optional[List[Any]] = None
    suggestedAnswer: Any
    description: Optional[str] = None


class ClarificationService:
    def __init__(self, storage_base: str = "storage/projects"):
        self.storage_base = storage_base

    def generate_questions(self, doc_context: DocumentContext) -> List[ClarificationQuestion]:
        """
        Builds the 8 pedagogical questions, pre-filling answers inferred from DocumentContext.
        """
        title = doc_context.title or ""
        total_sections = len(doc_context.sections)
        all_text = " ".join([s.title + " " + " ".join(s.bullets) for s in doc_context.sections]).lower()

        # 1. Target Audience
        if "cao học" in all_text or "thạc sĩ" in all_text:
            audience = "Học viên cao học / Sau đại học"
        elif "học sinh" in all_text or "thpt" in all_text:
            audience = "Học sinh THPT"
        elif "đi làm" in all_text or "doanh nghiệp" in all_text:
            audience = "Người đi làm / Chuyên gia"
        else:
            audience = "Sinh viên đại học năm thứ nhất"

        # 2. Subject & Goal
        subject_goal = f"{doc_context.subject or title} — Trang bị kiến thức cốt lõi và tư duy phương pháp luận"

        # 3. Desired Duration (5, 10, 15, 20, 45 mins)
        if total_sections <= 3:
            duration = 5
        elif total_sections <= 6:
            duration = 10
        elif total_sections <= 12:
            duration = 20
        else:
            duration = 45

        # 4. Target Slide Count
        suggested_slides = max(total_sections, 8) if total_sections < 8 else min(total_sections, 15)

        # 5. Language
        language = "vi"

        # 6. Visual Style
        style = "academic-ocean"

        # 7. Include Quiz / Check-in
        include_quiz = True

        # 8. Voice-Over Track
        voice_over = "MyDuyen"

        return [
            ClarificationQuestion(
                id="targetAudience",
                question="Đối tượng người học trọng tâm của bài giảng này là ai?",
                type="single-choice",
                options=[
                    "Sinh viên đại học năm thứ nhất",
                    "Sinh viên chuyên ngành nâng cao",
                    "Học sinh THPT",
                    "Người đi làm / Đại chúng",
                ],
                suggestedAnswer=audience,
                description="Giúp AI điều chỉnh văn phong và mức độ hàn lâm phù hợp.",
            ),
            ClarificationQuestion(
                id="subjectGoal",
                question="Môn học và mục tiêu sư phạm trọng tâm là gì?",
                type="text",
                suggestedAnswer=subject_goal,
                description="Chuẩn đầu ra cốt lõi của bài học.",
            ),
            ClarificationQuestion(
                id="durationMinutes",
                question="Thời lượng bài thuyết trình / video mong muốn?",
                type="single-choice",
                options=[5, 10, 15, 20, 45],
                suggestedAnswer=duration,
                description="Thời lượng ước tính để AI phân bổ độ dài kịch bản thoại.",
            ),
            ClarificationQuestion(
                id="slideCount",
                question="Số lượng slide bài giảng mong muốn?",
                type="number",
                options=[6, 8, 10, 12, 15],
                suggestedAnswer=suggested_slides,
                description="AI sẽ tinh gọn hoặc mở rộng dàn ý theo số slide này.",
            ),
            ClarificationQuestion(
                id="language",
                question="Ngôn ngữ chính của bài giảng?",
                type="single-choice",
                options=["vi", "en"],
                suggestedAnswer=language,
                description="Ngôn ngữ hiển thị trên slide và kịch bản thuyết minh.",
            ),
            ClarificationQuestion(
                id="style",
                question="Phong cách thiết kế giao diện (Design Theme)?",
                type="single-choice",
                options=["academic-ocean", "modern-minimal", "classic-warm"],
                suggestedAnswer=style,
                description="Bảng màu và không gian thị giác của 10 template HyperFrames.",
            ),
            ClarificationQuestion(
                id="includeQuiz",
                question="Tích hợp câu hỏi kiểm tra nhanh (check-in quiz) củng cố bài học?",
                type="boolean",
                options=[True, False],
                suggestedAnswer=include_quiz,
                description="Tạo slide trắc nghiệm tương tác kiểm tra mức độ hiểu bài.",
            ),
            ClarificationQuestion(
                id="voiceOver",
                question="Giọng đọc thuyết minh tự động (Vietnamese TTS)?",
                type="single-choice",
                options=["MyDuyen", "HaMy", "BanMai", "Viettel"],
                suggestedAnswer=voice_over,
                description="Giọng đọc VieNeu-TTS v3 Turbo đồng bộ từng từ vào slide.",
            ),
        ]

    def save_answers(self, project_id: str, answers: Dict[str, Any]) -> str:
        """Saves confirmed answers into storage/projects/{id}/clarification_answers.json"""
        project_dir = os.path.join(self.storage_base, project_id)
        os.makedirs(project_dir, exist_ok=True)
        answers_path = os.path.join(project_dir, "clarification_answers.json")

        with open(answers_path, "w", encoding="utf-8") as f:
            json.dump(answers, f, ensure_ascii=False, indent=2)

        return answers_path
