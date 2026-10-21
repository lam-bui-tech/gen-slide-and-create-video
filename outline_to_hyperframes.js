/**
 * outline_to_hyperframes.js
 * Deep Module: Pure Mapper for HyperFrames Lecture Studio
 * 
 * Two Pure Steps:
 * 1. outlineToScene(outline): LessonOutline -> LessonSceneJSON
 * 2. sceneToHyperFramesHtml(scene): LessonSceneJSON -> Full HyperFrames index.html
 * 
 * Invariants:
 * - Slide start times are strictly computed from durationSeconds: start[i] = sum(durationSeconds[0..i-1]).
 * - Audio-first sync from Person A automatically scales timeline cues without code modification.
 * - Fails loudly with SchemaValidationError on schema-invalid input.
 */

import { TEMPLATES, renderSlide } from './templates/index.js';
import { TemplateRegistry } from './templates/registry.js';
import { migrateSceneV1ToV2 } from './templates/migration.js';

export class SchemaValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'SchemaValidationError';
    this.details = details;
  }
}

export const VALID_TEMPLATES = new Set(
  TemplateRegistry.get('basic')?.layouts.map(l => l.id) || [
    'title-slide',
    'learning-objectives',
    'concept-explain',
    'bullet-breakdown',
    'image-explain',
    'comparison',
    'timeline',
    'formula-explain',
    'quiz',
    'summary'
  ]
);

/**
 * Validate LessonOutline according to schemas/lesson_outline.json
 * @param {object} outline
 * @throws {SchemaValidationError}
 */
export function validateOutline(outline) {
  if (!outline || typeof outline !== 'object') {
    throw new SchemaValidationError('Invalid outline: must be a non-null object');
  }

  const required = ['topic', 'targetAudience', 'estimatedDurationMinutes', 'learningObjectives', 'slides', 'summary'];
  const missing = required.filter(k => outline[k] === undefined || outline[k] === null);
  if (missing.length > 0) {
    throw new SchemaValidationError(`Outline missing required top-level fields: ${missing.join(', ')}`, missing);
  }

  if (!Array.isArray(outline.learningObjectives) || outline.learningObjectives.length === 0) {
    throw new SchemaValidationError('learningObjectives must be a non-empty array of strings');
  }

  if (!Array.isArray(outline.slides) || outline.slides.length === 0) {
    throw new SchemaValidationError('slides must be a non-empty array of OutlineSlide objects');
  }

  outline.slides.forEach((s, idx) => {
    if (!s || typeof s !== 'object') {
      throw new SchemaValidationError(`Slide at index ${idx} must be an object`);
    }
    const slideReq = ['slideId', 'suggestedTemplateId', 'title', 'keyTakeaways', 'speakerNotesDraft', 'contentPayload'];
    const sMissing = slideReq.filter(k => s[k] === undefined || s[k] === null);
    if (sMissing.length > 0) {
      throw new SchemaValidationError(`Slide [${s.slideId || idx}] missing required fields: ${sMissing.join(', ')}`, sMissing);
    }
    const templateId = s.suggestedLayoutId || s.suggestedTemplateId;
    if (!VALID_TEMPLATES.has(templateId) && !TemplateRegistry.hasLayout('basic', templateId)) {
      throw new SchemaValidationError(
        `Slide [${s.slideId}] has unknown suggestedTemplateId: "${templateId}". Must be one of: ${Array.from(VALID_TEMPLATES).join(', ')}`
      );
    }
    if (!Array.isArray(s.keyTakeaways)) {
      throw new SchemaValidationError(`Slide [${s.slideId}] keyTakeaways must be an array`);
    }
    if (typeof s.contentPayload !== 'object') {
      throw new SchemaValidationError(`Slide [${s.slideId}] contentPayload must be an object`);
    }
  });

  return true;
}

/**
 * Validate LessonSceneJSON according to schemas/lesson_scene.json
 * @param {object} scene
 * @throws {SchemaValidationError}
 */
