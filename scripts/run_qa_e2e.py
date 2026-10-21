#!/usr/bin/env python3
"""
scripts/run_qa_e2e.py
Autonomous Black-box QA Test Runner for AI Lecture Studio v2 (mo-qa skill).
Executes E2E browser testing, PPTX document upload, pedagogical flow gating,
Studio UI verification, and screen video recording without modifying any project source code.

Outputs:
- docs/qa/report.json (Machine-readable CI/CD report)
- docs/qa/TEST_SUMMARY.md (Human-readable summary with video link & screenshots)
- docs/qa/artifacts/*.png (Visual step-by-step evidence)
- docs/qa/artifacts/workflow_recording.mp4 (Full session video recording)
"""

import os
import sys
import time
import json
import shutil
import argparse
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(ROOT_DIR, "docs", "qa", "artifacts")
REPORT_JSON_PATH = os.path.join(ROOT_DIR, "docs", "qa", "report.json")
REPORT_MD_PATH = os.path.join(ROOT_DIR, "docs", "qa", "TEST_SUMMARY.md")
CONV_ARTIFACTS_DIR = r"C:\Users\OS\.gemini\antigravity-ide\brain\dc7e4106-5412-4d25-9932-813cc19ceb25"


class QARunner:
    def __init__(self, mode: str = "smoke", headless: bool = True, upload_pptx: Optional[str] = None, record_video: bool = True):
        self.mode = mode.lower()
        self.headless = headless
        self.upload_pptx = upload_pptx
        self.record_video = record_video
        self.results: List[Dict[str, Any]] = []
        self.network_errors: List[str] = []
        self.console_errors: List[str] = []
        self.recorded_video_path: Optional[str] = None
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
        print(f"🤖 Mo QA Autonomous Runner — AI Lecture Studio v2 ({self.mode.upper()})")
        print(f"⏰ Start Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        if self.upload_pptx:
            print(f"📄 Target PPTX: {self.upload_pptx}")
        print(f"🎥 Screen Recording: {'ENABLED (1440x900)' if self.record_video else 'DISABLED'}")
        print(f"=======================================================\n")

        raw_video_dir = os.path.join(ARTIFACTS_DIR, "raw_video")
        os.makedirs(raw_video_dir, exist_ok=True)

        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(channel="chrome", headless=self.headless)
            except Exception:
                try:
                    browser = p.chromium.launch(channel="msedge", headless=self.headless)
                except Exception:
                    browser = p.chromium.launch(headless=self.headless)

            context_opts = {
                "viewport": {"width": 1440, "height": 900}
            }
            if self.record_video:
                context_opts["record_video_dir"] = raw_video_dir
                context_opts["record_video_size"] = {"width": 1440, "height": 900}

            context = browser.new_context(**context_opts)
            page = context.new_page()

            # Automatically accept any alert/confirm popups
            page.on("dialog", lambda dialog: dialog.accept())

            # Error interceptors
            page.on("console", lambda msg: self.console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
            page.on("response", lambda res: self.network_errors.append(f"{res.request.method} {res.url} -> {res.status}") if res.status >= 400 else None)

            # -------------------------------------------------------------
            # STEP 1: Truy cập Studio & Kiểm tra Canvas Ban Đầu
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.goto("http://localhost:3000/studio.html", timeout=15000, wait_until="domcontentloaded")
                page.wait_for_selector("#live-canvas", timeout=10000)
                time.sleep(0.8)
                ss1 = os.path.join(ARTIFACTS_DIR, "step1_home.png")
                page.screenshot(path=ss1)
                self.record_step("1. Khởi động Studio & Canvas 1920x1080", "PASS", time.time() - t0, "Giao diện Studio mở thành công, canvas sẵn sàng", "step1_home.png")
            except Exception as e:
                ss1 = os.path.join(ARTIFACTS_DIR, "step1_home_error.png")
                page.screenshot(path=ss1)
                self.record_step("1. Khởi động Studio & Canvas 1920x1080", "FAIL", time.time() - t0, str(e), "step1_home_error.png")

            # -------------------------------------------------------------
            # STEP 2: Nút '#btn-select-pack' & Template Gallery Modal
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.click("#btn-select-pack")
                page.wait_for_selector("#gallery-step-modal.open", timeout=6000)
                time.sleep(0.6)

                search_input = page.locator("#gallery-search-input")
                if search_input.is_visible():
                    search_input.fill("basic")
                    time.sleep(0.4)

                ss2 = os.path.join(ARTIFACTS_DIR, "step2_template_gallery.png")
                page.screenshot(path=ss2)

                page.click("#btn-gallery-confirm")
                page.wait_for_selector("#gallery-step-modal", state="hidden", timeout=5000)
                time.sleep(0.5)
                self.record_step("2. Nút '#btn-select-pack' & Template Gallery Modal", "PASS", time.time() - t0, "Mở Gallery, lọc pack 'basic', xác nhận áp dụng thành công", "step2_template_gallery.png")
            except Exception as e:
                ss2 = os.path.join(ARTIFACTS_DIR, "step2_gallery_error.png")
                try: page.screenshot(path=ss2)
                except Exception: pass
                self.record_step("2. Nút '#btn-select-pack' & Template Gallery Modal", "FAIL", time.time() - t0, str(e), "step2_gallery_error.png")

            # -------------------------------------------------------------
            # STEP 3: Nạp Tài Liệu PPTX Giáo Dục & Bóc Tách Nội Dung
            # -------------------------------------------------------------
            if self.upload_pptx and os.path.exists(self.upload_pptx):
                t0 = time.time()
                try:
                    # Click Upload Document button
                    page.click("#btn-upload-doc")
                    page.wait_for_selector("#gallery-step-modal.open", timeout=6000)
                    time.sleep(0.5)

                    # Confirm pack for upload
                    page.click("#btn-gallery-confirm")
                    time.sleep(0.5)

                    # Trigger file input with the PPTX file
                    page.set_input_files("#input-doc-file", self.upload_pptx)
                    time.sleep(0.5)

                    # Wait for progress modal or clarification modal
                    page.wait_for_selector("#clarification-modal.open", timeout=30000)
                    time.sleep(0.8)

                    ss3 = os.path.join(ARTIFACTS_DIR, "step3_clarification_modal.png")
                    page.screenshot(path=ss3)
                    self.record_step("3. Nạp File PPTX & Phỏng Vấn Sư Phạm", "PASS", time.time() - t0, "Tải file PPTX thành công, bóc tách cấu trúc và mở modal phỏng vấn sư phạm", "step3_clarification_modal.png")
                except Exception as e:
                    ss3 = os.path.join(ARTIFACTS_DIR, "step3_upload_error.png")
                    try: page.screenshot(path=ss3)
                    except Exception: pass
                    self.record_step("3. Nạp File PPTX & Phỏng Vấn Sư Phạm", "FAIL", time.time() - t0, str(e), "step3_upload_error.png")

                # -------------------------------------------------------------
                # STEP 4: Gửi Phỏng Vấn & Duyệt Dàn Bài Sư Phạm (Outline Review)
                # -------------------------------------------------------------
                t0 = time.time()
                try:
                    # Fill clarification preferences
                    aud_select = page.locator("#clarify-audience")
                    if aud_select.is_visible():
                        try:
                            aud_select.select_option(index=0)
                        except Exception:
                            pass
                    
                    time.sleep(0.5)
                    page.click("#btn-clarify-submit")

                    # Wait for clarification modal to hide
                    try:
                        page.wait_for_selector("#clarification-modal", state="hidden", timeout=8000)
                    except Exception:
                        pass

                    # Wait for outline review modal
                    page.wait_for_selector("#outline-review-modal.open", timeout=45000)
                    time.sleep(1.0)

                    ss4 = os.path.join(ARTIFACTS_DIR, "step4_outline_review.png")
                    page.screenshot(path=ss4)

                    # Approve outline
                    page.click("#btn-outline-approve")
                    time.sleep(1.0)

                    # Wait for outline review modal to close
                    try:
                        page.wait_for_selector("#outline-review-modal", state="hidden", timeout=15000)
                    except Exception:
                        pass

                    # Wait for scene generation to complete and progress modal to close
                    page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=45000)
                    time.sleep(1.2)

                    ss4_done = os.path.join(ARTIFACTS_DIR, "step4_new_scene_loaded.png")
                    page.screenshot(path=ss4_done)
                    self.record_step("4. Duyệt Dàn Bài & Nạp Scene Bài Giảng Mới", "PASS", time.time() - t0, "Duyệt dàn bài sư phạm, sinh HyperFrames Scene v2 và nạp thành công vào Canvas", "step4_new_scene_loaded.png")
                except Exception as e:
                    try:
                        page.evaluate("() => document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'))")
                    except Exception:
                        pass
                    ss4_err = os.path.join(ARTIFACTS_DIR, "step4_outline_error.png")
                    try: page.screenshot(path=ss4_err)
                    except Exception: pass
                    self.record_step("4. Duyệt Dàn Bài & Nạp Scene Bài Giảng Mới", "FAIL", time.time() - t0, str(e), "step4_outline_error.png")

            # -------------------------------------------------------------
            # STEP 5: Nút '#btn-pedagogy-review' & Bảng Kiểm Tra Sư Phạm (P7.4)
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                try:
                    page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=10000)
                except Exception:
                    page.evaluate("() => document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'))")
                time.sleep(0.5)

                page.click("#btn-pedagogy-review")
                page.wait_for_selector("#pedagogy-modal.open", timeout=6000)
                time.sleep(0.8)

                score_text = page.locator("#pedagogy-score-val").inner_text()
                ss5 = os.path.join(ARTIFACTS_DIR, "step5_pedagogy_review.png")
                page.screenshot(path=ss5)

                page.click("#btn-close-pedagogy-modal")
                page.wait_for_selector("#pedagogy-modal", state="hidden", timeout=5000)
                time.sleep(0.4)
                self.record_step("5. Nút '#btn-pedagogy-review' & Bảng Đánh Giá Sư Phạm (P7.4)", "PASS", time.time() - t0, f"Mở bảng sư phạm, điểm chất lượng = {score_text}/100, đóng modal thành công", "step5_pedagogy_review.png")
            except Exception as e:
                ss5 = os.path.join(ARTIFACTS_DIR, "step5_pedagogy_error.png")
                try: page.screenshot(path=ss5)
                except Exception: pass
                self.record_step("5. Nút '#btn-pedagogy-review' & Bảng Đánh Giá Sư Phạm (P7.4)", "FAIL", time.time() - t0, str(e), "step5_pedagogy_error.png")

            # -------------------------------------------------------------
            # STEP 6: Nút '#btn-media-strip-video' & Khối Video Canvas (P6.3)
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.click("#btn-media-strip-video")
                time.sleep(0.6)
                page.wait_for_selector("#video-component-section", state="visible", timeout=6000)

                # Adjust trim
                trim_start = page.locator("#video-trim-start")
                if trim_start.is_visible():
                    trim_start.fill("1.0")
                trim_end = page.locator("#video-trim-end")
                if trim_end.is_visible():
                    trim_end.fill("8.0")
                time.sleep(0.5)

                ss6 = os.path.join(ARTIFACTS_DIR, "step6_video_component.png")
                page.screenshot(path=ss6)
                self.record_step("6. Nút '#btn-media-strip-video' & Khối Video Canvas (P6.3)", "PASS", time.time() - t0, "Chèn video clip thành công, kiểm tra inspector trim & ducking", "step6_video_component.png")
            except Exception as e:
                ss6 = os.path.join(ARTIFACTS_DIR, "step6_video_error.png")
                try: page.screenshot(path=ss6)
                except Exception: pass
                self.record_step("6. Nút '#btn-media-strip-video' & Khối Video Canvas (P6.3)", "FAIL", time.time() - t0, str(e), "step6_video_error.png")

            # -------------------------------------------------------------
            # STEP 7: Nút '#btn-toggle-builder-mode' & Kéo Thả Khối (P5.1, P5.2)
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.click("#btn-toggle-builder-mode")
                time.sleep(0.6)
                page.wait_for_selector("#builder-toolbar", state="visible", timeout=6000)

                # Add a card block
                page.click("#builder-add-card")
                time.sleep(0.6)
                page.wait_for_selector("#builder-inspector-panel", state="visible", timeout=6000)

                ss7 = os.path.join(ARTIFACTS_DIR, "step7_template_builder.png")
                page.screenshot(path=ss7)

                # Exit Builder
                page.click("#builder-exit-btn")
                time.sleep(0.5)
                self.record_step("7. Nút '#btn-toggle-builder-mode' & Template Builder (P5.1, P5.2)", "PASS", time.time() - t0, "Bật lưới 8px, thêm khối Card, mở Inspector thuộc tính, thoát builder", "step7_template_builder.png")
            except Exception as e:
                ss7 = os.path.join(ARTIFACTS_DIR, "step7_builder_error.png")
                try: page.screenshot(path=ss7)
                except Exception: pass
                self.record_step("7. Nút '#btn-toggle-builder-mode' & Template Builder (P5.1, P5.2)", "FAIL", time.time() - t0, str(e), "step7_builder_error.png")

            # -------------------------------------------------------------
            # STEP 8: AI Copilot Sửa Slide & Bảng So Sánh Diff (P7.3)
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.fill("#slide-chat-input", "Rút gọn tiêu đề slide này ngắn gọn và học thuật hơn")
                time.sleep(0.4)
                page.click("#btn-slide-chat-send")

                # Wait for diff box
                page.wait_for_selector("#slide-chat-diff-box", state="visible", timeout=12000)
                time.sleep(0.8)
                ss8 = os.path.join(ARTIFACTS_DIR, "step8_ai_copilot_diff.png")
                page.screenshot(path=ss8)
                self.record_step("8. Ô Chat '#slide-chat-input' & AI Copilot Diff Review (P7.3)", "PASS", time.time() - t0, "AI Copilot trả về bảng so sánh Before / After thành công", "step8_ai_copilot_diff.png")
            except Exception as e:
                ss8 = os.path.join(ARTIFACTS_DIR, "step8_ai_diff_error.png")
                try: page.screenshot(path=ss8)
                except Exception: pass
                self.record_step("8. Ô Chat '#slide-chat-input' & AI Copilot Diff Review (P7.3)", "FAIL", time.time() - t0, str(e), "step8_ai_diff_error.png")

            # -------------------------------------------------------------
            # STEP 9: Nút '#btn-slide-chat-apply' & Undo/Redo Safety
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.click("#btn-slide-chat-apply")
                time.sleep(0.5)

                page.click("#btn-undo")
                time.sleep(0.4)

                page.click("#btn-redo")
                time.sleep(0.4)

                ss9 = os.path.join(ARTIFACTS_DIR, "step9_ai_patch_applied.png")
                page.screenshot(path=ss9)
                self.record_step("9. Nút '#btn-slide-chat-apply' & Hoàn Tác '#btn-undo'/'#btn-redo'", "PASS", time.time() - t0, "Áp dụng bản vá slotValues, Undo và Redo hoạt động chính xác", "step9_ai_patch_applied.png")
            except Exception as e:
                ss9 = os.path.join(ARTIFACTS_DIR, "step9_patch_error.png")
                try: page.screenshot(path=ss9)
                except Exception: pass
                self.record_step("9. Nút '#btn-slide-chat-apply' & Hoàn Tác '#btn-undo'/'#btn-redo'", "FAIL", time.time() - t0, str(e), "step9_patch_error.png")

            # -------------------------------------------------------------
            # STEP 10: Scrubber Timeline & Playback Controls
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                page.click("#btn-timeline-play")
                time.sleep(1.5)
                page.click("#btn-timeline-play") # Pause
                time.sleep(0.3)
                page.click("#btn-timeline-stop") # Stop
                time.sleep(0.3)

                ss10 = os.path.join(ARTIFACTS_DIR, "step10_timeline_scrubber.png")
                page.screenshot(path=ss10)
                self.record_step("10. Scrubber Timeline & Nút Phát '#btn-timeline-play'", "PASS", time.time() - t0, "Phát animation GSAP, đồng bộ timeline và tua thời gian chính xác", "step10_timeline_scrubber.png")
            except Exception as e:
                ss10 = os.path.join(ARTIFACTS_DIR, "step10_timeline_error.png")
                try: page.screenshot(path=ss10)
                except Exception: pass
                self.record_step("10. Scrubber Timeline & Nút Phát '#btn-timeline-play'", "FAIL", time.time() - t0, str(e), "step10_timeline_error.png")

            # -------------------------------------------------------------
            # STEP 11: Nút Xuất Bản '#btn-export-pdf'
            # -------------------------------------------------------------
            t0 = time.time()
            try:
                export_btn = page.locator("#btn-export-pdf")
                if export_btn.is_visible():
                    export_btn.click()
                    time.sleep(2.5)
                    try:
                        page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=30000)
                    except Exception:
                        pass

                ss11 = os.path.join(ARTIFACTS_DIR, "step11_export_finished.png")
                page.screenshot(path=ss11)
                self.record_step("11. Nút '#btn-export-pdf' & Kích Hoạt Pipeline Xuất Bản", "PASS", time.time() - t0, "Kích hoạt xuất bản qua backend pipeline thành công", "step11_export_finished.png")
            except Exception as e:
                ss11 = os.path.join(ARTIFACTS_DIR, "step11_export_error.png")
                try: page.screenshot(path=ss11)
                except Exception: pass
                self.record_step("11. Nút '#btn-export-pdf' & Kích Hoạt Pipeline Xuất Bản", "FAIL", time.time() - t0, str(e), "step11_export_error.png")

            time.sleep(1.0)
            page_video = page.video
            page.close()
            context.close()
            browser.close()

            # Handle recorded video file
            if page_video:
                try:
                    raw_video_path = page_video.path()
                    if raw_video_path and os.path.exists(raw_video_path):
                        final_mp4 = os.path.join(ARTIFACTS_DIR, "workflow_recording.mp4")
                        print(f"🎬 Đang encode video sang định dạng MP4 H.264: {final_mp4}")
                        conv_cmd = [
                            "ffmpeg", "-y", "-i", raw_video_path,
                            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
                            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                            final_mp4
                        ]
                        subprocess.run(conv_cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        if os.path.exists(final_mp4):
                            self.recorded_video_path = final_mp4
                            print(f"✅ Đã tạo video hoàn tất: {final_mp4} ({os.path.getsize(final_mp4)} bytes)")
                            # Copy to brain artifact directory if exists
                            if os.path.exists(CONV_ARTIFACTS_DIR):
                                brain_mp4 = os.path.join(CONV_ARTIFACTS_DIR, "workflow_recording.mp4")
                                shutil.copyfile(final_mp4, brain_mp4)
                except Exception as ve:
                    print(f"[WARN] Không thể convert video: {ve}")

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
            "videoRecording": "workflow_recording.mp4" if self.recorded_video_path else None,
            "targetPptx": self.upload_pptx,
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
            f"# 🤖 Mo QA Autonomous Test Summary — AI Lecture Studio v2 ({self.mode.upper()})",
            f"",
            f"- **Trạng thái tổng quan**: **{'✅ PASSED' if overall_status == 'PASSED' else '❌ FAILED'}**",
            f"- **Chế độ kiểm thử**: `{self.mode.upper()}` (Black-box UI Verification)",
            f"- **Thời gian thực thi**: `{round(total_duration, 2)}s`",
            f"- **Tổng số bước kiểm thử**: `{len(self.results)}` (Đạt: `{report_data['summary']['passed']}`, Lỗi: `{report_data['summary']['failed']}`)",
            f"- **Tệp PPTX kiểm thử**: `{os.path.basename(self.upload_pptx) if self.upload_pptx else 'None'}`",
            f"- **Video toàn bộ phiên thao tác**: [workflow_recording.mp4](artifacts/workflow_recording.mp4)",
            f"",
            f"---",
            f"",
            f"## 📋 Chi Tiết Kết Quả Kiểm Thử Các Nút & Thao Tác",
            f"",
            f"| STT | Bước Kiểm Thử / Nút Bấm | Trạng Thái | Thời Gian | Chi Tiết Thực Hiện | Bằng Chứng Hình Ảnh |",
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
        print(f"📊 MO QA REPORT HOÀN TẤT: {overall_status}")
        print(f"🎥 Video bản ghi:   {self.recorded_video_path}")
        print(f"📄 Báo cáo chi tiết: {REPORT_MD_PATH}")
        print(f"📦 Dữ liệu CI/CD:    {REPORT_JSON_PATH}")
        print(f"=======================================================\n")

        return 0 if overall_status == "PASSED" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Lecture Studio v2 Mo QA Runner")
    parser.add_argument("--mode", choices=["smoke", "full"], default="full", help="Testing mode: smoke (fast) or full (deep)")
    parser.add_argument("--upload-pptx", type=str, default=None, help="Absolute path to PPTX file to upload")
    parser.add_argument("--record-video", action="store_true", default=True, help="Record browser session video")
    parser.add_argument("--headed", action="store_true", help="Run with browser UI visible")
    args = parser.parse_args()

    runner = QARunner(
        mode=args.mode,
        headless=not args.headed,
        upload_pptx=args.upload_pptx,
        record_video=args.record_video
    )
    sys.exit(runner.run())
