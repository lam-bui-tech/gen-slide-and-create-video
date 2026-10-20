"""
scripts/slot_filler.py
SlotFillerEngine for AI Lecture Studio v2 (P3.2)
Takes DocumentContext + TemplatePack and fills slotValues using structured LLM output.
Enforces layout slot constraints, resolves the second root cause of blank slides
by passing an exact image inventory, rejects invented image IDs, and outputs valid SlideSceneV2.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from schemas.models import (
    DocumentContext,
    TemplatePack,
    Layout,
    Slot,
    SlideSceneV2,
    SlideVoiceConfig,
)
from scripts.llm_provider import LLMProvider, FakeProvider

logger = logging.getLogger("SlotFiller")


class GeneratedSlidePlanItem(BaseModel):
    layoutId: str
    slotValues: Dict[str, Any]
    narration: str = ""


class GeneratedDeckPlan(BaseModel):
    slides: List[GeneratedSlidePlanItem]


DEFAULT_ROLE_CONSTRAINTS = {
    "title": {"maxChars": 80},
    "badge": {"maxChars": 30},
    "subtitle": {"maxChars": 120},
    "bullets": {"maxItems": 6, "maxChars": 150},
    "caption": {"maxChars": 100},
}


def check_slot_constraints(slot_values: Dict[str, Any], layout: Layout) -> List[Dict[str, Any]]:
    """
    Validates slotValues against slot constraints defined in the Layout.
    Falls back to pedagogical standard limits by slot role if not explicitly set.
    Returns a list of overflows with slotId, limit, and current values.
    """
    overflows: List[Dict[str, Any]] = []
    slot_map = {s.id: s for s in layout.slots}

    for slot_id, val in slot_values.items():
        slot = slot_map.get(slot_id)
        if not slot:
            continue

        c = slot.constraints
        role_default = DEFAULT_ROLE_CONSTRAINTS.get(slot.role, {})

        max_chars = (c.maxChars if c and c.maxChars is not None else role_default.get("maxChars"))
        max_items = (c.maxItems if c and c.maxItems is not None else role_default.get("maxItems"))

        # Check maxChars for string values
        if max_chars is not None and isinstance(val, str):
            if len(val) > max_chars:
                overflows.append({
                    "slotId": slot_id,
                    "type": "maxChars",
                    "limit": max_chars,
                    "current": len(val),
                    "text": val
                })

        # Check maxItems and item maxChars for lists (e.g. bullets)
        if isinstance(val, list):
            if max_items is not None and len(val) > max_items:
                overflows.append({
                    "slotId": slot_id,
                    "type": "maxItems",
                    "limit": max_items,
                    "current": len(val)
                })
            if max_chars is not None:
                for idx, item in enumerate(val):
                    if isinstance(item, str) and len(item) > max_chars:
                        overflows.append({
                            "slotId": f"{slot_id}[{idx}]",
                            "type": "maxChars",
                            "limit": max_chars,
                            "current": len(item),
                            "text": item
                        })

    return overflows


class SlotFillerEngine:
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider or FakeProvider()

    def build_image_inventory(self, doc: DocumentContext) -> List[Dict[str, Any]]:
        """
        Creates a clean inventory of extracted images from the document context.
        This provides the source of truth for the LLM to prevent phantom 404 images.
        """
        inventory = []
        for img in doc.extractedImages:
            inventory.append({
                "id": img.id,
                "filePath": img.filePath,
                "originalName": img.originalName or img.id,
                "width": img.width,
                "height": img.height
            })
        return inventory

    def fill_deck(
        self,
        doc: DocumentContext,
        pack: TemplatePack,
        answers: Optional[Dict[str, Any]] = None,
        max_condense_retries: int = 2,
    ) -> List[SlideSceneV2]:
        """
        Fills all slots across slides using LLM structured output and validates against pack layouts.
        """
        image_inventory = self.build_image_inventory(doc)
        valid_image_ids = {img["id"]: img["filePath"] for img in image_inventory}
        layout_map = {l.id: l for l in pack.layouts}

        # Build prompt
        prompt = self._build_generation_prompt(doc, pack, image_inventory, answers)
        system_instruction = (
            "You are an expert pedagogical presentation designer. "
            "Output ONLY valid JSON matching the requested deck plan schema. "
            "You must ONLY reference image IDs that exist in the provided Image Inventory. "
            "Never invent image paths or IDs."
        )

        plan = self.llm_provider.generate_structured(
            prompt=prompt,
            schema_class=GeneratedDeckPlan,
            system_instruction=system_instruction
        )

        slides_v2: List[SlideSceneV2] = []
        for idx, slide_plan in enumerate(plan.slides, start=1):
            slide_id = f"slide-{idx:02d}"

            # 1. Resolve layout
            layout_id = slide_plan.layoutId
            if layout_id not in layout_map:
                # Fallback to first available layout or concept-explain
                layout_id = "concept-explain" if "concept-explain" in layout_map else pack.layouts[0].id

            layout = layout_map[layout_id]
            slot_values = dict(slide_plan.slotValues)

            # 2. Strict Image Validation: Prevent invented image IDs (AS_IS root cause #2)
            if "media" in slot_values and isinstance(slot_values["media"], dict):
                media_obj = slot_values["media"]
                ref_id = media_obj.get("id")
                if ref_id and ref_id not in valid_image_ids:
                    logger.warning(f"Slide {slide_id}: Rejected invented image ID '{ref_id}'")
                    # If document has any extracted image, use the first valid one; else remove media slot
                    if valid_image_ids:
                        first_id, first_path = next(iter(valid_image_ids.items()))
                        media_obj["id"] = first_id
                        media_obj["url"] = first_path
                    else:
                        del slot_values["media"]
                elif ref_id in valid_image_ids:
                    # Ensure URL matches local static path correctly
                    media_obj["url"] = valid_image_ids[ref_id]

            # 3. Check and auto-condense slot overflows
            overflows = check_slot_constraints(slot_values, layout)
            if overflows:
                slot_values = self._auto_condense_slots(slot_values, overflows)

            # 4. Construct SlideSceneV2 with nullable audio fields
            slide_scene = SlideSceneV2(
                id=slide_id,
                layoutId=layout.id,
                slotValues=slot_values,
                durationSeconds=5.0,
                voice=SlideVoiceConfig(
                    narration=slide_plan.narration or f"Nội dung bài học slide {idx}.",
                    audioUrl=None,
                    durationSeconds=None,
                ),
            )
            slides_v2.append(slide_scene)

        return slides_v2

    def _auto_condense_slots(
        self,
        slot_values: Dict[str, Any],
        overflows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Trims or condenses slot values that exceed constraints.
        """
        for o in overflows:
            slot_id = o["slotId"]
            if "[" in slot_id and slot_id.endswith("]"):
                # List item overflow e.g. bullets[0]
                base_slot, idx_str = slot_id[:-1].split("[")
                idx = int(idx_str)
                limit = o["limit"]
                if base_slot in slot_values and isinstance(slot_values[base_slot], list):
                    item = slot_values[base_slot][idx]
                    if len(item) > limit:
                        slot_values[base_slot][idx] = item[:limit - 3].rsplit(" ", 1)[0] + "..."
            else:
                if o["type"] == "maxChars" and slot_id in slot_values:
                    val = slot_values[slot_id]
                    limit = o["limit"]
                    if isinstance(val, str) and len(val) > limit:
                        slot_values[slot_id] = val[:limit - 3].rsplit(" ", 1)[0] + "..."
                elif o["type"] == "maxItems" and slot_id in slot_values:
                    val = slot_values[slot_id]
                    limit = o["limit"]
                    if isinstance(val, list) and len(val) > limit:
                        slot_values[slot_id] = val[:limit]

        return slot_values

    def _build_generation_prompt(
        self,
        doc: DocumentContext,
        pack: TemplatePack,
        image_inventory: List[Dict[str, Any]],
        answers: Optional[Dict[str, Any]] = None
    ) -> str:
        inventory_str = json.dumps(image_inventory, indent=2, ensure_ascii=False)
        available_layouts = [
            {"id": l.id, "name": l.name, "purpose": l.purpose, "slots": [s.id for s in l.slots]}
            for l in pack.layouts
        ]
        layouts_str = json.dumps(available_layouts, indent=2, ensure_ascii=False)

        sections_str = json.dumps([
            {"title": s.title, "bullets": s.bullets, "imageIds": s.imageIds}
            for s in doc.sections
        ], indent=2, ensure_ascii=False)

        prompt = f"""
Generate a structured pedagogical deck plan for:
Title: {doc.title}
Audience: {answers.get('targetAudience', 'Sinh viên đại học') if answers else 'Sinh viên đại học'}
Desired Voice: {answers.get('voiceId', 'MyDuyen') if answers else 'MyDuyen'}

### Available Layouts in chosen Pack:
{layouts_str}

### Document Sections:
{sections_str}

### Extracted Image Inventory (YOU MAY ONLY REFERENCE THESE):
{inventory_str}

Generate a list of slides matching the GeneratedDeckPlan schema.
For each slide:
1. Select appropriate layoutId based on content.
2. Fill slotValues matching the layout's slots.
3. If referencing an image, use {{"type": "image", "id": "<id_from_inventory>", "url": "<filePath_from_inventory>"}}.
4. Provide engaging narration in natural Vietnamese for the audio voiceover.
"""
        return prompt.strip()