export function validateScene(scene) {
  if (!scene || typeof scene !== 'object') {
    throw new SchemaValidationError('Invalid scene: must be a non-null object');
  }

  const required = ['projectId', 'title', 'slides'];
  const missing = required.filter(k => scene[k] === undefined || scene[k] === null);
  if (missing.length > 0) {
    throw new SchemaValidationError(`Scene missing required top-level fields: ${missing.join(', ')}`, missing);
  }

  if (!Array.isArray(scene.slides) || scene.slides.length === 0) {
    throw new SchemaValidationError('Scene slides must be a non-empty array');
  }

  scene.slides.forEach((s, idx) => {
    if (!s || typeof s !== 'object') {
      throw new SchemaValidationError(`Scene slide at index ${idx} must be an object`);
    }
    const slideReq = ['slideId', 'templateId', 'layoutVariant', 'title', 'elements', 'animations', 'voice', 'durationSeconds'];
    const sMissing = slideReq.filter(k => s[k] === undefined || s[k] === null);
    if (sMissing.length > 0) {
      throw new SchemaValidationError(`Scene slide [${s.slideId || idx}] missing required fields: ${sMissing.join(', ')}`, sMissing);
    }
    const layoutId = s.layoutId || s.templateId;
    const packId = s.packId || scene.packId || 'basic';
    if (!VALID_TEMPLATES.has(layoutId) && !TemplateRegistry.hasLayout(packId, layoutId)) {
      throw new SchemaValidationError(
        `Scene slide [${s.slideId}] has invalid templateId: "${layoutId}". Must be one of: ${Array.from(VALID_TEMPLATES).join(', ')}`
      );
    }
    if (typeof s.durationSeconds !== 'number' || s.durationSeconds <= 0) {
      throw new SchemaValidationError(`Scene slide [${s.slideId}] durationSeconds must be a positive number`);
    }
    if (!s.voice || typeof s.voice !== 'object' || typeof s.voice.narration !== 'string') {
      throw new SchemaValidationError(`Scene slide [${s.slideId}] voice must contain narration string`);
    }
  });

  return true;
}

/**
 * Step 1: Map LessonOutline to LessonSceneJSON using template registry
 * Pure Function: returns a new, fully validated LessonSceneJSON object.
 * 
 * @param {object} outline - Conforming to schemas/lesson_outline.json
 * @param {object} [options]
 * @returns {object} LessonSceneJSON
 */
export function outlineToScene(outline, options = {}) {
  // Fail loudly on invalid input
  validateOutline(outline);

  const projectId = options.projectId || `proj-${Date.now().toString(36)}`;
  let cumulativeDuration = 0;

  const slides = outline.slides.map((s, idx) => {
    const templateId = s.suggestedTemplateId;
    const duration = s.durationSeconds || (s.contentPayload?.durationSeconds) || 16.0;
    
    // Map elements from outline contentPayload and keyTakeaways
    const elements = buildElementsForTemplate(templateId, s);

    // Build default GSAP animation presets
    const animations = buildDefaultAnimations(templateId, elements);

    // Audio narration configuration
    const narrationText = s.speakerNotesDraft || s.keyTakeaways?.join('. ') || s.title;
    const voiceDuration = Math.max(duration - 1.0, 4.0);

    const resolvedSlideId = s.slideId || `slide-${idx + 1}`;
    const variantId = s.variantId || s.layoutVariant || s.contentPayload?.layoutVariant || 'default';

    const slideObj = {
      slideId: resolvedSlideId,
      templateId: templateId,
      layoutId: templateId,
      layoutVariant: variantId,
      variantId: variantId,
      packId: options.packId || 'basic',
      title: s.title,
      subtitle: s.subtitle || (outline.sections?.[0]?.sectionTitle || ''),
      elements: elements,
      animations: animations,
      voice: {
        narration: narrationText,
        provider: 'vieneu',
        voiceId: 'MyDuyen',
        audioUrl: `storage/projects/${projectId}/audio/${resolvedSlideId}.wav`,
        durationSeconds: voiceDuration
      },
      durationSeconds: duration,
      notes: s.speakerNotesDraft || ''
    };

    cumulativeDuration += duration;
    return slideObj;
  });

  const sceneResult = {
    schemaVersion: 2,
    packId: options.packId || 'basic',
    projectId: projectId,
    title: outline.topic,
    theme: {
      colorScheme: options.colorScheme || 'academic-ocean',
      fontFamily: 'Be Vietnam Pro, sans-serif',
      aspectRatio: '16:9'
    },
    totalDurationSeconds: Math.round(cumulativeDuration * 100) / 100,
    slides: slides
  };

  validateScene(sceneResult);
  return sceneResult;
}

