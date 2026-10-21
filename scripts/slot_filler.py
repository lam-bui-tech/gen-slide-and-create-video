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
    SlideElement,
    AnimationItem,
    AnimationPreset,
)
from scripts.llm_provider import LLMProvider, FakeProvider

logger = logging.getLogger("SlotFiller")


class GeneratedSlidePlanItem(BaseModel):
    layoutId: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
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

        # Resolve slide count and duration constraints
        target_slide_count = int(answers.get("slideCount")) if (answers and answers.get("slideCount")) else None
        duration_minutes = float(answers.get("durationMinutes", 5.0)) if answers else 5.0

        if target_slide_count and target_slide_count > 0:
            if len(plan.slides) > target_slide_count:
                plan.slides = plan.slides[:target_slide_count]
            elif len(plan.slides) < target_slide_count and len(plan.slides) > 0:
                while len(plan.slides) < target_slide_count:
                    pad_idx = len(plan.slides) + 1
                    plan.slides.append(GeneratedSlidePlanItem(
                        layoutId="concept-explain" if "concept-explain" in layout_map else pack.layouts[0].id,
                        title=f"Nội dung trọng tâm {pad_idx}",
                        subtitle=None,
                        slotValues={"title": f"Nội dung trọng tâm {pad_idx}", "body": f"Nội dung củng cố và mở rộng phần {pad_idx}."},
                        narration=f"Tiếp theo, chúng ta cùng nghiên cứu nội dung số {pad_idx}."
                    ))

        total_seconds = max(10.0, duration_minutes * 60.0)
        slide_count = max(1, len(plan.slides))
        per_slide_duration = round(total_seconds / slide_count, 1)

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

            # 4. Resolve Title & Subtitle for Slide
            s_title = (
                slide_plan.title
                or slot_values.get("title")
                or slot_values.get("heading")
                or (doc.title if idx == 1 else f"Nội dung trọng tâm {idx}")
            )
            s_subtitle = (
                slide_plan.subtitle
                or slot_values.get("subtitle")
                or slot_values.get("sub")
            )
            if "title" not in slot_values and s_title:
                slot_values["title"] = s_title

            # 5. Populate slide elements for multi-model compatibility
            elements: List[SlideElement] = []
            if "media" in slot_values and isinstance(slot_values["media"], dict):
                elements.append(SlideElement(
                    id="img-main",
                    type="image",
                    content=slot_values["media"].get("url") or slot_values["media"].get("filePath")
                ))
            if "bullets" in slot_values and isinstance(slot_values["bullets"], list):
                elements.append(SlideElement(
                    id="bullet-list",
                    type="bullet-list",
                    content=slot_values["bullets"]
                ))
            if "cards" in slot_values and isinstance(slot_values["cards"], list):
                for c_idx, c_item in enumerate(slot_values["cards"]):
                    elements.append(SlideElement(
                        id=f"card-{c_idx}",
                        type="card",
                        content=c_item
                    ))
            elif "body" in slot_values and isinstance(slot_values["body"], str):
                elements.append(SlideElement(
                    id="card-body",
                    type="card",
                    content=slot_values["body"]
                ))

            # 6. Populate default animations from layout
            anims: List[AnimationItem] = []
            if layout.defaultAnimations:
                anims = [a.model_copy() for a in layout.defaultAnimations]
            else:
                anims = [
                    AnimationItem(
                        target=".slide-title",
                        preset=AnimationPreset.FADE_IN,
                        delay=0.4,
                        duration=0.8,
                        easing="power2.out"
                    )
                ]

            # 7. Construct SlideSceneV2
            slide_scene = SlideSceneV2(
                id=slide_id,
                layoutId=layout.id,
                title=s_title,
                subtitle=s_subtitle,
                slotValues=slot_values,
                elements=elements,
                animations=anims,
                durationSeconds=per_slide_duration,
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

        target_slide_count = int(answers.get('slideCount', 8)) if (answers and answers.get('slideCount')) else 8
        duration_minutes = float(answers.get('durationMinutes', 5.0)) if (answers and answers.get('durationMinutes')) else 5.0

        prompt = f"""
Generate a structured pedagogical deck plan for:
Title: {doc.title}
Audience: {answers.get('targetAudience', 'Sinh viên đại học') if answers else 'Sinh viên đại học'}
Desired Voice: {answers.get('voiceId', 'MyDuyen') if answers else 'MyDuyen'}
Required Slide Count: EXACTLY {target_slide_count} slides. (You MUST generate exactly {target_slide_count} slides in the slides array).
Estimated Presentation Duration: {duration_minutes} minutes.

### Available Layouts in chosen Pack:
{layouts_str}

### Document Sections:
{sections_str}

### Extracted Image Inventory (YOU MAY ONLY REFERENCE THESE):
{inventory_str}

Generate a list of slides matching the GeneratedDeckPlan schema.
For each slide:
1. Provide a clear, meaningful "title" and optional "subtitle" describing the slide topic.
2. Select appropriate layoutId based on content.
3. Fill slotValues matching the layout's slots (including "title", "body", "bullets", "media", etc.).
4. If referencing an image, use {{"type": "image", "id": "<id_from_inventory>", "url": "<filePath_from_inventory>"}}.
5. Provide engaging narration in natural Vietnamese for the audio voiceover.
"""
        return prompt.strip()
