/**
 * scripts/build_hyperframes.js
 * Tự động cập nhật mốc thời gian (timeline), thời lượng và kịch bản thuyết minh
 * trong file index.html từ dữ liệu lecture.json và audio/durations.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function syncHyperframesTimeline() {
  const lecturePath = path.join(rootDir, 'lecture.json');
  const durationsPath = path.join(rootDir, 'audio', 'durations.json');
  const indexPath = path.join(rootDir, 'index.html');

  if (!fs.existsSync(lecturePath) || !fs.existsSync(indexPath)) {
    console.error('[SYNC] Không tìm thấy lecture.json hoặc index.html');
    return false;
  }

  const lecture = JSON.parse(fs.readFileSync(lecturePath, 'utf-8'));
  let durations = {};
  if (fs.existsSync(durationsPath)) {
    try {
      durations = JSON.parse(fs.readFileSync(durationsPath, 'utf-8'));
    } catch (e) {
      durations = {};
    }
  }

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Tính toán lại mốc thời gian tịnh tiến (cumulative timeline)
  let currentStart = 0;
  const slideTimings = [];

  lecture.slides.forEach((slide, idx) => {
    const sId = slide.id || `slide${idx + 1}`;
    // Lấy thời lượng từ durations.json hoặc slide.duration hoặc mặc định 16s
    const dur = durations[sId] || slide.duration || 16.0;
    const start = Math.round(currentStart * 100) / 100;
    const end = Math.round((currentStart + dur) * 100) / 100;

    slideTimings.push({
      id: sId,
      domId: `slide-${idx + 1}`,
      audioDomId: `audio-${idx + 1}`,
      start: start,
      duration: dur,
      end: end,
      title: slide.title,
      script: slide.narrationScript || ''
    });

    currentStart += dur;
  });

  const totalDuration = Math.round(currentStart * 100) / 100;

  // Cập nhật các thẻ <section id="slide-N" data-start="..." data-duration="...">
  slideTimings.forEach((st, idx) => {
    const secRegex = new RegExp(`(<section[^>]*id=["']${st.domId}["'][^>]*data-start=["'])[^"']*?(["'][^>]*data-duration=["'])[^"']*?(["'])`, 'i');
    if (secRegex.test(html)) {
      html = html.replace(secRegex, `$1${st.start}$2${st.duration}$3`);
    }

    // Cập nhật các thẻ <audio id="audio-N" data-start="..." data-duration="...">
    const audioRegex = new RegExp(`(<audio[^>]*id=["']${st.audioDomId}["'][^>]*data-start=["'])[^"']*?(["'][^>]*data-duration=["'])[^"']*?(["'])`, 'i');
    if (audioRegex.test(html)) {
      html = html.replace(audioRegex, `$1${st.start}$2${st.duration}$3`);
    }
  });

  // Cập nhật mảng slides và totalDuration trong đoạn JavaScript
  const jsSlidesRegex = /const slides = \[[^\]]*\];/s;
  const newJsSlides = `const slides = [\n` + slideTimings.map(s => 
    `        { id: "${s.domId}", start: ${s.start}, end: ${s.end}, duration: ${s.duration}, title: "${s.title.replace(/"/g, '\\"')}" }`
  ).join(',\n') + `\n      ];`;
  
  if (jsSlidesRegex.test(html)) {
    html = html.replace(jsSlidesRegex, newJsSlides);
  }

  // Cập nhật const totalDuration = ...;
  const jsTotalDurationRegex = /const totalDuration = [\d.]+;/;
  if (jsTotalDurationRegex.test(html)) {
    html = html.replace(jsTotalDurationRegex, `const totalDuration = ${totalDuration};`);
  }

  // Cập nhật mảng voiceCues
  const jsVoiceCuesRegex = /const voiceCues = \[[^\]]*\];/s;
  const newVoiceCues = `const voiceCues = [\n` + slideTimings.map(s =>
    `        { t: ${s.start}, text: "${s.script.replace(/"/g, '\\"')}" }`
  ).join(',\n') + `\n      ];`;

  if (jsVoiceCuesRegex.test(html)) {
    html = html.replace(jsVoiceCuesRegex, newVoiceCues);
  }

  // Cập nhật metadata JSON của HyperFrames Slideshow
  const metadataRegex = /<script type="application\/hyperframes-slideshow\+json">\s*\{[\s\S]*?\}\s*<\/script>/;
  const newMetadata = `<script type="application/hyperframes-slideshow+json">\n    {\n      "version": 1,\n      "slides": [\n` +
    slideTimings.map(s => `        {\n          "sceneId": "${s.domId}",\n          "startTime": ${s.start},\n          "endTime": ${s.end},\n          "notes": "${s.script.replace(/"/g, '\\"')}"\n        }`).join(',\n') +
    `\n      ],\n      "slideSequences": []\n    }\n    </script>`;

  if (metadataRegex.test(html)) {
    html = html.replace(metadataRegex, newMetadata);
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`[SYNC] Đã cập nhật thành công index.html với tổng thời lượng: ${totalDuration}s`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncHyperframesTimeline();
}