/**
 * Step 2: Compile LessonSceneJSON to a full HyperFrames root index.html
 * Pure Function: computes exact cumulative data-start offsets and returns HTML string.
 * 
 * @param {object} scene - Conforming to schemas/lesson_scene.json
 * @param {object} [options]
 * @returns {string} Fully valid HyperFrames index.html
 */
export function sceneToHyperFramesHtml(scene, options = {}) {
  // Fail loudly on invalid input
  validateScene(scene);

  // Transparently migrate v1 scenes to v2
  const activeScene = migrateSceneV1ToV2(scene);

  let currentStart = 0;
  const slideSections = [];
  const audioTags = [];
  const slideTimingMetadata = [];
  const voiceCues = [];

  activeScene.slides.forEach((slide, idx) => {
    // Start times strictly derived from durationSeconds (Audio-First Sync)
    const duration = slide.durationSeconds;
    const start = Math.round(currentStart * 100) / 100;
    const end = Math.round((currentStart + duration) * 100) / 100;
    const domId = slide.slideId;
    const audioDomId = `audio-${idx + 1}`;

    slideTimingMetadata.push({
      id: domId,
      start: start,
      end: end,
      duration: duration,
      title: slide.title
    });

    if (slide.voice?.narration) {
      voiceCues.push({
        t: start,
        text: slide.voice.narration
      });
    }

    // Render semantic section
    slideSections.push(renderSlide({ ...slide, start }, idx, start));

    // Audio element normalized relative to project folder
    let relAudioSrc = null;
    if (slide.voice?.audioUrl) {
      const parts = slide.voice.audioUrl.replace(/\\/g, '/').split('/audio/');
      if (parts.length > 1) {
        relAudioSrc = `audio/${parts[1]}`;
      } else {
        relAudioSrc = slide.voice.audioUrl;
      }
    } else {
      const cleanSlideId = slide.slideId || `slide-${idx + 1}`;
      relAudioSrc = `audio/${cleanSlideId}.wav`;
    }

    if (relAudioSrc) {
      audioTags.push(
        `<audio id="${audioDomId}" data-start="${start}" data-duration="${duration}" src="${relAudioSrc}" preload="auto"></audio>`
      );
    }

    currentStart += duration;
  });

  const totalDuration = Math.round(currentStart * 100) / 100;
  const compositionId = scene.projectId || 'lecture-composition';

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>${escapeHtml(scene.title || 'AI Lecture Studio')}</title>
    <!-- Google Fonts: Be Vietnam Pro & JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <!-- GSAP for HyperFrames Motion Engine -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="templates/tokens.css">
    <link rel="stylesheet" href="templates/templates.css">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
      html, body {
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: var(--hf-bg-main);
        font-family: var(--hf-font-sans);
        color: var(--hf-text-main);
      }
      #root {
        position: relative;
        width: 1920px;
        height: 1080px;
        background: radial-gradient(circle at 10% 15%, rgba(14, 165, 233, 0.08) 0%, transparent 45%),
                    radial-gradient(circle at 90% 85%, rgba(3, 105, 161, 0.06) 0%, transparent 50%),
                    var(--hf-bg-main);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      header {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 64px 18px 64px;
        border-bottom: 1px solid var(--hf-border-card);
        background: var(--hf-bg-header);
        backdrop-filter: blur(12px);
      }
      .logo-area { display: flex; align-items: center; gap: 16px; }
      .logo-badge {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--hf-primary-hover), var(--hf-primary));
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--hf-shadow-sm);
        color: #FFFFFF;
        font-size: 22px;
      }
      .title-group h1 {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: var(--hf-primary-hover);
      }
      .title-group p {
        font-size: 13px;
        color: var(--hf-text-sub);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
      }
      .section-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--hf-primary-subtle);
        border: 1px solid var(--hf-border-card);
        padding: 8px 20px;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 700;
        color: var(--hf-primary);
      }
      footer {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 64px 18px 64px;
        border-top: 1px solid var(--hf-border-card);
        background: var(--hf-bg-footer);
        backdrop-filter: blur(12px);
      }
      .voice-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        max-width: 1480px;
      }
      .soundwave { display: flex; align-items: center; gap: 3px; height: 20px; }
      .wave-bar {
        width: 3px;
        height: 100%;
        background: var(--hf-primary);
        border-radius: 2px;
        animation: soundwave 1.2s infinite ease-in-out;
      }
      .wave-bar:nth-child(2) { animation-delay: 0.2s; height: 70%; }
      .wave-bar:nth-child(3) { animation-delay: 0.4s; height: 40%; }
      .wave-bar:nth-child(4) { animation-delay: 0.1s; height: 85%; }
      @keyframes soundwave {
        0%, 100% { transform: scaleY(0.4); }
        50% { transform: scaleY(1); }
      }
      .voice-text {
        font-size: 16px;
        color: var(--hf-text-sub);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .slide-counter { font-size: 14px; font-weight: 700; color: var(--hf-text-muted); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${escapeHtml(compositionId)}" data-width="1920" data-height="1080" data-duration="${totalDuration}">
      <div class="hf-bg-grid"></div>

      <!-- Header -->
      <header>
        <div class="logo-area">
          <div class="logo-badge">🎓</div>
          <div class="title-group">
            <h1>${escapeHtml(scene.title || 'AI Lecture Studio')}</h1>
            <p>Bài Giảng Chuẩn Sư Phạm</p>
          </div>
        </div>
        <div class="section-badge">
          <span>●</span>
          <span id="current-slide-badge">Slide 1 / ${scene.slides.length}</span>
        </div>
      </header>

      <!-- Slides: .clip elements with data-start and data-duration -->
      <main id="slides-container" style="position: relative; width: 100%; height: 916px;">
        ${slideSections.join('\n\n        ')}
      </main>

      <!-- Footer Voice Indicator -->
      <footer>
        <div class="voice-bar">
          <div class="soundwave">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
          <div class="voice-text" id="vVoiceText">Đang tải giọng đọc bài giảng...</div>
        </div>
        <div class="slide-counter" id="vTimeCounter">00:00 / 00:00</div>
      </footer>

      <!-- Audio Elements -->
      <div id="audio-container" style="display: none;">
        ${audioTags.join('\n        ')}
      </div>
    </div>

    <!-- HyperFrames Timeline Registration -->
    <script>
      window.__timelines = window.__timelines || {};
      const rootTl = gsap.timeline({ paused: true });
      window.__timelines["${escapeHtml(compositionId)}"] = rootTl;

      const slides = ${JSON.stringify(slideTimingMetadata, null, 2)};
      const voiceCues = ${JSON.stringify(voiceCues, null, 2)};
      const totalDuration = ${totalDuration};

      // Slide visibility transitions
      slides.forEach((s, idx) => {
        rootTl.call(() => {
          document.querySelectorAll('.clip').forEach(el => el.classList.remove('active'));
          const target = document.getElementById(s.id);
          if (target) target.classList.add('active');
          const badge = document.getElementById('current-slide-badge');
          if (badge) badge.innerText = 'Slide ' + (idx + 1) + ' / ' + slides.length;
        }, null, s.start);
      });

      // Voice subtitle updates
      voiceCues.forEach(cue => {
        rootTl.call(() => {
          const txt = document.getElementById('vVoiceText');
          if (txt) txt.innerText = cue.text;
        }, null, cue.t);
      });

      // Timeline duration indicator sync
      rootTl.to({}, { duration: totalDuration });
    </script>
  </body>
</html>`;
}

/**
 * Elements mapping strategy based on templateId
 */
function buildElementsForTemplate(templateId, slide) {
  const payload = slide.contentPayload || {};
  const takeaways = slide.keyTakeaways || [];

  switch (templateId) {
    case 'title-slide': {
      const elements = [
        { id: 'badge-course', type: 'badge', content: payload.badge || 'Bài Học' },
        { id: 'txt-author', type: 'text', content: payload.author || takeaways[0] || 'Giảng viên' }
      ];
      if (payload.image) {
        elements.push({ id: 'img-hero', type: 'image', content: payload.image });
      }
      return elements;
    }

    case 'learning-objectives':
      return [
        { id: 'obj-list', type: 'bullet-list', content: takeaways.length ? takeaways : ['Mục tiêu 1', 'Mục tiêu 2', 'Mục tiêu 3'] }
      ];

    case 'concept-explain': {
      const elements = [
        { id: 'txt-def', type: 'card', content: payload.quote || takeaways[0] || slide.speakerNotesDraft || '' }
      ];
      if (payload.image) {
        elements.push({ id: 'img-concept', type: 'image', content: payload.image });
      }
      return elements;
    }

    case 'bullet-breakdown':
      return takeaways.map((t, idx) => ({
        id: `card-${idx}`,
        type: 'card',
        content: { heading: `Luận điểm ${idx + 1}`, body: t }
      }));

    case 'image-explain': {
      const elements = [
        { id: 'txt-side', type: 'text', content: takeaways[0] || slide.speakerNotesDraft || '' }
      ];
      if (payload.image) {
        elements.unshift({ id: 'img-diagram', type: 'image', content: payload.image });
      }
      return elements;
    }

    case 'comparison':
      return [
        {
          id: 'col-left',
          type: 'card',
          content: { title: payload.leftTitle || 'Vế Thứ Nhất', items: takeaways.slice(0, 3) }
        },
        {
          id: 'col-right',
          type: 'card',
          content: { title: payload.rightTitle || 'Vế Thứ Hai', items: takeaways.slice(3, 6) }
        }
      ];

    case 'timeline':
      return [
        {
          id: 'timeline-track',
          type: 'timeline-step',
          content: takeaways.map((t, idx) => ({
            time: `Giai đoạn ${idx + 1}`,
            event: t,
            highlight: idx === 0
          }))
        }
      ];

    case 'formula-explain':
      return [
        { id: 'formula-box', type: 'formula', content: payload.formula || 'A ⟷ B = Phát triển' },
        { id: 'formula-note', type: 'text', content: takeaways[0] || '' }
      ];

    case 'quiz':
      return [
        {
          id: 'quiz-box',
          type: 'quiz-block',
          content: {
            question: slide.title,
            options: takeaways.length >= 2 ? takeaways : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
            correctIndex: 0
          }
        }
      ];

    case 'summary':
    default:
      return [
        { id: 'summary-points', type: 'bullet-list', content: takeaways }
      ];
  }
}

/**
 * Animations mapping strategy based on templateId
 */
function buildDefaultAnimations(templateId, elements) {
  const animations = [
    { target: '.slide-title', preset: 'slide-in', delay: 0.5, duration: 1.0, easing: 'power2.out' }
  ];

  elements.forEach((el, idx) => {
    animations.push({
      target: `#${el.id}`,
      preset: el.type === 'image' ? 'zoom-in' : 'fade-in',
      delay: 1.0 + idx * 0.5,
      duration: 0.8,
      easing: 'power2.out'
    });
  });

  return animations;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

