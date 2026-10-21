import time
import os
from playwright.sync_api import sync_playwright

def verify_studio_fixes():
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        print("[1] Opening http://localhost:3000/studio.html...")
        page.goto("http://localhost:3000/studio.html", wait_until="networkidle")
        time.sleep(1)

        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGEERROR: {err}"))
        page.on("dialog", lambda dialog: dialog.accept())

        # Test 1: Bấm nút Tạo Bài Mới
        print("[2] Testing 'Tao Bai Moi' button...")
        new_proj_btn = page.locator("#btn-new-project")
        assert new_proj_btn.is_visible(), "Button #btn-new-project not visible!"
        new_proj_btn.click()
        time.sleep(1)

        title_val = page.locator("#project-title-input").input_value()
        print(f"    Current project title: '{title_val}'")
        assert "Welcome" in title_val, f"Title does not contain Welcome: {title_val}"

        # Test 2: Kiểm tra Animation Presets
        print("[3] Testing 1-click Animation Presets...")
        quick_anim_btn = page.locator(".btn-quick-anim").first
        assert quick_anim_btn.is_visible(), "Quick animation button not visible!"
        quick_anim_btn.click()
        time.sleep(0.5)
        
        anims_count = page.locator(".anim-row").count()
        print(f"    Animations count on slide: {anims_count}")
        assert anims_count > 0, "No animation added!"

        # Test 3: Kiểm tra Layout Variant
        print("[4] Testing Layout Variant switching...")
        variant_pill = page.locator(".variant-pill[data-variant='stacked-top']")
        variant_pill.click()
        time.sleep(0.5)
        
        slide_root = page.locator("#live-canvas .hf-template-title-slide")
        classes = slide_root.get_attribute("class")
        print(f"    Classes on slide root: '{classes}'")
        assert "variant-stacked-top" in classes, "Variant stacked-top not applied!"

        # Chụp ảnh xác thực
        os.makedirs("docs/qa/artifacts", exist_ok=True)
        screenshot_path = "docs/qa/artifacts/verified_welcome_and_fixes.png"
        page.screenshot(path=screenshot_path)
        print(f"[5] Saved verification screenshot at: {screenshot_path}")

        browser.close()
        print("SUCCESS: ALL STUDIO FIXES VERIFIED!")

if __name__ == "__main__":
    verify_studio_fixes()
