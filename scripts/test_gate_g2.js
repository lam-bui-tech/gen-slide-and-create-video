/**
 * scripts/test_gate_g2.js
 * Integration test for Gate G2:
 * Feeds real LessonOutline produced by Track A into Track B's outline_to_hyperframes.js mapper.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { outlineToScene, sceneToHyperFramesHtml, validateOutline, validateScene } from '../outline_to_hyperframes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.dirname(__dirname);

async function runGateG2Check() {
  console.log('>>> [GATE G2] Starting integration check: Real Outline (A3) -> Mapper Engine (B2)...');

  // 1. Read sample real outline produced by Track A generator / fixture
  const outlinePath = path.join(ROOT_DIR, 'fixtures', 'outline.sample.json');
  if (!fs.existsSync(outlinePath)) {
    console.error('[GATE G2] FAIL: fixtures/outline.sample.json not found!');
    process.exit(1);
  }

  const outlineData = JSON.parse(fs.readFileSync(outlinePath, 'utf-8'));
  console.log(`[GATE G2] Step 1: Loaded outline "${outlineData.topic}" (${outlineData.slides.length} slides)`);

  // Validate outline schema
  try {
    validateOutline(outlineData);
    console.log('[GATE G2] Step 1.1: validateOutline PASSED');
  } catch (err) {
    console.error(`[GATE G2] FAIL at validateOutline: ${err.message}`, err.details || '');
    process.exit(1);
  }

  // 2. Call outlineToScene(outline)
  let scene;
  try {
    scene = outlineToScene(outlineData);
    console.log(`[GATE G2] Step 2: outlineToScene PASSED -> Generated scene with ${scene.slides.length} slides, totalDuration: ${scene.totalDurationSeconds}s`);
  } catch (err) {
    console.error(`[GATE G2] FAIL at outlineToScene: ${err.message}`);
    process.exit(1);
  }

  // Validate scene schema
  try {
    validateScene(scene);
    console.log('[GATE G2] Step 2.1: validateScene PASSED');
  } catch (err) {
    console.error(`[GATE G2] FAIL at validateScene: ${err.message}`);
    process.exit(1);
  }

  // 3. Call sceneToHyperFramesHtml(scene)
  let html;
  try {
    html = sceneToHyperFramesHtml(scene);
    console.log(`[GATE G2] Step 3: sceneToHyperFramesHtml PASSED -> Generated HTML (${html.length} chars)`);
  } catch (err) {
    console.error(`[GATE G2] FAIL at sceneToHyperFramesHtml: ${err.message}`);
    process.exit(1);
  }

  const dataStartMatches = html.match(/data-start="[^"]+"/g) || [];
  console.log('[GATE G2] Found data-start attributes:', dataStartMatches.slice(0, 5));

  // Verify critical HyperFrames invariants
  const checks = [
    { name: 'Contains <!DOCTYPE html>', pass: html.includes('<!DOCTYPE html>') },
    { name: 'Contains window.__timelines registration', pass: html.includes('window.__timelines') },
    { name: 'Contains gsap.timeline({ paused: true })', pass: html.includes('gsap.timeline({ paused: true })') },
    { name: 'Contains data-start attributes', pass: html.includes('data-start=') },
    { name: 'Contains .clip elements', pass: html.includes('class="clip"') },
    { name: 'Cumulative start time progression', pass: /data-start="0(?:\.0+)?"/.test(html) },
  ];

  let allChecksPass = true;
  for (const c of checks) {
    if (c.pass) {
      console.log(`  [PASS] ${c.name}`);
    } else {
      console.error(`  [FAIL] ${c.name}`);
      allChecksPass = false;
    }
  }

  if (allChecksPass) {
    console.log('\n>>> [GATE G2] SUCCESS: All contracts between A3 (Outline) and B2 (Mapper) match 100%! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> [GATE G2] FAIL: HyperFrames invariants not satisfied! <<<\n');
    process.exit(1);
  }
}

runGateG2Check();