import fs from 'fs';
import path from 'path';

// CLI Execution support
if (process.argv[2]) {
  try {
    const mode = process.argv[2];
    if (mode === '--scene-to-html') {
      const scenePath = process.argv[3];
      const outHtmlPath = process.argv[4];
      if (!scenePath || !outHtmlPath) {
        console.error('Usage: node outline_to_hyperframes.js --scene-to-html <scene.json> <out.html>');
        process.exit(1);
      }
      const sceneData = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
      const html = sceneToHyperFramesHtml(sceneData);
      fs.mkdirSync(path.dirname(path.resolve(outHtmlPath)), { recursive: true });
      fs.writeFileSync(outHtmlPath, html, 'utf8');
      console.log(`[HyperFrames Compiler] Compiled scene to: ${outHtmlPath}`);
      process.exit(0);
    } else {
      // Legacy outline to scene mapping: node outline_to_hyperframes.js <outline_path> <scene_path> [project_id]
      const outlinePath = process.argv[2];
      const scenePath = process.argv[3];
      const projectId = process.argv[4] || 'proj-auto';
      const outlineData = JSON.parse(fs.readFileSync(outlinePath, 'utf8'));
      const scene = outlineToScene(outlineData, { projectId });
      fs.mkdirSync(path.dirname(path.resolve(scenePath)), { recursive: true });
      fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2), 'utf8');
      console.log(`[HyperFrames Mapper] Generated scene to: ${scenePath}`);
      process.exit(0);
    }
  } catch (err) {
    console.error('[HyperFrames CLI Error]', err.message);
    process.exit(1);
  }
}
