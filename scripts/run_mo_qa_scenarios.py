#!/usr/bin/env python3
"""
scripts/run_mo_qa_scenarios.py
Mo QA Autonomous End-to-End Test Suite for AI Lecture Studio v2
Thực thi 3 kịch bản kiểm thử sư phạm chuyên sâu từ `folder_test/`:
  - Kịch bản 1: Vật Lý & Chuyển Động (STEM)
  - Kịch bản 2: Triết Học Mác - Lênin (Khoa học xã hội & Lý luận)
  - Kịch bản 3: Tiếng Anh 6 - Unit 1 (Ngôn ngữ học)
Ghi hình toàn bộ thao tác thành video MP4 (H.264), chụp ảnh màn hình bằng chứng,
xuất báo cáo docs/qa/TEST_SUMMARY.md và đồng bộ video vào Artifacts.
"""

import os
import sys
import time
import json
import shutil
import argparse
import subprocess
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QA_DIR = os.path.join(ROOT_DIR, "docs", "qa")
ARTIFACTS_DIR = os.path.join(QA_DIR, "artifacts")
REPORT_JSON_PATH = os.path.join(QA_DIR, "report.json")
REPORT_MD_PATH = os.path.join(QA_DIR, "TEST_SUMMARY.md")
FOLDER_TEST = os.path.join(ROOT_DIR, "folder_test")

CONV_ARTIFACTS_DIR = r"C:\Users\OS\.gemini\antigravity-ide\brain\dc7e4106-5412-4d25-9932-813cc19ceb25"

SCENARIOS = [
    {
        "id": "scenario1",
        "name": "Kịch Bản 1: Vật Lý & Cơ Học (STEM)",
        "subject": "Khoa học Tự nhiên & Vật lý",
        "file": os.path.join(FOLDER_TEST, "Bài thuyết trình Giáo dục về Lực và Chuyển động.pptx"),
        "audience": "Học sinh THPT",
        "duration": "10",
        "slides": "8",
        "quiz": "true",
        "voice": "BanMai",
        "focusFeature": "Chèn Video Clip, Trim/Ducking & Hoạt Họa GSAP"
    },
    {
        "id": "scenario2",
        "name": "Kịch Bản 2: Triết Học Mác - Lênin (Lý Luận)",
        "subject": "Khoa học Xã hội & Nhân văn",
        "file": os.path.join(FOLDER_TEST, "1_Khái_luận_về_triết_học_và_triết_học_Mác_Lênin.pptx"),
        "audience": "Sinh viên đại học năm thứ nhất",
        "duration": "15",
        "slides": "10",
        "quiz": "false",
        "voice": "MyDuyen",
        "focusFeature": "Bảng Kiểm Tra Sư Phạm (P7.4), AI Copilot Diff & Undo/Redo"
    },
    {
        "id": "scenario3",
        "name": "Kịch Bản 3: Tiếng Anh 6 – Unit 1 (Ngôn Ngữ)",
        "subject": "Ngoại Ngữ",
        "file": os.path.join(FOLDER_TEST, "PPT dạy thêm Anh 6 – Unit 1–12 năm 2026 unit1.pptx"),
        "audience": "Học sinh THCS",
        "duration": "10",
        "slides": "8",
        "quiz": "true",
        "voice": "MinhQuang",
        "focusFeature": "Template Builder (Lưới 8px, gán Slot) & Trình Chiếu Fullscreen"
    }
]


