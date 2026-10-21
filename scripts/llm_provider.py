"""
scripts/llm_provider.py
Deep Module: LLMProvider abstraction behind a clean seam.
Provides adapters for Gemini 3.7 Flash (google-genai SDK), Ollama, and FakeProvider for testing.
Includes automatic validation feedback retry loop (up to max_retries).
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Type, TypeVar, Optional, List, Any, Dict
from pydantic import BaseModel, ValidationError
import warnings
from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings("ignore", message=".*automatic function calling.*")
logging.getLogger("google_genai").setLevel(logging.ERROR)

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger("LLMProvider")


class LLMError(Exception):
    """Base exception for LLM operations."""
    pass


class MissingAPIKeyError(LLMError):
    """Raised when required API key is missing."""
    pass


class LLMValidationError(LLMError):
    """Raised when LLM response repeatedly fails schema validation."""
    pass


class LLMProvider(ABC):
    """
    Abstract Seam for LLM providers.
    Deep interface: callers only need generate_structured() with a Pydantic schema.
    All retry logic, JSON cleanup, and error feedback are encapsulated inside.
    """

    def generate_structured(
        self,
        prompt: str,
        schema_class: Type[T],
        system_instruction: Optional[str] = None,
        max_retries: int = 3,
        pre_validate_hook: Optional[Any] = None,
    ) -> T:
        """
        Executes structured generation with automatic schema validation and error feedback retry loop.
        """
        current_prompt = prompt
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                raw_text = self._call_model(current_prompt, system_instruction=system_instruction)
                cleaned_json = self._clean_json_markdown(raw_text)
                parsed_data = json.loads(cleaned_json)
                if pre_validate_hook:
                    parsed_data = pre_validate_hook(parsed_data)
                return schema_class.model_validate(parsed_data)
            except (json.JSONDecodeError, ValidationError) as e:
                last_error = e
                logger.warning(f"LLM validation failed on attempt {attempt}/{max_retries}: {e}")
                if attempt < max_retries:
                    # Enrich prompt with precise validation feedback for self-correction
                    current_prompt = (
                        f"{prompt}\n\n"
                        f"[CRITICAL FEEDBACK - ATTEMPT {attempt} FAILED VALIDATION]\n"
                        f"Your previous JSON output failed validation with error:\n{str(e)}\n"
                        f"Please fix the format and return ONLY a valid JSON object matching the required schema."
                    )

        raise LLMValidationError(
            f"Validation failed after {max_retries} retries. Last error: {last_error}"
        ) from last_error

    @abstractmethod
    def _call_model(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Internal adapter method to call vendor-specific LLM API."""
        pass

    @staticmethod
    def _clean_json_markdown(text: str) -> str:
        """Strips ```json ... ``` markdown wrappers if returned by LLM."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            return "\n".join(lines).strip()
        return text


# ==========================================
# 1. FakeProvider (For deterministic tests)
# ==========================================

class FakeProvider(LLMProvider):
    def __init__(
        self,
        default_response: Optional[str] = None,
        sequence_responses: Optional[List[str]] = None,
    ):
        self.default_response = default_response or "{}"
        self.sequence_responses = list(sequence_responses) if sequence_responses else []
        self.call_count = 0
        self.history: List[str] = []

    def _call_model(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        self.call_count += 1
        self.history.append(prompt)
        if self.sequence_responses:
            return self.sequence_responses.pop(0)
        return self.default_response


# ==========================================
# 2. GeminiProvider (Gemini 3.7 Flash)
# ==========================================

class GeminiProvider(LLMProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise MissingAPIKeyError(
                "GEMINI_API_KEY is required. Please set the GEMINI_API_KEY environment variable or provide it in .env file."
            )
        self.model = model or os.environ.get("GEMINI_MODEL") or "gemini-flash-lite-latest"

        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            raise LLMError(f"Failed to initialize Google GenAI client: {e}") from e

    def _call_model(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        from google.genai import types

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system_instruction,
            temperature=0.3,
        )

        models_to_try = [self.model]
        for fallback in ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        last_err = None
        for m in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=config,
                )
                return response.text or "{}"
            except Exception as e:
                last_err = e
                logger.warning(f"Model {m} failed: {e}. Trying fallback...")

        raise LLMError(f"Gemini API request failed across all models: {last_err}") from last_err


# ==========================================
# 3. OllamaProvider (Local Open Models)
# ==========================================

class OllamaProvider(LLMProvider):
    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "llama3.2",
    ):
        self.host = host.rstrip("/")
        self.model = model

    def _call_model(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        import urllib.request
        import urllib.error

        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_instruction,
            "format": "json",
            "stream": False,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result.get("response", "{}")
        except urllib.error.URLError as e:
            raise LLMError(f"Ollama connection failed at {self.host}: {e}") from e
