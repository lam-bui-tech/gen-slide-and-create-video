"""
scripts/manual_run_gemini_outline.py
Manual verification script: calls real Gemini Flash (gemini-3.7-flash)
to generate a complete pedagogical LessonOutline from DocumentContext.
Requires GEMINI_API_KEY environment variable.
"""

import os
import sys
import json

from schemas.models import DocumentContext, LessonOutline
from scripts.llm_provider import GeminiProvider, MissingAPIKeyError
from scripts.outline_generator import OutlineGenerator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[-] Error: GEMINI_API_KEY environment variable is not set.")
        print("    Usage (Windows PowerShell): $env:GEMINI_API_KEY='your-key'; python scripts/manual_run_gemini_outline.py")
        sys.exit(1)

    print("[+] Initializing GeminiProvider (gemini-3.7-flash)...")
    provider = GeminiProvider(api_key=api_key)
    generator = OutlineGenerator(llm_provider=provider)

    # Load fixture document context
    doc_path = os.path.join(BASE_DIR, "fixtures", "document_context.sample.json")
    with open(doc_path, "r", encoding="utf-8") as f:
        doc_context = DocumentContext.model_validate(json.load(f))

    answers = {
        "targetAudience": "Sinh viên đại học năm 1",
        "subjectGoal": "Triết học Mác - Lênin",
        "durationMinutes": 15,
        "slideCount": 10,
        "language": "vi",
        "style": "academic-ocean",
        "includeQuiz": True,
        "voiceOver": "MyDuyen",
    }

    print(f"[+] Generating pedagogical LessonOutline for: '{doc_context.title}'...")
    outline = generator.generate_outline(doc_context, answers)

    print(f"[✓] Successfully generated LessonOutline with {len(outline.slides)} slides!")
    print(f"    Topic: {outline.topic}")
    print(f"    Target Audience: {outline.targetAudience}")
    print(f"    Learning Objectives count: {len(outline.learningObjectives)}")
    print(f"    Status: {outline.status}")
    print("\n--- Slides Outline Preview ---")
    for idx, slide in enumerate(outline.slides, 1):
        print(f"  {idx:02d}. [{slide.suggestedTemplateId}] {slide.title}")
        print(f"      Notes preview: {slide.speakerNotesDraft[:80]}...")


if __name__ == "__main__":
    main()
