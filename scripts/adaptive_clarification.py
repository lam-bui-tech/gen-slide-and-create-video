"""
scripts/adaptive_clarification.py
Adaptive Clarification Service for AI Lecture Studio v2 (P3.1)
Infers subject, audience, visual style, language, and duration from DocumentContext + TemplatePack tokens.
Asks only when confidence < 0.8, plus voice and quiz/check-in choices (Gate G2b: <= 2 questions for standard lectures).
"""

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from schemas.models import DocumentContext, TemplatePack
from scripts.llm_provider import LLMProvider, FakeProvider


class InferredItem(BaseModel):
    key: str
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: Optional[str] = None


class ClarificationQuestion(BaseModel):
    id: str
    question: str
    type: str  # "single-choice", "boolean", "text", "number"
    options: Optional[List[Any]] = None
    suggestedAnswer: Optional[Any] = None
    description: Optional[str] = None


class ClarificationAnalysis(BaseModel):
    inferred: List[InferredItem]
    questions: List[ClarificationQuestion]


class AdaptiveClarificationService:
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider or FakeProvider()

    def analyze(self, doc: DocumentContext, pack: TemplatePack) -> ClarificationAnalysis:
        """
        Analyzes document context and template pack metadata to infer parameters.
        Builds the inferred list and creates questions only when confidence < 0.8
        plus default voice and quiz choices.
        """
        all_text = " ".join([
            (doc.title or ""),
            " ".join([s.title + " " + " ".join(s.bullets) for s in doc.sections])
        ]).lower()

        inferred: List[InferredItem] = []
        questions: List[ClarificationQuestion] = []

        # 1. Infer Visual Style from Template Pack (Pack chosen by user upfront)
        chosen_style = pack.tags.style[0] if pack.tags and pack.tags.style else "hoc-thuat-nghiem-tuc"
        inferred.append(InferredItem(
            key="style",
            value=chosen_style,
            confidence=1.0,
            reasoning=f"Kế thừa từ phong cách thiết kế của Template Pack '{pack.name}'"
        ))

        # 2. Infer Language
        vietnamese_char_pattern = r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]"
        has_vn = len(re.findall(vietnamese_char_pattern, all_text)) > 5
        lang = "vi" if has_vn else "en"
        inferred.append(InferredItem(
            key="language",
            value=lang,
            confidence=0.95,
            reasoning="Phát hiện dấu ngữ âm và từ vựng trong tài liệu gốc"
        ))

        # 3. Infer Subject
        pack_subject = pack.tags.subject[0] if pack.tags and pack.tags.subject else "tong-hop"
        if pack_subject != "tong-hop":
            subj_val = pack_subject
            subj_conf = 0.90
            subj_reason = f"Định hướng bởi Template Pack chuyên ngành ({pack_subject})"
        elif "toán" in all_text or "tin học" in all_text or "thuật toán" in all_text:
            subj_val = "toan-tin"
            subj_conf = 0.88
            subj_reason = "Phát hiện thuật ngữ toán học / công nghệ thông tin"
        elif "kinh tế" in all_text or "quản trị" in all_text or "tài chính" in all_text:
            subj_val = "kinh-te-quan-tri"
            subj_conf = 0.88
            subj_reason = "Phát hiện thuật ngữ kinh tế / quản trị"
        elif "triết học" in all_text or "lịch sử" in all_text or "xã hội" in all_text:
            subj_val = "xa-hoi-nhan-van"
            subj_conf = 0.90
            subj_reason = "Phát hiện nội dung lý luận / khoa học xã hội"
        else:
            subj_val = doc.title or "Tổng hợp"
            subj_conf = 0.82
            subj_reason = "Suy diễn theo tiêu đề tổng quan của bài giảng"

        inferred.append(InferredItem(
            key="subject",
            value=subj_val,
            confidence=subj_conf,
            reasoning=subj_reason
        ))

        # 4. Infer Target Audience
        if any(w in all_text for w in ["cao học", "thạc sĩ", "tiến sĩ", "nghiên cứu sinh"]):
            aud_val = "Học viên cao học / Sau đại học"
            aud_conf = 0.90
            aud_reason = "Tài liệu chứa thuật ngữ đào tạo sau đại học"
        elif any(w in all_text for w in ["sinh viên", "đại học", "học phần", "giáo trình", "môn học"]):
            aud_val = "Sinh viên đại học"
            aud_conf = 0.88
            aud_reason = "Phát hiện cấu trúc học phần và giáo trình bậc đại học"
        elif any(w in all_text for w in ["học sinh", "thpt", "lớp 10", "lớp 11", "lớp 12"]):
            aud_val = "Học sinh THPT"
            aud_conf = 0.90
            aud_reason = "Phát hiện nội dung chương trình phổ thông"
        elif any(w in all_text for w in ["doanh nghiệp", "đi làm", "nhân viên", "chuyên viên"]):
            aud_val = "Người đi làm / Chuyên môn"
            aud_conf = 0.85
            aud_reason = "Phát hiện bối cảnh đào tạo doanh nghiệp"
        else:
            aud_val = "Đại chúng"
            aud_conf = 0.60  # Low confidence -> will trigger question
            aud_reason = "Không tìm thấy dấu hiệu nhận diện nhóm đối tượng cụ thể"

        inferred.append(InferredItem(
            key="targetAudience",
            value=aud_val,
            confidence=aud_conf,
            reasoning=aud_reason
        ))

        # 5. Infer Duration & Slide Count
        sec_count = len(doc.sections)
        if sec_count <= 3:
            duration = 5
        elif sec_count <= 6:
            duration = 10
        elif sec_count <= 10:
            duration = 15
        else:
            duration = 20

        inferred.append(InferredItem(
            key="durationMinutes",
            value=duration,
            confidence=0.85,
            reasoning=f"Ước lượng {duration} phút dựa trên quy mô {sec_count} phần nội dung"
        ))

        # ==========================================
        # Dynamic Questions Generation (Gate G2b)
        # ==========================================
        # Only ask if any inferred property has confidence < 0.8
        for item in inferred:
            if item.confidence < 0.8:
                if item.key == "targetAudience":
                    questions.append(ClarificationQuestion(
                        id="targetAudience",
                        question="Đối tượng học tập trọng tâm của bài giảng là ai?",
                        type="single-choice",
                        options=[
                            "Sinh viên đại học",
                            "Học viên cao học / Sau đại học",
                            "Học sinh THPT",
                            "Người đi làm / Doanh nghiệp",
                            "Đại chúng",
                        ],
                        suggestedAnswer=item.value,
                        description="Hệ thống chưa đủ dữ kiện để tự tin xác định độ tuổi và trình độ người học."
                    ))
                elif item.key == "subject":
                    questions.append(ClarificationQuestion(
                        id="subject",
                        question="Lĩnh vực chuyên môn của bài giảng là gì?",
                        type="single-choice",
                        options=["toan-tin", "khoa-hoc-tu-nhien", "xa-hoi-nhan-van", "ngoai-ngu", "kinh-te-quan-tri", "tong-hop"],
                        suggestedAnswer=item.value,
                        description="Xác định lĩnh vực giúp tối ưu phát âm thuật ngữ và phong cách minh họa."
                    ))

        # Always include the 2 pedagogical choices (Voice and Interactive Check-in Quiz)
        questions.append(ClarificationQuestion(
            id="voiceId",
            question="Giọng đọc thuyết minh trí tuệ nhân tạo (VieNeu)?",
            type="single-choice",
            options=["MyDuyen", "NamKhoi"],
            suggestedAnswer="MyDuyen",
            description="Giọng đọc thuyết minh tự nhiên bằng tiếng Việt theo ngữ cảnh bài học."
        ))

        questions.append(ClarificationQuestion(
            id="includeQuiz",
            question="Thêm câu hỏi trắc nghiệm tương tác / check-in cuối bài giảng?",
            type="boolean",
            options=[True, False],
            suggestedAnswer=True,
            description="Tạo slide kiểm tra nhanh mức độ tiếp thu kiến thức của học viên."
        ))

        return ClarificationAnalysis(inferred=inferred, questions=questions)
