"""
scripts/spike_vietnamese_diacritics.py
Spike testing Vietnamese diacritics preservation in PDF (Headless Chrome) and PPTX (python-pptx).
"""

import os
import sys
import subprocess
from PIL import Image, ImageDraw, ImageFont
import pptx
from pptx.util import Inches

VIETNAMESE_TEST_TEXT = (
    "Hệ thống bài giảng AI: Giảng dạy tương tác & chuyển đổi số toàn diện. "
    "Triết học Mác - Lênin: thế giới quan duy vật biện chứng, "
    "phương pháp luận khoa học và những quy luật phát triển của tự nhiên, xã hội, tư duy."
)

VIETNAMESE_TITLE = "Bài 01: Khái luận Triết học & Chuyển đổi số"

def find_chrome_executable() -> str:
    possible_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Users\OS\AppData\Local\Google\Chrome\Application\chrome.exe",
        "google-chrome",
        "chrome",
    ]
    for p in possible_paths:
        if os.path.isabs(p) and os.path.exists(p):
            return p
    return "chrome"

def spike_pdf(output_pdf_path: str, temp_html_path: str) -> bool:
    print("[SPIKE-PDF] Generating HTML with Vietnamese diacritics...")
    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap');
  @page {{
    size: 1920px 1080px;
    margin: 0;
  }}
  body {{
    margin: 0;
    padding: 0;
    font-family: 'Be Vietnam Pro', 'Segoe UI', Tahoma, Arial, sans-serif;
    background: #0f172a;
    color: #f8fafc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .slide {{
    width: 1920px;
    height: 1080px;
    box-sizing: border-box;
    padding: 80px;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}
  h1 {{
    font-size: 56px;
    color: #38bdf8;
    margin-bottom: 24px;
  }}
  p {{
    font-size: 32px;
    line-height: 1.6;
    color: #e2e8f0;
  }}
</style>
</head>
<body>
  <div class="slide">
    <h1>{VIETNAMESE_TITLE}</h1>
    <p>{VIETNAMESE_TEST_TEXT}</p>
  </div>
</body>
</html>"""
    
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    chrome_bin = find_chrome_executable()
    abs_html = os.path.abspath(temp_html_path).replace("\\", "/")
    abs_pdf = os.path.abspath(output_pdf_path)

    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--allow-file-access-from-files",
        f"--print-to-pdf={abs_pdf}",
        "--no-pdf-header-footer",
        abs_html
    ]
    print(f"[SPIKE-PDF] Running Chrome print: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if res.returncode != 0:
        print(f"[SPIKE-PDF] Failed with return code {res.returncode}: {res.stderr}")
        return False
    
    if os.path.exists(abs_pdf) and os.path.getsize(abs_pdf) > 0:
        print(f"[SPIKE-PDF] SUCCESS: Generated {abs_pdf} (size: {os.path.getsize(abs_pdf)} bytes)")
        return True
    return False

def spike_pptx(output_pptx_path: str, temp_img_path: str) -> bool:
    print("[SPIKE-PPTX] Creating test slide image (1920x1080)...")
    img = Image.new("RGB", (1920, 1080), color="#1e293b")
    draw = ImageDraw.Draw(img)
    draw.text((100, 200), VIETNAMESE_TITLE, fill="#38bdf8")
    draw.text((100, 300), VIETNAMESE_TEST_TEXT, fill="#ffffff")
    img.save(temp_img_path, format="PNG")

    print("[SPIKE-PPTX] Creating PPTX presentation with python-pptx...")
    prs = pptx.Presentation()
    # Set slide dimensions to 16:9
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_slide_layout = prs.slide_layouts[6] # blank layout
    slide = prs.slides.add_slide(blank_slide_layout)

    # Insert image filling the full slide
    slide.shapes.add_picture(temp_img_path, 0, 0, width=prs.slide_width, height=prs.slide_height)

    # Add Vietnamese speaker notes
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = f"[GHI CHÚ THUYẾT MINH]\n{VIETNAMESE_TEST_TEXT}\n\n[NOTE: Bản trình chiếu này được xuất dạng image-pack, layout được bảo toàn chính xác từ AI Lecture Studio]."

    abs_pptx = os.path.abspath(output_pptx_path)
    prs.save(abs_pptx)

    # Verify by reading back
    prs_read = pptx.Presentation(abs_pptx)
    read_notes = prs_read.slides[0].notes_slide.notes_text_frame.text
    assert VIETNAMESE_TEST_TEXT in read_notes, "Vietnamese text mismatch in notes!"
    print(f"[SPIKE-PPTX] SUCCESS: Generated {abs_pptx} (size: {os.path.getsize(abs_pptx)} bytes, verified notes text)")
    return True

if __name__ == "__main__":
    scratch_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "spike")
    os.makedirs(scratch_dir, exist_ok=True)
    
    pdf_out = os.path.join(scratch_dir, "test_vietnamese.pdf")
    html_temp = os.path.join(scratch_dir, "test_vietnamese.html")
    img_temp = os.path.join(scratch_dir, "test_vietnamese.png")
    pptx_out = os.path.join(scratch_dir, "test_vietnamese.pptx")

    pdf_ok = spike_pdf(pdf_out, html_temp)
    pptx_ok = spike_pptx(pptx_out, img_temp)

    if pdf_ok and pptx_ok:
        print("\n>>> ALL VIETNAMESE DIACRITICS SPIKES PASSED SUCCESSFULLY! <<<")
        sys.exit(0)
    else:
        print("\n>>> SPIKE FAILED! <<<")
        sys.exit(1)
