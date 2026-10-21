import time
from playwright.sync_api import sync_playwright

def test_builder_save():
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        dialog_messages = []
        page.on("dialog", lambda dialog: [dialog_messages.append(dialog.message), dialog.accept()])

        print("[1] Opening Studio...")
        page.goto("http://localhost:3000/studio.html", wait_until="networkidle")
        time.sleep(1)

        print("[2] Toggle Builder Mode...")
        builder_btn = page.locator("#btn-toggle-builder-mode")
        builder_btn.click()
        time.sleep(1)

        toolbar = page.locator("#builder-toolbar")
        assert toolbar.is_visible(), "Builder toolbar not visible!"

        print("[3] Clicking Save Layout to Pack...")
        save_btn = page.locator("#builder-save-layout")
        save_btn.click()
        time.sleep(1.5)

        print(f"    Dialog count received: {len(dialog_messages)}")
        for i, m in enumerate(dialog_messages):
            safe_m = m.encode('ascii', 'replace').decode('ascii')
            print(f"    Message {i}: {safe_m}")
            assert "404" not in m, f"Found 404 in message: {safe_m}"
        
        browser.close()
        print("SUCCESS: Builder mode save endpoint verified without 404!")

if __name__ == "__main__":
    test_builder_save()
