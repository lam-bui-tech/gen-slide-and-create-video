"""
tests/test_integration_gates.py
Comprehensive End-to-End Integration Gates Tests (G2 -> G5)
Validates seamless interoperability between Track A (Pipeline & API) and Track B (Engine & Studio)
"""

import os
import json
import time
import subprocess
import pytest
from fastapi.testclient import TestClient

from server.api_service import app, STORAGE_DIR
from schemas.models import LessonSceneJSON

client = TestClient(app)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestIntegrationGates:

    @pytest.fixture(scope="class", autouse=True)
    def setup_e2e_project(self):
        # 1. Initialize project
        res = client.post("/projects", json={"title": "E2E Triết học Mác - Lênin"})
        assert res.status_code == 201
        proj_id = res.json()["projectId"]

        # 2. Upload document
        md_path = os.path.join(ROOT_DIR, "fixtures", "sample.md")
        with open(md_path, "rb") as f:
            res_doc = client.post(
                f"/projects/{proj_id}/documents",
                files={"file": ("sample.md", f, "text/markdown")}
            )
        assert res_doc.status_code == 200

        # 3. Clarification answers
        client.post(
            f"/projects/{proj_id}/clarification",
            json={"answers": {"targetAudience": "Sinh viên năm 1", "slideCount": 10, "durationMinutes": 15}}
        )

        return proj_id

    def test_gate_g2_outline_to_hyperframes_mapper(self, setup_e2e_project):
        """
        Gate G2: Real Outline produced by Track A -> Track B's outline_to_hyperframes.js mapper
        """
        proj_id = setup_e2e_project

        # Step A3: Generate Outline from backend
        res_outline = client.post(f"/projects/{proj_id}/outline")
        assert res_outline.status_code == 200
        outline = res_outline.json()

        # Save outline to temp json file for Node runner
        temp_outline_path = os.path.join(STORAGE_DIR, proj_id, "test_gate_g2_outline.json")
        with open(temp_outline_path, "w", encoding="utf-8") as f:
            json.dump(outline, f, ensure_ascii=False)

        # Call outline_to_hyperframes.js via Node
        mapper_abs_path = os.path.join(ROOT_DIR, "outline_to_hyperframes.js").replace("\\", "/")
        node_script = f"""
        import fs from 'fs';
        import {{ pathToFileURL }} from 'url';

        const mapperUrl = pathToFileURL("{mapper_abs_path}").href;
        const {{ outlineToScene, sceneToHyperFramesHtml, validateOutline, validateScene }} = await import(mapperUrl);

        const raw = JSON.parse(fs.readFileSync({json.dumps(temp_outline_path)}, 'utf-8'));
        validateOutline(raw);
        const scene = outlineToScene(raw);
        validateScene(scene);
        const html = sceneToHyperFramesHtml(scene);

        if (!html.includes('window.__timelines')) process.exit(2);
        if (!html.includes('class="clip"')) process.exit(3);
        if (!html.includes('data-start=')) process.exit(4);
        console.log('GATE_G2_SUCCESS: ' + scene.slides.length + ' slides, ' + html.length + ' chars');
        """
        temp_js_path = os.path.join(STORAGE_DIR, proj_id, "run_g2.mjs")
        with open(temp_js_path, "w", encoding="utf-8") as f:
            f.write(node_script)

        try:
            res = subprocess.run(
                ["node", temp_js_path],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True,
                timeout=15,
            )
            assert res.returncode == 0, f"Node mapper failed: {res.stderr}\nOutput: {res.stdout}"
            assert "GATE_G2_SUCCESS" in res.stdout
        finally:
            for p in [temp_outline_path, temp_js_path]:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass

    def test_gate_g3_studio_autosave_lifecycle(self, setup_e2e_project):
        """
        Gate G3: Studio Canvas Direct Editing -> PUT /projects/{id}/scene Autosave -> GET /projects/{id}/scene
        """
        proj_id = setup_e2e_project

        # Approve outline
        res_outline = client.get(f"/projects/{proj_id}/outline")
        outline = res_outline.json()
        outline["status"] = "approved"
        res_appr = client.put(f"/projects/{proj_id}/outline", json=outline)
        assert res_appr.status_code == 200

        # Generate Scene
        res_scene = client.post(f"/projects/{proj_id}/scene")
        assert res_scene.status_code in [200, 201]
        scene = res_scene.json()

        # Simulate Studio direct canvas edit: modify title and layoutVariant
        modified_title = "Vật chất và Ý thức: Nền tảng Thế giới quan Duy vật (Đã sửa từ Studio)"
        scene["slides"][0]["title"] = modified_title
        scene["slides"][0]["layoutVariant"] = "fullscreen"

        # Call Autosave PUT /projects/{id}/scene
        res_save = client.put(f"/projects/{proj_id}/scene", json=scene)
        assert res_save.status_code == 200
        assert res_save.json()["status"] == "saved"

        # Verify persistence via GET /projects/{id}/scene
        res_verify = client.get(f"/projects/{proj_id}/scene")
        assert res_verify.status_code == 200
        saved_scene = res_verify.json()
        assert saved_scene["slides"][0]["title"] == modified_title
        assert saved_scene["slides"][0]["layoutVariant"] == "fullscreen"

    def test_gate_g4_voice_regeneration_and_timeline_sync(self, setup_e2e_project):
        """
        Gate G4: Studio Voice UI -> Audio Synthesis -> Audio-First Timeline Sync
        """
        proj_id = setup_e2e_project

        # 1. Regenerate narration via LLM
        res_narr = client.post(
            f"/projects/{proj_id}/slides/slide-01/narration",
            json={"instruction": "Giải thích ngắn gọn, dễ hiểu cho sinh viên năm nhất."}
        )
        assert res_narr.status_code == 200
        new_narration = res_narr.json()["narration"]
        assert len(new_narration) > 0

        # 2. Synthesize audio via VieNeu-TTS
        res_audio = client.post(
            f"/projects/{proj_id}/slides/slide-01/audio",
            json={"narration": new_narration, "voiceId": "MyDuyen"}
        )
        assert res_audio.status_code == 200
        audio_data = res_audio.json()
        assert "audioUrl" in audio_data
        assert audio_data["durationSeconds"] > 0
        assert audio_data["timelineShift"]["subsequentStartTimesUpdated"] is True

        # Verify updated scene duration
        res_scene = client.get(f"/projects/{proj_id}/scene")
        assert res_scene.status_code == 200
        scene = res_scene.json()
        assert scene["slides"][0]["voice"]["audioUrl"] == audio_data["audioUrl"]
        assert scene["slides"][0]["voice"]["durationSeconds"] == audio_data["durationSeconds"]

    def test_gate_g5_export_from_studio_scene(self, setup_e2e_project):
        """
        Gate G5: Export MP4, PDF, and PPTX from the scene saved by Studio
        """
        proj_id = setup_e2e_project

        # 1. Trigger PDF export
        res_pdf = client.post(f"/projects/{proj_id}/export", json={"type": "pdf"})
        assert res_pdf.status_code == 202
        pdf_job_id = res_pdf.json()["exportId"]

        # 2. Trigger PPTX export
        res_pptx = client.post(f"/projects/{proj_id}/export", json={"type": "pptx"})
        assert res_pptx.status_code == 202
        pptx_job_id = res_pptx.json()["exportId"]

        # Poll PDF job
        for _ in range(20):
            res_st = client.get(f"/exports/{pdf_job_id}")
            if res_st.json()["status"] in ["completed", "failed"]:
                break
            time.sleep(0.5)

        pdf_job = client.get(f"/exports/{pdf_job_id}").json()
        assert pdf_job["status"] == "completed", f"PDF export failed: {pdf_job}"
        assert pdf_job["downloadUrl"] is not None

        # Verify file download
        res_dl = client.get(pdf_job["downloadUrl"])
        assert res_dl.status_code == 200
        assert len(res_dl.content) > 1000

        # Poll PPTX job
        for _ in range(20):
            res_st = client.get(f"/exports/{pptx_job_id}")
            if res_st.json()["status"] in ["completed", "failed"]:
                break
            time.sleep(0.5)

        pptx_job = client.get(f"/exports/{pptx_job_id}").json()
        assert pptx_job["status"] == "completed", f"PPTX export failed: {pptx_job}"
        assert pptx_job["downloadUrl"] is not None
