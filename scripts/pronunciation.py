"""
scripts/pronunciation.py
Vietnamese pronunciation normalization engine for VieNeu / Viettel TTS (P7.2)
Only modifies text passed into TTS synthesis, never displayed text on slides.
Handles math formulas (exponents, roots, fractions, relations), units, greek symbols,
subject-specific terminology dictionaries, and per-project overrides.
"""

import re
from typing import Dict, Optional


GREEK_LETTERS = {
    "α": "an-pha",
    "Α": "An-pha",
    "β": "bê-ta",
    "Β": "Bê-ta",
    "γ": "gam-ma",
    "Γ": "Gam-ma",
    "δ": "đen-ta",
    "Δ": "Đen-ta",
    "ε": "ép-xi-lon",
    "Ε": "Ép-xi-lon",
    "θ": "thê-ta",
    "Θ": "Thê-ta",
    "λ": "lam-đa",
    "Λ": "Lam-đa",
    "μ": "muy",
    "Μ": "Muy",
    "π": "pi",
    "Π": "Pi",
    "σ": "xích-ma",
    "Σ": "Xích-ma",
    "ω": "ô-mê-ga",
    "Ω": "Ô-mê-ga",
}

MATH_RELATIONS = {
    "≤": "nhỏ hơn hoặc bằng",
    "<=": "nhỏ hơn hoặc bằng",
    "≥": "lớn hơn hoặc bằng",
    ">=": "lớn hơn hoặc bằng",
    "≠": "khác",
    "!=": "khác",
    "≈": "xấp xỉ",
    "±": "cộng trừ",
    "∈": "thuộc",
    "∉": "không thuộc",
    "∞": "vô cùng",
    "∑": "tổng",
    "∫": "tích phân",
}

COMMON_UNITS = [
    (r"(\d+)\s*%", r"\1 phần trăm"),
    (r"(\d+)\s*km/h\b", r"\1 ki-lô-mét trên giờ"),
    (r"(\d+)\s*m/s\b", r"\1 mét trên giây"),
    (r"(\d+)\s*°C\b", r"\1 độ C"),
    (r"(\d+)\s*kg\b", r"\1 ki-lô-gam"),
    (r"(\d+)\s*km\b", r"\1 ki-lô-mét"),
    (r"(\d+)\s*cm\b", r"\1 xen-ti-mét"),
    (r"(\d+)\s*mm\b", r"\1 mi-li-mét"),
    (r"(\d+)\s*nm\b", r"\1 na-nô-mét"),
]

SUBJECT_DICTIONARIES: Dict[str, Dict[str, str]] = {
    "toan-tin": {
        r"\bAI\b": "A-I",
        r"\bML\b": "M-L",
        r"\bAPI\b": "A-P-I",
        r"\bCPU\b": "C-P-U",
        r"\bRAM\b": "Ram",
        r"\bGPU\b": "G-P-U",
        r"\bSQL\b": "S-Q-L",
        r"\bHTML\b": "H-T-M-L",
        r"\bCSS\b": "C-S-S",
        r"\bJS\b": "J-S",
    },
    "khoa-hoc-tu-nhien": {
        r"\bH2O\b": "H-hai-O",
        r"\bCO2\b": "C-O-hai",
        r"\bNaCl\b": "Na-C-L",
        r"\bDNA\b": "D-N-A",
        r"\bRNA\b": "R-N-A",
        r"\bATP\b": "A-T-P",
    },
    "kinh-te-quan-tri": {
        r"\bGDP\b": "G-D-P",
        r"\bROI\b": "R-O-I",
        r"\bKPI\b": "K-P-I",
        r"\bB2B\b": "B-to-B",
        r"\bB2C\b": "B-to-C",
        r"\bCEO\b": "C-E-O",
        r"\bCFO\b": "C-F-O",
    },
    "xa-hoi-nhan-van": {
        r"\bUNESCO\b": "U-nét-xcô",
        r"\bWTO\b": "W-T-O",
        r"\bASEAN\b": "A-xê-an",
        r"\bEU\b": "E-U",
    },
}


def normalize_greek_letters(text: str) -> str:
    for char, spoken in GREEK_LETTERS.items():
        text = text.replace(char, spoken)
    return text


def normalize_units_and_percents(text: str) -> str:
    for pattern, repl in COMMON_UNITS:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


def normalize_math_symbols(text: str) -> str:
    # 1. Relations
    for sym, spoken in MATH_RELATIONS.items():
        # Pad with spaces around relation words
        text = text.replace(sym, f" {spoken} ")

    # 2. Roots: √x or \sqrt{x}
    text = re.sub(r"\\sqrt\{([^}]+)\}", r"căn bậc hai của \1", text)
    text = re.sub(r"√\s*([a-zA-Z0-9]+)", r"căn bậc hai của \1", text)

    # 3. Exponents
    # Squared: x² or x^2
    text = re.sub(r"([a-zA-Z0-9]+)[\^]2\b", r"\1 bình phương", text)
    text = re.sub(r"([a-zA-Z0-9]+)[\^]3\b", r"\1 lập phương", text)
    text = re.sub(r"([a-zA-Z0-9]+)[\^]([0-9a-zA-Z]+)\b", r"\1 mũ \2", text)
    text = text.replace("²", " bình phương")
    text = text.replace("³", " lập phương")
    text = text.replace("⁴", " mũ bốn")
    text = text.replace("ⁿ", " mũ n")

    # 4. Fractions: a/b (only single token a / single token b to avoid breaking dates/paths)
    text = re.sub(r"\b([a-zA-Z0-9]+)\s*/\s*([a-zA-Z0-9]+)\b", r"\1 trên \2", text)

    # Clean multiple spaces
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_for_tts(
    text: str,
    subject: Optional[str] = None,
    overrides: Optional[Dict[str, str]] = None,
) -> str:
    """
    Main entry point: convert raw narration text into natural spoken Vietnamese.
    Order of precedence:
    1. Project/user overrides
    2. Common units & percentages (before math fraction split)
    3. Math relations, roots, exponents, fractions
    4. Greek letters
    5. Subject-specific terminology
    """
    if not text:
        return ""

    result = text

    # Apply project overrides first if provided
    if overrides:
        for k, v in overrides.items():
            result = result.replace(k, v)

    # Units and percents (prevent km/h from becoming km trên h)
    result = normalize_units_and_percents(result)

    # Math symbols
    result = normalize_math_symbols(result)

    # Greek letters
    result = normalize_greek_letters(result)

    # Subject dictionary
    if subject and subject in SUBJECT_DICTIONARIES:
        for pattern, replacement in SUBJECT_DICTIONARIES[subject].items():
            result = re.sub(pattern, replacement, result)

    # Clean whitespace
    result = " ".join(result.split())
    return result
