"""
tests/pipeline/test_llm_provider.py
Unit tests for LLMProvider interface, Gemini/Ollama/Fake adapters, and retry logic.
Following TDD and deep module codebase design principles.
"""

import os
import json
import pytest
from pydantic import BaseModel, Field

from scripts.llm_provider import (
    LLMProvider,
    FakeProvider,
    GeminiProvider,
    OllamaProvider,
    MissingAPIKeyError,
    LLMValidationError,
)
from scripts.clarification_service import ClarificationService
from schemas.models import DocumentContext


class SimpleTargetSchema(BaseModel):
    summary: str
    count: int = Field(ge=1)


def test_fake_provider_success():
    valid_payload = {"summary": "Học thuyết Triết học", "count": 5}
    provider = FakeProvider(default_response=json.dumps(valid_payload))

    result = provider.generate_structured(
        prompt="Tóm tắt bài học",
        schema_class=SimpleTargetSchema,
    )
    assert isinstance(result, SimpleTargetSchema)
    assert result.summary == "Học thuyết Triết học"
    assert result.count == 5


def test_fake_provider_retry_then_success():
    # Attempt 1: Invalid count (< 1)
    invalid_payload = {"summary": "Sai quy cách", "count": 0}
    # Attempt 2: Valid
    valid_payload = {"summary": "Đúng quy cách sau sửa", "count": 3}

    provider = FakeProvider(sequence_responses=[
        json.dumps(invalid_payload),
        json.dumps(valid_payload),
    ])

    result = provider.generate_structured(
        prompt="Tóm tắt bài học",
        schema_class=SimpleTargetSchema,
        max_retries=3,
    )
    assert result.summary == "Đúng quy cách sau sửa"
    assert result.count == 3
    assert provider.call_count == 2


def test_fake_provider_exceed_retries_raises_error():
    invalid_payload = {"summary": "Lỗi liên tục", "count": -1}
    provider = FakeProvider(default_response=json.dumps(invalid_payload))

    with pytest.raises(LLMValidationError) as exc_info:
        provider.generate_structured(
            prompt="Test error",
            schema_class=SimpleTargetSchema,
            max_retries=3,
        )
    assert "Validation failed after 3 retries" in str(exc_info.value)
    assert provider.call_count == 3


def test_gemini_provider_missing_key_raises_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(MissingAPIKeyError) as exc_info:
        GeminiProvider(api_key=None)
    assert "GEMINI_API_KEY is required" in str(exc_info.value)


def test_clarification_inference_from_document_context():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    fixture_path = os.path.join(base_dir, "fixtures", "document_context.sample.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        doc_data = json.load(f)

    doc_context = DocumentContext.model_validate(doc_data)
    service = ClarificationService()

    questions = service.generate_questions(doc_context)
    assert len(questions) == 8

    q_map = {q.id: q for q in questions}
    # Check all 8 required questions exist
    assert "targetAudience" in q_map
    assert "subjectGoal" in q_map
    assert "durationMinutes" in q_map
    assert "slideCount" in q_map
    assert "language" in q_map
    assert "style" in q_map
    assert "includeQuiz" in q_map
    assert "voiceOver" in q_map

    # Check pre-filled values
    assert q_map["targetAudience"].suggestedAnswer != ""
    assert "Triết học" in q_map["subjectGoal"].suggestedAnswer
    assert q_map["durationMinutes"].suggestedAnswer in [5, 10, 15, 20, 45]
    assert q_map["slideCount"].suggestedAnswer >= 5
    assert q_map["language"].suggestedAnswer == "vi"
    assert q_map["style"].suggestedAnswer == "academic-ocean"
    assert q_map["includeQuiz"].suggestedAnswer is True