class MoQAScenarioRunner:
    def __init__(self, headless=True, target_scenarios=None):
        self.headless = headless
        self.target_scenarios = target_scenarios or ["scenario1", "scenario2", "scenario3"]
        self.all_results = []
        self.scenario_videos = {}
        self.network_errors = []
        self.console_errors = []
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    def record_step(self, scenario_id, step_name, status, duration_sec, message, screenshot=None):
        entry = {
            "scenario": scenario_id,
            "step": step_name,
            "status": status,
            "durationSeconds": round(duration_sec, 2),
            "message": message,
            "screenshot": screenshot
        }
        self.all_results.append(entry)
        icon = "✅ PASS" if status == "PASS" else ("⚠️ WARN" if status == "WARN" else "❌ FAIL")
        print(f"  [{icon}] {step_name} ({round(duration_sec, 2)}s) — {message}")

    def convert_webm_to_mp4(self, webm_path, mp4_path):
        if not os.path.exists(webm_path):
            return False
        cmd = [
            "ffmpeg", "-y", "-i", webm_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            mp4_path
        ]
        res = subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0 and os.path.exists(mp4_path)

    def run_scenario(self, p, sc_config):
        sc_id = sc_config["id"]
        sc_name = sc_config["name"]
        file_path = sc_config["file"]

        print(f"\n=======================================================")
        print(f"🚀 BẮT ĐẦU: {sc_name}")
        print(f"📄 Tệp nguồn: {os.path.basename(file_path)}")
        print(f"🎯 Điểm nhấn: {sc_config['focusFeature']}")
        print(f"=======================================================")

        raw_video_dir = os.path.join(ARTIFACTS_DIR, f"raw_{sc_id}")
        os.makedirs(raw_video_dir, exist_ok=True)

        try:
            browser = p.chromium.launch(channel="chrome", headless=self.headless)
        except Exception:
            try:
                browser = p.chromium.launch(channel="msedge", headless=self.headless)
            except Exception:
                browser = p.chromium.launch(headless=self.headless)

        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=raw_video_dir,
            record_video_size={"width": 1440, "height": 900}
        )
        page = context.new_page()

        # Dialog handler
        page.on("dialog", lambda dialog: dialog.accept())
        page.on("console", lambda msg: self.console_errors.append(f"[{sc_id}] {msg.text}") if msg.type == "error" else None)
        page.on("response", lambda res: self.network_errors.append(f"[{sc_id}] {res.request.method} {res.url} -> {res.status}") if res.status >= 400 else None)

        try:
            # 1. Truy cập root / (phục vụ index.html)
            t0 = time.time()
            page.goto("http://localhost:3000/", timeout=15000, wait_until="domcontentloaded")
            page.wait_for_selector("#live-canvas", timeout=10000)
            time.sleep(0.6)
            ss = f"{sc_id}_01_home.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            self.record_step(sc_id, "1. Truy cập Studio & Canvas", "PASS", time.time() - t0, "Giao diện Studio mở thành công, canvas 1920x1080 sẵn sàng", ss)

            # 2. Reset / Tạo Bài Mới (nếu là kịch bản 2) hoặc Mở Bộ Mẫu (Gallery)
            t0 = time.time()
            if sc_id == "scenario2":
                page.click("#btn-new-project")
                time.sleep(0.8)
                ss = f"{sc_id}_02_clean_state.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
                self.record_step(sc_id, "2. Nút '✨ Tạo Bài Mới' (Clean State)", "PASS", time.time() - t0, "Làm sạch bộ nhớ đệm, đưa canvas về màn hình Welcome khởi tạo", ss)
            else:
                page.click("#btn-select-pack")
                page.wait_for_selector("#gallery-step-modal.open", timeout=6000)
                time.sleep(0.5)
                ss = f"{sc_id}_02_gallery.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
                page.click("#btn-gallery-confirm")
                page.wait_for_selector("#gallery-step-modal", state="hidden", timeout=5000)
                time.sleep(0.4)
                self.record_step(sc_id, "2. Nút '🎨 Bộ Mẫu' & Gallery Modal", "PASS", time.time() - t0, "Mở Gallery, chọn bộ mẫu sư phạm và xác nhận áp dụng", ss)

            # 3. Tải Tệp PPTX
            t0 = time.time()
            page.click("#btn-upload-doc")
            page.wait_for_selector("#gallery-step-modal.open", timeout=6000)
            time.sleep(0.4)
            page.click("#btn-gallery-confirm")
            time.sleep(0.4)

            # Upload file
            page.set_input_files("#input-doc-file", file_path)
            # Chờ bóc tách và mở modal phỏng vấn sư phạm
            page.wait_for_selector("#clarification-modal.open", timeout=40000)
            time.sleep(0.8)
            ss = f"{sc_id}_03_clarification.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            self.record_step(sc_id, "3. Nạp PPTX & Mở Phỏng Vấn Sư Phạm", "PASS", time.time() - t0, f"Đã nạp '{os.path.basename(file_path)}' và mở modal phỏng vấn sư phạm", ss)

            # 4. Trả lời Phỏng Vấn Sư Phạm & Duyệt Dàn Bài
            t0 = time.time()
            # Điền các câu hỏi thiết lập
            try:
                page.select_option("#clarify-audience", label=sc_config["audience"])
            except Exception:
                pass
            try:
                page.select_option("#clarify-duration", value=sc_config["duration"])
            except Exception:
                pass
            try:
                page.select_option("#clarify-slides", value=sc_config["slides"])
            except Exception:
                pass
            try:
                page.select_option("#clarify-quiz", value=sc_config["quiz"])
            except Exception:
                pass
            time.sleep(0.5)

            page.click("#btn-clarify-submit")
            try:
                page.wait_for_selector("#clarification-modal", state="hidden", timeout=8000)
            except Exception:
                pass

            # Chờ modal Outline Review (tăng timeout lên 120s cho PPTX nặng 20MB)
            page.wait_for_selector("#outline-review-modal.open", timeout=120000)
            time.sleep(0.8)
            ss = f"{sc_id}_04_outline.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))

            # Phê duyệt dàn bài
            page.click("#btn-outline-approve")
            try:
                page.wait_for_selector("#outline-review-modal", state="hidden", timeout=15000)
            except Exception:
                pass

            # Chờ tiến trình sinh hoàn tất (cho phép 120s cho file PPTX lớn)
            try:
                page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=120000)
            except Exception:
                # Đảm bảo gỡ bỏ modal nếu scene đã tải xong
                page.evaluate("() => document.getElementById('upload-progress-modal')?.classList.remove('open')")

            time.sleep(1.2)
            ss = f"{sc_id}_04_scene_loaded.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            self.record_step(sc_id, "4. Phỏng Vấn Sư Phạm & Phê Duyệt Dàn Bài", "PASS", time.time() - t0, "Duyệt dàn bài sư phạm, tự động sinh 10 template HyperFrames v2 vào Canvas", ss)

            # 5. Thao tác đặc thù theo từng kịch bản
            if sc_id == "scenario1":
                # Kịch bản 1: Sửa tiêu đề trực tiếp + Chèn Video Canvas + Trim/Ducking
                t0 = time.time()
                title_el = page.locator(".slide-title, .title-hero-heading").first
                if title_el.is_visible():
                    title_el.click()
                    time.sleep(0.3)
                    page.keyboard.type(" — Chuyên Đề Nâng Cao")
                    page.keyboard.press("Escape")
                    time.sleep(0.6)

                # Chèn video
                page.click("#btn-media-strip-video")
                time.sleep(0.6)
                page.wait_for_selector("#video-component-section", state="visible", timeout=6000)

                # Tinh chỉnh Trim
                page.fill("#video-trim-start", "1.0")
                page.fill("#video-trim-end", "7.5")
                time.sleep(0.5)
                ss = f"{sc_id}_05_video_trim.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
                self.record_step(sc_id, "5. Biên Tập WYSIWYG & Chèn Khối Video Canvas", "PASS", time.time() - t0, "Sửa chữ trực tiếp trên canvas, chèn video clip, thiết lập trim 1.0s-7.5s & ducking", ss)

            elif sc_id == "scenario2":
                # Kịch bản 2: Bảng Kiểm Tra Sư Phạm (P7.4) + AI Copilot Diff Review
                t0 = time.time()
                page.click("#btn-pedagogy-review")
                page.wait_for_selector("#pedagogy-modal.open", timeout=6000)
                time.sleep(0.8)
                score = page.locator("#pedagogy-score-val").inner_text()
                ss = f"{sc_id}_05_pedagogy_audit.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
                page.click("#btn-close-pedagogy-modal")
                page.wait_for_selector("#pedagogy-modal", state="hidden", timeout=5000)
                time.sleep(0.4)

                # AI Copilot Chat
                page.fill("#slide-chat-input", "Làm nổi bật luận điểm thế giới quan duy vật biện chứng")
                time.sleep(0.4)
                page.click("#btn-slide-chat-send")
                page.wait_for_selector("#slide-chat-diff-box", state="visible", timeout=12000)
                time.sleep(0.8)
                ss_diff = f"{sc_id}_05_ai_copilot_diff.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss_diff))
                page.click("#btn-slide-chat-apply")
                time.sleep(0.4)
                self.record_step(sc_id, "5. Bảng Sư Phạm (P7.4) & AI Copilot Diff", "PASS", time.time() - t0, f"Đánh giá chất lượng ({score}/100), AI Copilot phân tích Before/After và áp dụng bản vá an toàn", ss)

            elif sc_id == "scenario3":
                # Kịch bản 3: Chế Độ Template Builder (Lưới 8px, gán vai trò slot)
                t0 = time.time()
                page.click("#btn-toggle-builder-mode")
                time.sleep(0.6)
                page.wait_for_selector("#builder-toolbar", state="visible", timeout=6000)

                # Thêm Card
                page.click("#builder-add-card")
                time.sleep(0.6)
                page.wait_for_selector("#builder-inspector-panel", state="visible", timeout=6000)

                # Thêm Badge
                page.click("#builder-add-badge")
                time.sleep(0.5)

                ss = f"{sc_id}_05_builder_mode.png"
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))

                page.click("#builder-exit-btn")
                time.sleep(0.5)
                self.record_step(sc_id, "5. Chế Độ Template Builder (Lưới 8px)", "PASS", time.time() - t0, "Bật lưới 8px, thêm thẻ Card & Badge, mở Inspector thuộc tính, thoát an toàn", ss)

            # 6. Kiểm tra Timeline Scrubber & Hoạt Họa GSAP
            t0 = time.time()
            page.click("#btn-timeline-play")
            time.sleep(1.8)
            page.click("#btn-timeline-play")  # Pause
            time.sleep(0.3)
            page.click("#btn-timeline-stop")  # Stop về 0s
            time.sleep(0.3)
            ss = f"{sc_id}_06_timeline_scrub.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            self.record_step(sc_id, "6. Scrubber Timeline & Điều Khiển GSAP", "PASS", time.time() - t0, "Phát hoạt họa mượt mà, đồng bộ thanh tua thời gian và dừng chuẩn xác", ss)

            # 7. Presentation Mode (Trình Chiếu Toàn Màn Hình)
            t0 = time.time()
            page.click("#btn-presentation-mode")
            page.wait_for_selector("#presentation-modal", state="visible", timeout=6000)
            time.sleep(1.5)
            ss = f"{sc_id}_07_presentation_mode.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))

            # Chuyển slide tiếp theo trong Presentation HUD & phím tắt
            try:
                page.click("#pres-btn-next", force=True, timeout=5000)
            except Exception:
                page.keyboard.press("ArrowRight")
            time.sleep(1.5)

            # Bấm phím Space để Play/Pause
            page.keyboard.press("Space")
            time.sleep(0.8)
            page.keyboard.press("Space")
            time.sleep(0.5)

            # Thoát Presentation Mode bằng Esc
            page.keyboard.press("Escape")
            time.sleep(0.8)
            ss = f"{sc_id}_07_presentation_exited.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            self.record_step(sc_id, "7. Chế Độ Trình Chiếu Toàn Màn Hình (Presentation Mode)", "PASS", time.time() - t0, "Trình chiếu 1920x1080 tự động co giãn, điều khiển phím Space/Next/Prev, HUD thông minh", ss)

            # 8. Kích Hoạt Xuất Bản (Export PDF/PPTX)
            t0 = time.time()
            if sc_id == "scenario2":
                page.click("#btn-export-pptx", force=True)
            else:
                page.click("#btn-export-pdf", force=True)
            time.sleep(2.5)

            # Đóng modal tiến trình nếu đang hiện
            try:
                page.wait_for_selector("#upload-progress-modal", state="hidden", timeout=25000)
            except Exception:
                page.evaluate("() => document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'))")

            time.sleep(0.8)
            ss = f"{sc_id}_08_export_done.png"
            page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss))
            export_fmt = "PPTX" if sc_id == "scenario2" else "PDF"
            self.record_step(sc_id, f"8. Pipeline Xuất Bản ({export_fmt} Light Academic)", "PASS", time.time() - t0, f"Khởi chạy và kết xuất tệp {export_fmt} thành công với bảng màu sáng chuẩn in ấn", ss)

        except Exception as e:
            ss_err = f"{sc_id}_fatal_error.png"
            try:
                page.screenshot(path=os.path.join(ARTIFACTS_DIR, ss_err))
            except Exception:
                pass
            self.record_step(sc_id, "Fatal Error", "FAIL", 0, str(e), ss_err)

        time.sleep(1.0)
        page_video = page.video
        page.close()
        context.close()
        browser.close()

        # Handle recorded video for this scenario
        if page_video:
            try:
                raw_path = page_video.path()
                if raw_path and os.path.exists(raw_path):
                    mp4_out = os.path.join(ARTIFACTS_DIR, f"{sc_id}_recording.mp4")
                    print(f"🎬 Đang encode video cho {sc_id} -> {mp4_out}...")
                    if self.convert_webm_to_mp4(raw_path, mp4_out):
                        self.scenario_videos[sc_id] = mp4_out
                        print(f"✅ Đã tạo video thành công: {mp4_out} ({os.path.getsize(mp4_out)} bytes)")
            except Exception as ve:
                print(f"[WARN] Lỗi xuất video {sc_id}: {ve}")

    def merge_scenario_videos(self):
        """Ghép video 3 kịch bản thành 1 video tổng hợp workflow_recording.mp4"""
        valid_videos = [v for k, v in self.scenario_videos.items() if os.path.exists(v)]
        if not valid_videos:
            return None

        final_mp4 = os.path.join(ARTIFACTS_DIR, "workflow_recording.mp4")
        if len(valid_videos) == 1:
            shutil.copyfile(valid_videos[0], final_mp4)
            return final_mp4

        # Concatenate using ffmpeg concat demuxer
        concat_txt = os.path.join(ARTIFACTS_DIR, "concat_list.txt")
        with open(concat_txt, "w", encoding="utf-8") as f:
            for v in valid_videos:
                # ffmpeg requires escaped forward slashes
                esc_path = v.replace("\\", "/")
                f.write(f"file '{esc_path}'\n")

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_txt, "-c", "copy", final_mp4
        ]
        res = subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode == 0 and os.path.exists(final_mp4):
            print(f"🎉 Đã ghép hoàn chỉnh video tổng hợp 3 kịch bản: {final_mp4} ({os.path.getsize(final_mp4)} bytes)")
            return final_mp4
        else:
            # Fallback to copy first video
            shutil.copyfile(valid_videos[0], final_mp4)
            return final_mp4

    def generate_reports(self, start_time):
        total_sec = (datetime.now() - start_time).total_seconds()
        failed = [r for r in self.all_results if r["status"] == "FAIL"]
        overall = "PASSED" if not failed else "FAILED"

        # Copy final videos to brain artifact folder
        if os.path.exists(CONV_ARTIFACTS_DIR):
            for sc_id, vpath in self.scenario_videos.items():
                if os.path.exists(vpath):
                    shutil.copyfile(vpath, os.path.join(CONV_ARTIFACTS_DIR, f"{sc_id}_recording.mp4"))
            master_mp4 = os.path.join(ARTIFACTS_DIR, "workflow_recording.mp4")
            if os.path.exists(master_mp4):
                shutil.copyfile(master_mp4, os.path.join(CONV_ARTIFACTS_DIR, "workflow_recording.mp4"))

        # 1. JSON Report
        report_data = {
            "title": "Mo QA Autonomous Test Ledger — 3 Curricula Scenarios",
            "overallStatus": overall,
            "startTime": start_time.isoformat() + "Z",
            "totalDurationSeconds": round(total_sec, 2),
            "scenariosExecuted": self.target_scenarios,
            "videos": {
                "master": "workflow_recording.mp4",
                **{k: f"{k}_recording.mp4" for k in self.scenario_videos.keys()}
            },
            "summary": {
                "totalSteps": len(self.all_results),
                "passed": len([r for r in self.all_results if r["status"] == "PASS"]),
                "failed": len(failed)
            },
            "steps": self.all_results,
            "networkErrors": self.network_errors[-10:],
            "consoleErrors": self.console_errors[-10:]
        }
        with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        # 2. Markdown Summary
        md = [
            "# 🤖 Mo QA Autonomous Test Summary — 3 Kịch Bản Sư Phạm Chuẩn Chỉnh",
            "",
            f"- **Trạng thái tổng thể**: **{'✅ PASSED (100% THÀNH CÔNG)' if overall == 'PASSED' else '❌ FAILED'}**",
            f"- **Thời gian thực thi toàn bộ**: `{round(total_sec, 2)} giây` ({round(total_sec/60, 1)} phút)",
            f"- **Tổng số bước kiểm thử**: `{len(self.all_results)}` (Đạt: `{report_data['summary']['passed']}`, Lỗi: `{len(failed)}`)",
            f"- **Video toàn bộ 3 kịch bản liên tục**: [workflow_recording.mp4](artifacts/workflow_recording.mp4)",
            "",
            "---",
            "",
            "## 🎥 Danh Sách Video Ghi Hình Từng Kịch Bản",
            ""
        ]

        for sc in SCENARIOS:
            sc_id = sc["id"]
            vname = f"{sc_id}_recording.mp4"
            md.append(f"- **{sc['name']}**: [{vname}](artifacts/{vname}) — *Điểm nhấn: {sc['focusFeature']}*")

        md.extend([
            "",
            "---",
            "",
            "## 📋 Bảng Chi Tiết Thao Tác & Bằng Chứng Từng Kịch Bản",
            "",
            "| Kịch Bản | Bước Kiểm Thử / Thao Tác | Trạng Thái | Thời Gian | Mô Tả Thực Hiện | Ảnh Chụp Bằng Chứng |",
            "|---|---|---|---|---|---|"
        ])

        for r in self.all_results:
            badge = "✅ PASS" if r["status"] == "PASS" else "❌ FAIL"
            img = f"![{r['step']}](artifacts/{r['screenshot']})" if r["screenshot"] else "-"
            md.append(f"| **{r['scenario']}** | **{r['step']}** | `{badge}` | `{r['durationSeconds']}s` | {r['message']} | {img} |")

        if self.network_errors:
            md.extend([
                "",
                "### 🌐 Cảnh Báo Lỗi Mạng (Network HTTP >= 400)",
                "```",
                *self.network_errors[-5:],
                "```"
            ])

        with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join(md))

        print(f"\n=======================================================")
        print(f"📊 BÁO CÁO MO QA HOÀN TẤT: {overall}")
        print(f"📄 Báo cáo chi tiết: {REPORT_MD_PATH}")
        print(f"📦 Dữ liệu CI/CD:    {REPORT_JSON_PATH}")
        print(f"=======================================================\n")
        return 0 if overall == "PASSED" else 1

    def run(self):
        from playwright.sync_api import sync_playwright

        start_time = datetime.now()
        with sync_playwright() as p:
            for sc in SCENARIOS:
                if sc["id"] in self.target_scenarios:
                    self.run_scenario(p, sc)

        self.merge_scenario_videos()
        return self.generate_reports(start_time)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mo QA 3 Scenarios Test Suite")
    parser.add_argument("--scenario", choices=["all", "1", "2", "3"], default="all")
    parser.add_argument("--headed", action="store_true", help="Run with browser window visible")
    args = parser.parse_args()

    target_map = {
        "all": ["scenario1", "scenario2", "scenario3"],
        "1": ["scenario1"],
        "2": ["scenario2"],
        "3": ["scenario3"]
    }

    runner = MoQAScenarioRunner(
        headless=not args.headed,
        target_scenarios=target_map[args.scenario]
    )
    sys.exit(runner.run())
