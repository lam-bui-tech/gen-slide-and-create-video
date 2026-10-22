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
 * Quyết định Variant thông minh cho slide dựa theo ngữ cảnh và số lượng điểm
 */
function resolveSmartVariantForSlide(templateId, slide, elements) {
  // Nếu đã được gán thủ công cụ thể trong outline/payload khác 'default' thì ưu tiên giữ nguyên
  if (slide.variantId && slide.variantId !== 'default') return slide.variantId;
  if (slide.layoutVariant && slide.layoutVariant !== 'default') return slide.layoutVariant;
  if (slide.contentPayload?.layoutVariant && slide.contentPayload?.layoutVariant !== 'default') {
    return slide.contentPayload.layoutVariant;
  }

  if (templateId === 'bullet-breakdown') {
    const title = (slide.title || '').toLowerCase();
    const count = elements.filter(e => e.type === 'card').length;

    // Rule 1: Từ khóa thứ bậc / quá trình / tiến trình / hệ thống -> tree-hierarchy (Mẫu 2)
    const hierarchyKeywords = ['nguồn gốc', 'bước', 'giai đoạn', 'tiến trình', 'thứ bậc', 'phân cấp', 'quy trình', 'cấp độ', 'hệ thống', 'hình thành'];
    if (hierarchyKeywords.some(kw => title.includes(kw))) {
      return 'tree-hierarchy';
    }

    // Rule 2: Đúng 4 điểm phân tích -> contour-numbers (Mẫu 3: 2x2 grid viền contour)
    if (count === 4) {
      return 'contour-numbers';
    }

    // Rule 3: 5 hoặc 6 điểm -> skewed-badges (Mẫu 4: Khối số 3D nổi bật)
    if (count >= 5) {
      return 'skewed-badges';
    }

    // Rule 4: Có từ khóa công cụ / dụng cụ / đo lường -> visual-anchor (Mẫu 1)
    const anchorKeywords = ['dụng cụ', 'công cụ', 'khái niệm', 'thước đo', 'máy tính', 'phương tiện', 'thiết bị'];
    if (anchorKeywords.some(kw => title.includes(kw))) {
      return 'visual-anchor';
    }

    return 'default';
  }

  return 'default';
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
  
  // 1. Tính toán thời lượng bài giảng chính xác theo yêu cầu người dùng
  const targetDurationMinutes = parseFloat(options.durationMinutes || outline.estimatedDurationMinutes || 15.0);
  const totalTargetSeconds = Math.max(60.0, targetDurationMinutes * 60.0);
  const slidesCount = Math.max(1, outline.slides.length);
  const defaultSlideDuration = Math.round((totalTargetSeconds / slidesCount) * 10) / 10;

  // 2. Tách bạch Giảng viên thật và Voice AI
  const selectedVoiceId = options.voiceId || options.voiceOver || 'BanMai';
  const rawAuthor = String(options.author || outline.author || '').trim();
  const KNOWN_VOICES = ['myduyen', 'banmai', 'hamy', 'leminh', 'naman', 'phuongtrang'];
  const isVoiceName = KNOWN_VOICES.includes(rawAuthor.toLowerCase());
  const authorName = (rawAuthor && !isVoiceName) ? rawAuthor : 'Bộ môn / Giảng viên chuyên môn';

  // 3. Thích ứng phong cách và chủ đề theo Đối tượng người học (Target Audience)
  const targetAudience = String(options.targetAudience || outline.targetAudience || '').toLowerCase();
  let colorScheme = options.colorScheme || 'academic-ocean';
  let audienceType = 'academic';

  if (targetAudience.includes('tiểu học') || targetAudience.includes('thcs') || targetAudience.includes('trẻ em') || targetAudience.includes('học sinh')) {
    colorScheme = 'vibrant-warm';
    audienceType = 'school';
  } else if (targetAudience.includes('người đi làm') || targetAudience.includes('chuyên gia') || targetAudience.includes('doanh nghiệp')) {
    colorScheme = 'minimal-modern';
    audienceType = 'professional';
  } else {
    colorScheme = 'academic-ocean';
    audienceType = 'academic';
  }

  let cumulativeDuration = 0;

  const slides = outline.slides.map((s, idx) => {
    const templateId = s.suggestedTemplateId;
    const duration = s.durationSeconds || defaultSlideDuration;
    
    // Map elements from outline contentPayload and keyTakeaways with enhanced context
    const elements = buildElementsForTemplate(templateId, s, {
      author: authorName,
      audienceType: audienceType,
      slideIndex: idx
    });

    // Build default GSAP animation presets
    const animations = buildDefaultAnimations(templateId, elements);

    // Audio narration configuration
    const narrationText = s.speakerNotesDraft || s.keyTakeaways?.join('. ') || s.title;
    const voiceDuration = Math.max(duration - 1.0, 4.0);

    const resolvedSlideId = s.slideId || `slide-${idx + 1}`;
    const variantId = resolveSmartVariantForSlide(templateId, s, elements);

    // Tạo slotValues tương thích cả 2 chế độ template render
    const slotValues = buildSlotValuesForSlide(templateId, s, elements, {
      author: authorName,
      badge: outline.topic || 'Bài Giảng'
    });

    const slideObj = {
      slideId: resolvedSlideId,
      templateId: templateId,
      layoutId: templateId,
      layoutVariant: variantId,
      variantId: variantId,
      packId: options.packId || 'basic',
      title: s.title,
      subtitle: s.subtitle || (outline.sections?.[0]?.sectionTitle || ''),
      slotValues: slotValues,
      elements: elements,
      animations: animations,
      voice: {
        narration: narrationText,
        provider: 'vieneu',
        voiceId: selectedVoiceId,
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
      colorScheme: colorScheme,
      fontFamily: 'Be Vietnam Pro, sans-serif',
      aspectRatio: '16:9',
      audience: audienceType
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
/**
 * Phân tích takeaway thành heading và body chi tiết, tránh thẻ rỗng
 */
function parseBulletTakeaway(t, idx) {
  const str = String(t || '').trim();
  if (!str) return { heading: `Luận điểm ${idx + 1}`, body: 'Nội dung phân tích chi tiết trọng tâm bài học.' };
  
  // Tách theo dấu ":", "–", hoặc "-"
  const sepMatch = str.match(/^(.*?)(?:\s*[:–-]\s+)(.+)$/);
  if (sepMatch && sepMatch[1].length <= 60) {
    return { heading: sepMatch[1].trim(), body: sepMatch[2].trim() };
  }
  
  // Tách theo cụm từ đầu nếu câu dài
  const words = str.split(/\s+/);
  if (words.length > 4) {
    return { heading: words.slice(0, 3).join(' '), body: str };
  }
  return { heading: `Điểm ${idx + 1}: ${str}`, body: str };
}

/**
 * Elements mapping strategy based on templateId
 */
function buildElementsForTemplate(templateId, slide, context = {}) {
  const payload = slide.contentPayload || {};
  const takeaways = slide.keyTakeaways || [];
  const authorName = context.author || 'Bộ môn / Giảng viên chuyên môn';

  switch (templateId) {
    case 'title-slide': {
      const elements = [
        { id: 'badge-course', type: 'badge', content: payload.badge || context.badge || 'Bài Giảng Chuẩn' },
        { id: 'txt-author', type: 'text', content: authorName }
      ];
      // Chỉ gán ảnh bìa nếu payload có ảnh rõ ràng, không bốc bừa ảnh rác
      if (payload.image && typeof payload.image === 'string' && payload.image.trim()) {
        elements.push({ id: 'img-hero', type: 'image', content: payload.image.trim() });
      }
      return elements;
    }

    case 'learning-objectives':
      return [
        { id: 'obj-list', type: 'bullet-list', content: takeaways.length ? takeaways : ['Nắm vững khái niệm cốt lõi', 'Hiểu rõ nguyên lý vận hành', 'Thực hành vận dụng thực tế'] }
      ];

    case 'concept-explain': {
      const bodyContent = payload.quote || (takeaways.length ? takeaways.join('. ') : slide.speakerNotesDraft || 'Nội dung định nghĩa chuyên môn của bài học.');
      const elements = [
        { id: 'txt-def', type: 'card', content: bodyContent }
      ];
      if (payload.image && typeof payload.image === 'string' && payload.image.trim()) {
        elements.push({ id: 'img-concept', type: 'image', content: payload.image.trim() });
      }
      return elements;
    }

    case 'bullet-breakdown': {
      const rawPoints = takeaways.length ? takeaways : ['Luận điểm trọng tâm thứ nhất', 'Luận điểm trọng tâm thứ hai', 'Luận điểm trọng tâm thứ ba'];
      return rawPoints.map((t, idx) => {
        const parsed = parseBulletTakeaway(t, idx);
        return {
          id: `card-${idx}`,
          type: 'card',
          content: { heading: parsed.heading, body: parsed.body }
        };
      });
    }

    case 'image-explain': {
      const elements = [
        { id: 'txt-side', type: 'text', content: takeaways[0] || slide.speakerNotesDraft || 'Phân tích trực quan thông qua sơ đồ cấu trúc.' }
      ];
      if (payload.image && typeof payload.image === 'string' && payload.image.trim()) {
        elements.unshift({ id: 'img-diagram', type: 'image', content: payload.image.trim() });
      }
      return elements;
    }

    case 'comparison': {
      // Phân bổ nội dung đều cho 2 vế
      let leftItems = [];
      let rightItems = [];
      let leftTitle = payload.leftTitle || 'Vế Thứ Nhất';
      let rightTitle = payload.rightTitle || 'Vế Thứ Hai';

      if (takeaways.length >= 2) {
        const mid = Math.ceil(takeaways.length / 2);
        leftItems = takeaways.slice(0, mid);
        rightItems = takeaways.slice(mid);
      } else if (takeaways.length === 1) {
        const parsed = parseBulletTakeaway(takeaways[0], 0);
        leftTitle = parsed.heading;
        leftItems = [parsed.body || parsed.heading];
        rightTitle = 'Đặc điểm đối chiếu';
        rightItems = ['Các yếu tố khác biệt cần lưu ý trong thực tiễn'];
      } else {
        leftItems = ['Đặc trưng lý thuyết và quy chuẩn'];
        rightItems = ['Đặc trưng thực hành và áp dụng'];
      }

      return [
        {
          id: 'col-left',
          type: 'card',
          content: { title: leftTitle, items: leftItems }
        },
        {
          id: 'col-right',
          type: 'card',
          content: { title: rightTitle, items: rightItems }
        }
      ];
    }

    case 'timeline':
      return [
        {
          id: 'timeline-track',
          type: 'timeline-step',
          content: (takeaways.length ? takeaways : ['Giai đoạn khởi đầu', 'Giai đoạn phát triển', 'Giai đoạn hoàn thiện']).map((t, idx) => ({
            time: `Bước ${idx + 1}`,
            event: t,
            highlight: idx === 0
          }))
        }
      ];

    case 'formula-explain':
      return [
        { id: 'formula-box', type: 'formula', content: payload.formula || 'A ⟷ B = Phát Triển & Ứng Dụng' },
        { id: 'formula-note', type: 'text', content: takeaways[0] || slide.speakerNotesDraft || 'Ý nghĩa và mối tương quan giữa các thành tố' }
      ];

    case 'quiz': {
      // Trích xuất câu hỏi và các phương án từ payload hoặc takeaways
      let question = payload.question || slide.title || 'Câu hỏi củng cố kiến thức:';
      let options = [];
      let correctIndex = payload.correctIndex ?? 0;

      if (Array.isArray(payload.options) && payload.options.length >= 2) {
        options = payload.options;
      } else {
        // Tìm trong takeaways xem có câu hỏi và các phương án A, B, C, D không
        for (const t of takeaways) {
          const trimmed = String(t).trim();
          if (trimmed.startsWith('Câu hỏi:') || trimmed.startsWith('Q:')) {
            question = trimmed.replace(/^(Câu hỏi:|Q:)\s*/, '');
          } else if (/^[A-D][\.\)]\s*/.test(trimmed)) {
            options.push(trimmed);
          } else if (trimmed.startsWith('Đáp án đúng:')) {
            const m = trimmed.match(/([A-D])/);
            if (m) correctIndex = m[1].charCodeAt(0) - 65;
          }
        }
        if (options.length < 2) {
          options = ['Phương án A: Nắm vững kiến thức cốt lõi', 'Phương án B: Áp dụng trong tình huống thực tế', 'Phương án C: Cả hai phương án trên đều đúng', 'Phương án D: Cần kiểm chứng thêm'];
          correctIndex = 2;
        }
      }

      return [
        {
          id: 'quiz-box',
          type: 'quiz-block',
          content: {
            question: question,
            options: options,
            correctIndex: correctIndex
          }
        }
      ];
    }

    case 'summary':
    default:
      return [
        { id: 'summary-points', type: 'bullet-list', content: takeaways.length ? takeaways : ['Đã hoàn thành các mục tiêu bài giảng', 'Vận dụng kiến thức vào thực tế'] }
      ];
  }
}

/**
 * Sinh slotValues tương ứng với template để tương thích cả v1 và v2
 */
function buildSlotValuesForSlide(templateId, slide, elements, context = {}) {
  const payload = slide.contentPayload || {};
  const takeaways = slide.keyTakeaways || [];
  const authorName = context.author || 'Bộ môn / Giảng viên chuyên môn';

  const baseValues = {
    title: slide.title,
    subtitle: slide.subtitle || ''
  };

  switch (templateId) {
    case 'title-slide':
      return {
        ...baseValues,
        badge: payload.badge || context.badge || 'Bài Giảng',
        author: authorName,
        media: payload.image ? { type: 'image', url: payload.image } : null
      };

    case 'learning-objectives':
      return {
        ...baseValues,
        bullets: takeaways.length ? takeaways : ['Mục tiêu 1', 'Mục tiêu 2', 'Mục tiêu 3']
      };

    case 'concept-explain':
      return {
        ...baseValues,
        body: payload.quote || (takeaways.length ? takeaways.join('. ') : slide.speakerNotesDraft || ''),
        media: payload.image ? { type: 'image', url: payload.image } : null
      };

    case 'bullet-breakdown': {
      const cards = (elements.filter(e => e.type === 'card')).map(e => e.content);
      return {
        ...baseValues,
        cards: cards,
        bullets: takeaways
      };
    }

    case 'comparison': {
      const colLeft = elements.find(e => e.id === 'col-left')?.content || { title: 'Vế Thứ Nhất', items: [] };
      const colRight = elements.find(e => e.id === 'col-right')?.content || { title: 'Vế Thứ Hai', items: [] };
      return {
        ...baseValues,
        leftColumn: colLeft,
        rightColumn: colRight
      };
    }

    case 'quiz': {
      const qBlock = elements.find(e => e.type === 'quiz-block')?.content || {};
      return {
        ...baseValues,
        question: qBlock.question || slide.title,
        options: qBlock.options || [],
        correctIndex: qBlock.correctIndex ?? 0
      };
    }

    case 'summary':
    default:
      return {
        ...baseValues,
        bullets: takeaways
      };
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

// CLI Execution support (only when invoked directly from CLI)
const isDirectCli = typeof process !== 'undefined' && process.argv[1] && (
  process.argv[1].endsWith('outline_to_hyperframes.js') || 
  process.argv[1].endsWith('outline_to_hyperframes.mjs')
);
if (isDirectCli && process.argv[2]) {
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
