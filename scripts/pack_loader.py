"""
scripts/pack_loader.py
Read-only Python Template Pack Loader & Cache for AI Lecture Studio v2
Complies with docs/SPEC_V2.md §3 and schemas/template_pack.json
"""

import os
import json
import copy
from typing import Any, Dict, List, Optional
import jsonschema
from pydantic import ValidationError

from schemas.models import TemplatePack

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS_DIR = os.path.join(BASE_DIR, "templates", "packs")
SCHEMA_PATH = os.path.join(BASE_DIR, "schemas", "template_pack.json")

# In-memory cache: id -> (pack_dict, mtime)
_PACKS_CACHE: Dict[str, Dict[str, Any]] = {}


def get_pack_schema() -> Dict[str, Any]:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def invalidate_cache(pack_id: Optional[str] = None):
    global _PACKS_CACHE
    if pack_id and pack_id in _PACKS_CACHE:
        del _PACKS_CACHE[pack_id]
    else:
        _PACKS_CACHE.clear()


def load_pack(pack_id: str) -> TemplatePack:
    """
    Load and validate a single template pack by ID.
    Raises FileNotFoundError if not found, ValueError if invalid.
    """
    if ".." in pack_id or "/" in pack_id or "\\" in pack_id:
        raise ValueError(f"Invalid pack id: {pack_id}")

    pack_dir = os.path.join(PACKS_DIR, pack_id)
    pack_file = os.path.join(pack_dir, "pack.json")

    # Fallback for built-in basic pack if templates/packs/ is empty or missing
    if not os.path.exists(pack_file) and pack_id == "basic":
        alt_path = os.path.join(BASE_DIR, "fixtures", "basic_pack.sample.json")
        if os.path.exists(alt_path):
            pack_file = alt_path

    if not os.path.isfile(pack_file):
        raise FileNotFoundError(f"Template pack '{pack_id}' not found.")

    mtime = os.path.getmtime(pack_file)
    cached = _PACKS_CACHE.get(pack_id)
    if cached and cached.get("_mtime") == mtime:
        return TemplatePack.model_validate(cached["data"])

    with open(pack_file, "r", encoding="utf-8") as f:
        try:
            raw_data = json.load(f)
        except Exception as e:
            raise ValueError(f"Failed to parse pack.json for '{pack_id}': {e}")

    # Validate against JSON schema
    schema = get_pack_schema()
    try:
        jsonschema.validate(instance=raw_data, schema=schema)
    except jsonschema.ValidationError as err:
        raise ValueError(f"Pack schema validation failed for '{pack_id}': {err.message}")

    # Validate against Pydantic model
    model = TemplatePack.model_validate(raw_data)
    _PACKS_CACHE[pack_id] = {"data": raw_data, "_mtime": mtime}
    return model


def list_packs(
    subject: Optional[str] = None,
    style: Optional[str] = None,
    effect: Optional[str] = None,
) -> List[TemplatePack]:
    """
    List all available Template Packs with multi-dimensional filtering.
    AND across dimensions (subject AND style AND effect)
    OR within a dimension (comma-separated: subject=toan-tin,xa-hoi-nhan-van)
    """
    if not os.path.exists(PACKS_DIR):
        os.makedirs(PACKS_DIR, exist_ok=True)

    pack_ids = [d for d in os.listdir(PACKS_DIR) if os.path.isdir(os.path.join(PACKS_DIR, d))]
    if "basic" not in pack_ids:
        pack_ids.insert(0, "basic")

    packs: List[TemplatePack] = []
    for pid in pack_ids:
        try:
            p = load_pack(pid)
            packs.append(p)
        except Exception as err:
            print(f"[WARN] Skipped pack '{pid}': {err}")

    # Parse filter queries (comma-separated values = OR)
    subj_filters = [s.strip() for s in subject.split(",") if s.strip()] if subject else []
    style_filters = [s.strip() for s in style.split(",") if s.strip()] if style else []
    effect_filters = [s.strip() for s in effect.split(",") if s.strip()] if effect else []

    filtered: List[TemplatePack] = []
    for p in packs:
        p_subjs = [t.value if hasattr(t, "value") else str(t) for t in p.tags.subject]
        p_styles = [t.value if hasattr(t, "value") else str(t) for t in p.tags.style]
        p_effects = [t.value if hasattr(t, "value") else str(t) for t in p.tags.effect]

        # Check AND across dimensions
        if subj_filters and not any(sf in p_subjs for sf in subj_filters):
            continue
        if style_filters and not any(st in p_styles for st in style_filters):
            continue
        if effect_filters and not any(ef in p_effects for ef in effect_filters):
            continue

        filtered.append(p)

    return filtered


def save_pack(pack_dict: Dict[str, Any]) -> TemplatePack:
    """
    Save a new pack into templates/packs/<id>/pack.json.
    'basic' pack is strictly read-only.
    """
    pack_id = pack_dict.get("id")
    if not pack_id or not isinstance(pack_id, str):
        raise ValueError("Pack must have a non-empty string id")

    if pack_id == "basic":
        raise PermissionError("The built-in 'basic' pack is read-only. Please create a new pack with a distinct id.")

    if ".." in pack_id or "/" in pack_id or "\\" in pack_id:
        raise ValueError(f"Invalid pack id: {pack_id}")

    # Validate against JSON schema first
    schema = get_pack_schema()
    try:
        jsonschema.validate(instance=pack_dict, schema=schema)
    except jsonschema.ValidationError as err:
        raise ValueError(f"Invalid pack data: {err.message}")

    # Validate against Pydantic model
    model = TemplatePack.model_validate(pack_dict)

    target_dir = os.path.join(PACKS_DIR, pack_id)
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, "pack.json")

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(pack_dict, f, ensure_ascii=False, indent=2)

    invalidate_cache(pack_id)
    return model
