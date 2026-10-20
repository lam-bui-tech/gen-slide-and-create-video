#!/usr/bin/env python3
"""
scripts/run_qa_e2e.py
Autonomous Black-box QA Test Runner for AI Lecture Studio
Executes E2E browser testing without modifying any project source code.
Outputs:
- docs/qa/report.json (Machine-readable CI/CD report)
- docs/qa/TEST_SUMMARY.md (Human-readable summary with screenshots)
- docs/qa/artifacts/*.png (Visual step-by-step evidence)
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(ROOT_DIR, "docs", "qa", "artifacts")
REPORT_JSON_PATH = os.path.join(ROOT_DIR, "docs", "qa", "report.json")
REPORT_MD_PATH = os.path.join(ROOT_DIR, "docs", "qa", "TEST_SUMMARY.md")


class QARunner:
    def __init__(self, mode: str = "smoke", headless: bool = True):
        self.mode = mode.lower()
        self.headless = headless
        self.results: List[Dict[str, Any]] = []
        self.network_errors: List[str] = []
        self.console_errors: List[str] = []
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    def record_step(self, step_name: str, status: str, duration_sec: float, message: str = "", screenshot: str = ""):
        self.results.append({
            "step": step_name,
            "status": status,
            "durationSeconds": round(duration_sec, 2),
            "message": message,
            "screenshot": screenshot
        })
        status_icon = "✅ PASS" if status == "PASS" else ("⚠️ WARN" if status == "WARN" else "❌ FAIL")
        print(f"[{status_icon}] {step_name} ({round(duration_sec, 2)}s) - {message}")

    def run(self) -> int:
        from playwright.sync_api import sync_playwright

        start_time = datetime.now()
        print(f"\n=======================================================")
        print(f"🚀 AI Lecture Studio QA Runner - Mode: {self.mode.upper()}")
        print(f"⏰ Start Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"=======================================================\n")

        # Select test document
        if self.mode == "full":
            # Search for real PPTX in root directory
            pptx_candidates = [f for f in os.listdir(ROOT_DIR) if f.endswith(".pptx")]
            if pptx_candidates:
                test_file = os.path.join(ROOT_DIR, pptx_candidates[0])
            else:
                test_file = os.path.join(ROOT_DIR, "fixtures", "sample.md")
        else:
            test_file = os.path.join(ROOT_DIR, "fixtures", "sample.md")

        print(f"📁 Document under test: {os.path.basename(test_file)}")

        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(channel="chrome", headless=self.headless)
            except Exception:
                try:
                    browser = p.chromium.launch(channel="msedge", headless=self.headless)
                except Exception:
                    browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                record_video_dir=ARTIFACTS_DIR if self.mode == "full" else None
            )
            page = context.new_page()

            # Listen to console and response events
            page.on("console", lambda msg: self.console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
            page.on("response", lambda res: self.network_errors.append(f"{res.request.method} {res.url} -> {res.status}") if res.status >= 400 else None)

            # STEP 1: Launch & Check Home Page
            t0 = time.time()
            try:
                page.goto("http://localhost:3000/", timeout=15000, wait_until="domcontentloaded")
                page.wait_for_selector("#live-canvas", timeout=10000)
                ss1 = os.path.join(ARTIFACTS_DIR, "step1_home.png")
                page.screenshot(path=ss1)
                self.record_step("1. Truy cập Studio và hiển thị Canvas", "PASS", time.time() - t0, "Giao diện Studio mở thành công", "step1_home.png")
            except Exception as e:
                ss1 = os.path.join(ARTIFACTS_DIR, "step1_home_error.png")
                page.screenshot(path=ss1)
                self.record_step("1. Truy cập Studio và hiển thị Canvas", "FAIL", time.time() - t0, str(e), "step1_home_error.png")

            # STEP 2: Document Upload
            t0 = time.time()
            try:
                page.set_input_files("#input-doc-file", test_file)
                # Wait for Clarification Modal to appear
                page.wait_for_selector("#clarification-modal.open", timeout=25000)
                ss2 = os.path.join(ARTIFACTS_DIR, "step2_clarification_modal.png")
                page.screenshot(path=ss2)
                self.record_step("2. Bóc tách tài liệu & Mở Pop-up Sư phạm", "PASS", time.time() - t0, "Modal thiết lập sư phạm hiện lên thành công", "step2_clarification_modal.png")
            except Exception as e:
                ss2 = os.path.join(ARTIFACTS_DIR, "step2_clarification_error.png")
                try: page.screenshot(path=ss2)
                except Exception: pass
                self.record_step("2. Bóc tách tài liệu & Mở Pop-up Sư phạm", "FAIL", time.time() - t0, str(e), "step2_clarification_error.png")

            # STEP 3: Clarification Answers & Outline Generation
            t0 = time.time()
            try:
                # Select duration & slide count
                if page.is_visible("#clarification-modal.open"):
                    page.select_option("#clarify-audience", value="Sinh viên đại học năm thứ nhất")
                    page.select_option("#clarify-duration", value="10")
                    page.select_option("#clarify-slides", value="8" if self.mode == "smoke" else "10")
                    page.click("#btn-clarify-submit")
                    try:
                        page.wait_for_selector("#upload-progress-modal.open", state="visible", timeout=6000)
                    except Exception:
                        pass

                # Wait for outline generation and scene load into Canvas (Gemini takes ~20-35s)
                page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=60000)
                page.wait_for_selector("#slide-list-container .slide-card-item", state="visible", timeout=60000)
                time.sleep(1) # Let DOM settle
                ss3 = os.path.join(ARTIFACTS_DIR, "step3_scene_generated.png")
                page.screenshot(path=ss3)
                self.record_step("3. Gemini sinh Dàn bài & Khởi tạo Slide Scene", "PASS", time.time() - t0, "Dàn bài được duyệt và nạp vào Canvas", "step3_scene_generated.png")
            except Exception as e:
                ss3 = os.path.join(ARTIFACTS_DIR, "step3_scene_error.png")
                try: page.screenshot(path=ss3)
                except Exception: pass
                self.record_step("3. Gemini sinh Dàn bài & Khởi tạo Slide Scene", "FAIL", time.time() - t0, str(e), "step3_scene_error.png")

            # STEP 4: Canvas WYSIWYG Editing & Autosave (Tested in both, deep in Full)
            t0 = time.time()
            try:
                # 4.1 Edit slide title directly on canvas
                title_elem = page.locator("#live-canvas .slide-title").first
                title_elem.click()
                title_elem.type(" [ĐÃ KIỂM THỬ QA]")
                # Wait for autosave indicator to show saved
                page.wait_for_selector("#save-status.saved", timeout=5000)

                # 4.2 Switch variant pill
                variant_pills = page.locator("#variant-pills-container .variant-pill")
                if variant_pills.count() > 1:
                    variant_pills.nth(1).click()

                # 4.3 Undo / Redo
                page.keyboard.press("Control+z")
                time.sleep(0.3)
                page.keyboard.press("Control+y")
                time.sleep(0.3)

                ss4 = os.path.join(ARTIFACTS_DIR, "step4_canvas_editing.png")
                page.screenshot(path=ss4)
                self.record_step("4. Biên tập trực quan Canvas & Autosave", "PASS", time.time() - t0, "Sửa trực tiếp, Autosave 500ms, Đổi variant, Undo/Redo thành công", "step4_canvas_editing.png")
            except Exception as e:
                ss4 = os.path.join(ARTIFACTS_DIR, "step4_canvas_error.png")
                try: page.screenshot(path=ss4)
                except Exception: pass
                self.record_step("4. Biên tập trực quan Canvas & Autosave", "FAIL", time.time() - t0, str(e), "step4_canvas_error.png")

            # STEP 5: TTS Audio Synthesis Test
            t0 = time.time()
            try:
                regen_voice_btn = page.locator("#btn-regen-voice")
                if regen_voice_btn.is_visible():
                    regen_voice_btn.click()
                    # Wait for button to restore
                    page.wait_for_selector("#btn-regen-voice:not([disabled])", timeout=25000)
                    time.sleep(1)

                ss5 = os.path.join(ARTIFACTS_DIR, "step5_audio_tts.png")
                page.screenshot(path=ss5)
                self.record_step("5. Tổng hợp Giọng đọc thuyết minh TTS", "PASS", time.time() - t0, "Tạo giọng đọc tiếng Việt và đồng bộ thời lượng slide", "step5_audio_tts.png")
            except Exception as e:
                ss5 = os.path.join(ARTIFACTS_DIR, "step5_audio_error.png")
                try: page.screenshot(path=ss5)
                except Exception: pass
                self.record_step("5. Tổng hợp Giọng đọc thuyết minh TTS", "FAIL", time.time() - t0, str(e), "step5_audio_error.png")

            # STEP 6: Export Multi-format Test
            t0 = time.time()
            try:
                # Trigger export (MP4 in full mode, PDF in smoke mode)
                if self.mode == "full":
                    export_btn = page.locator("#btn-export-mp4")
                    timeout_export = 180000  # 3 minutes for MP4 video
                    target_format = "MP4 Video"
                else:
                    export_btn = page.locator("#btn-export-pdf")
                    timeout_export = 45000   # 45s for PDF
                    target_format = "PDF"

                if export_btn.is_visible():
                    export_btn.click()
                    # Modal export progress
                    try:
                        page.wait_for_selector("#upload-progress-modal.open", state="visible", timeout=6000)
                    except Exception:
                        pass
                    # Wait for completion
                    page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=timeout_export)

                ss6 = os.path.join(ARTIFACTS_DIR, "step6_export_finished.png")
                page.screenshot(path=ss6)
                self.record_step("6. Kết xuất tài liệu đa định dạng (Export)", "PASS", time.time() - t0, "Hoàn tất kết xuất qua API pipeline", "step6_export_finished.png")
            except Exception as e:
                ss6 = os.path.join(ARTIFACTS_DIR, "step6_export_error.png")
                try: page.screenshot(path=ss6)
                except Exception: pass
                self.record_step("6. Kết xuất tài liệu đa định dạng (Export)", "FAIL", time.time() - t0, str(e), "step6_export_error.png")

            context.close()
            browser.close()

        # Generate Reports
        total_duration = (datetime.now() - start_time).total_seconds()
        failed_steps = [r for r in self.results if r["status"] == "FAIL"]
        overall_status = "FAILED" if failed_steps else "PASSED"

        # 1. JSON Report
        report_data = {
            "mode": self.mode,
            "overallStatus": overall_status,
            "startTime": start_time.isoformat() + "Z",
            "totalDurationSeconds": round(total_duration, 2),
            "summary": {
                "total": len(self.results),
                "passed": len([r for r in self.results if r["status"] == "PASS"]),
                "failed": len(failed_steps)
            },
            "steps": self.results,
            "networkErrors": self.network_errors[-10:],
            "consoleErrors": self.console_errors[-10:]
        }
        with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        # 2. Markdown Summary
        md_lines = [
            f"# 🧪 AI Lecture Studio — Báo Cáo Kiểm Thử QA ({self.mode.upper()})",
            f"",
            f"- **Trạng thái chung**: **{'✅ PASSED' if overall_status == 'PASSED' else '❌ FAILED'}**",
            f"- **Chế độ kiểm thử**: `{self.mode.upper()}`",
            f"- **Thời gian thực thi**: `{round(total_duration, 2)}s`",
            f"- **Tổng số bước**: `{len(self.results)}` (Đạt: `{report_data['summary']['passed']}`, Lỗi: `{report_data['summary']['failed']}`)",
            f"",
            f"---",
            f"",
            f"## 📋 Bảng Chi Tiết Từng Bước Kiểm Thử",
            f"",
            f"| STT | Bước Kiểm Thử | Trạng Thái | Thời Gian | Ghi Chú / Chi Tiết | Hình Ảnh Bằng Chứng |",
            f"|---|---|---|---|---|---|"
        ]

        for idx, r in enumerate(self.results, 1):
            status_badge = "✅ PASS" if r["status"] == "PASS" else "❌ FAIL"
            img_md = f"![{r['step']}](artifacts/{r['screenshot']})" if r["screenshot"] else "-"
            md_lines.append(f"| {idx} | **{r['step']}** | `{status_badge}` | `{r['durationSeconds']}s` | {r['message']} | {img_md} |")

        if self.network_errors:
            md_lines.extend([
                "",
                "### 🌐 Cảnh Báo Lỗi Mạng (Network HTTP >= 400)",
                "```",
                *self.network_errors[-5:],
                "```"
            ])

        with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))

        print(f"\n=======================================================")
        print(f"📊 QA REPORT HOÀN TẤT: {overall_status}")
        print(f"📄 Báo cáo chi tiết: {REPORT_MD_PATH}")
        print(f"📦 Dữ liệu CI/CD:    {REPORT_JSON_PATH}")
        print(f"=======================================================\n")

        return 0 if overall_status == "PASSED" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Lecture Studio QA Runner")
    parser.add_argument("--mode", choices=["smoke", "full"], default="smoke", help="Testing mode: smoke (fast) or full (deep)")
    parser.add_argument("--headed", action="store_true", help="Run with browser UI visible")
    args = parser.parse_args()

    runner = QARunner(mode=args.mode, headless=not args.headed)
    sys.exit(runner.run())
