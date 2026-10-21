import pytest
from fastapi.testclient import TestClient
from server.api_service import app
from scripts.pronunciation import (
    normalize_for_tts,
    normalize_math_symbols,
    normalize_units_and_percents,
    normalize_greek_letters,
)

client = TestClient(app)


@pytest.mark.parametrize(
    "input_text,expected_sub",
    [
        ("x² + y² = z²", "x bình phương + y bình phương = z bình phương"),
        ("x³ - 8 = 0", "x lập phương - 8 = 0"),
        ("√x + 5 = 10", "căn bậc hai của x + 5 = 10"),
        ("a/b = c/d", "a trên b = c trên d"),
        ("25% học sinh", "25 phần trăm học sinh"),
        ("Vận tốc 60 km/h", "Vận tốc 60 ki-lô-mét trên giờ"),
        ("Nhiệt độ 37°C", "Nhiệt độ 37 độ C"),
        ("Góc α và góc β", "Góc an-pha và góc bê-ta"),
        ("Giá trị x ≤ 10 và y ≥ 5", "Giá trị x nhỏ hơn hoặc bằng 10 và y lớn hơn hoặc bằng 5"),
        ("Ký hiệu x ≠ 0", "Ký hiệu x khác 0"),
    ],
)
def test_math_and_symbol_normalization(input_text, expected_sub):
    res = normalize_for_tts(input_text, subject="toan-tin")
    assert expected_sub in res or res == expected_sub


def test_subject_dictionary_and_acronyms():
    # Test toan-tin acronyms
    it_text = "Hệ thống AI sử dụng mô hình ML với API kết nối GPU."
    normalized = normalize_for_tts(it_text, subject="toan-tin")
    assert "A-I" in normalized
    assert "M-L" in normalized
    assert "A-P-I" in normalized
    assert "G-P-U" in normalized

    # Test khoa-hoc-tu-nhien formulas
    chem_text = "Phản ứng giữa H2O và CO2 tạo ra sản phẩm."
    chem_norm = normalize_for_tts(chem_text, subject="khoa-hoc-tu-nhien")
    assert "H-hai-O" in chem_norm or "H 2 O" in chem_norm
    assert "C-O-hai" in chem_norm or "C O 2" in chem_norm


def test_per_project_overrides():
    custom_overrides = {
        "VieNeu": "Vi-en-nêu",
        "HyperFrames": "Hai-pơ-phờ-rem"
    }
    raw_text = "Phần mềm VieNeu và HyperFrames hỗ trợ giảng dạy."
    spoken = normalize_for_tts(raw_text, overrides=custom_overrides)
    assert "Vi-en-nêu" in spoken
    assert "Hai-pơ-phờ-rem" in spoken


def test_pronunciation_preview_endpoint():
    payload = {
        "text": "Cho hàm số f(x) = x² + 2x, với x ∈ [0, 10].",
        "subject": "toan-tin",
        "overrides": {
            "f(x)": "f của x"
        }
    }
    response = client.post("/preview-pronunciation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "original" in data
    assert "spoken" in data
    assert data["original"] == payload["text"]
    assert "bình phương" in data["spoken"]
    assert "f của x" in data["spoken"]
    assert "thuộc" in data["spoken"]
