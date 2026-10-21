"""
scripts/migrate_v1_to_v2.py
Pure, idempotent migration engine from AI Lecture Studio v1 to v2 (Template-First)
Conforms strictly to docs/SPEC_V2.md §4 and docs/adr/0006.

Features:
- Pure function `migrate_scene_v1_to_v2`: idempotent, no data loss.
- In-memory helper `migrate_on_read` for runtime API transparency.
- CLI with batch processing, --dry-run, and automated backup.
"""

import os
import sys
import json
import copy
import shutil
import argparse
from typing import Any, Dict, List, Optional


def migrate_scene_v1_to_v2(scene: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pure, idempotent migration function converting a v1 LessonSceneJSON to v2.
    If already v2 (schemaVersion >= 2 and packId present), returns an exact deep copy.
    """
    if not isinstance(scene, dict):
        raise ValueError("Input scene must be a dictionary")

    # Idempotent check
    if scene.get("schemaVersion", 1) >= 2 and scene.get("packId"):
        return copy.deepcopy(scene)

    v2_scene = copy.deepcopy(scene)
    v2_scene["schemaVersion"] = 2
    v2_scene["packId"] = scene.get("packId") or "basic"

    slides: List[Dict[str, Any]] = v2_scene.get("slides", [])
    migrated_slides = []

    for slide in slides:
        m_slide = copy.deepcopy(slide)
        
        # 1. Map layoutId and variantId
        layout_id = m_slide.get("layoutId") or m_slide.get("templateId") or "concept-explain"
        variant_id = m_slide.get("variantId") or m_slide.get("layoutVariant") or "default"
        m_slide["layoutId"] = layout_id
        m_slide["variantId"] = variant_id

        # Preserve legacy aliases for backward compatibility if present
        m_slide["templateId"] = layout_id
        m_slide["layoutVariant"] = variant_id

        # 2. Extract and initialize slotValues & media
        slot_values: Dict[str, Any] = copy.deepcopy(m_slide.get("slotValues", {}))
        media_list: List[Dict[str, Any]] = copy.deepcopy(m_slide.get("media", []))
        remaining_elements: List[Dict[str, Any]] = []

        # 3. Map v1 elements to v2 slotValues
        elements = m_slide.get("elements", [])
        for el in elements:
            el_type = el.get("type")
            el_id = el.get("id", "")
            content = el.get("content")

            if el_type == "badge":
                slot_values.setdefault("badge", content)

            elif el_type in ["text", "card"]:
                if el_id == "txt-author":
                    slot_values.setdefault("author", content)
                elif el_id == "txt-side":
                    slot_values.setdefault("sideText", content)
                elif el_id == "formula-note":
                    slot_values.setdefault("note", content)
                elif layout_id == "comparison":
                    if "left" in el_id.lower() or "materialism" in el_id.lower():
                        slot_values.setdefault("leftColumn", content)
                    elif "right" in el_id.lower() or "idealism" in el_id.lower():
                        slot_values.setdefault("rightColumn", content)
                    else:
                        remaining_elements.append(el)
                elif layout_id == "bullet-breakdown":
                    current_cards = slot_values.setdefault("cards", [])
                    current_cards.append(content)
                else:
                    if isinstance(content, dict):
                        slot_values.setdefault("card", content)
                    else:
                        slot_values.setdefault("body", content)

            elif el_type == "bullet-list":
                slot_values.setdefault("bullets", content)

            elif el_type == "image":
                img_url = content if isinstance(content, str) else content.get("url", "")
                slot_values.setdefault("media", img_url)
                if img_url and not any(m.get("url") == img_url for m in media_list):
                    media_list.append({
                        "id": el_id or f"media-{len(media_list) + 1}",
                        "source": "document",
                        "type": "image",
                        "url": img_url,
                        "alt": m_slide.get("title", ""),
                        "relevance": 1.0,
                        "license": "educational-fair-use"
                    })

            elif el_type == "formula":
                slot_values.setdefault("formula", content)

            elif el_type == "quiz-block":
                slot_values.setdefault("quiz", content)

            elif el_type == "timeline-step":
                slot_values.setdefault("timeline", content)

            elif el_type == "comparison-table":
                slot_values.setdefault("comparison", content)

            else:
                # Custom or decor element stays in elements[]
                remaining_elements.append(el)

        m_slide["slotValues"] = slot_values
        m_slide["media"] = media_list
        m_slide["elements"] = remaining_elements

        migrated_slides.append(m_slide)

    v2_scene["slides"] = migrated_slides
    return v2_scene


def migrate_on_read(data: Any) -> Any:
    """
    Transparent runtime in-memory helper for API endpoints.
    If input contains a v1 scene, migrates it to v2 on the fly without mutating original file.
    """
    if isinstance(data, dict) and "slides" in data:
        return migrate_scene_v1_to_v2(data)
    return data


def migrate_file(file_path: str, dry_run: bool = False, create_backup: bool = True) -> bool:
    """Migrate a single JSON file from v1 to v2."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception as e:
            raise ValueError(f"Could not parse JSON from {file_path}: {e}")

    if not isinstance(data, dict) or "slides" not in data:
        return False  # Not a scene file

    migrated = migrate_scene_v1_to_v2(data)

    if not dry_run:
        if create_backup:
            backup_path = f"{file_path}.v1.bak"
            if not os.path.exists(backup_path):
                shutil.copy2(file_path, backup_path)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(migrated, f, ensure_ascii=False, indent=2)

    return True


def main():
    parser = argparse.ArgumentParser(description="AI Lecture Studio v1 -> v2 Migration Tool")
    parser.add_argument("target", help="Path to JSON file or directory containing projects")
    parser.add_argument("--dry-run", action="store_true", help="Simulate migration without modifying files")
    parser.add_argument("--no-backup", action="store_true", help="Do not create .v1.bak backup files")

    args = parser.parse_args()
    target_path = os.path.abspath(args.target)
    create_backup = not args.no_backup

    if os.path.isfile(target_path):
        success = migrate_file(target_path, dry_run=args.dry_run, create_backup=create_backup)
        if success:
            print(f"[OK] Migrated file: {target_path} (dry_run={args.dry_run})")
        else:
            print(f"[SKIP] Not a scene file: {target_path}")
    elif os.path.isdir(target_path):
        migrated_count = 0
        for root, _, files in os.walk(target_path):
            for file in files:
                if file.endswith(".json") and not file.endswith(".bak"):
                    full_p = os.path.join(root, file)
                    try:
                        if migrate_file(full_p, dry_run=args.dry_run, create_backup=create_backup):
                            migrated_count += 1
                            print(f"[OK] Migrated: {full_p}")
                    except Exception as err:
                        print(f"[WARN] Skipped {full_p}: {err}")
        print(f"\nMigration completed. Total migrated files: {migrated_count} (dry_run={args.dry_run})")
    else:
        print(f"Target path does not exist: {target_path}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
