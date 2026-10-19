/**
 * outline_to_hyperframes.js
 * Pure Mapper:
 * 1. outlineToScene: LessonOutline -> LessonSceneJSON
 * 2. sceneToHyperFramesHtml: LessonSceneJSON -> Full HyperFrames index.html
 */

import { TEMPLATES, renderSlide } from './templates/index.js';

/**
 * Step 1: Map LessonOutline to LessonSceneJSON
 * @param {object} outline - Conforming to schemas/lesson_outline.json
 * @param {object} [options]
 * @returns {object} - Conforming to schemas/lesson_scene.json
 */
export function outlineToScene(outline, options = {}) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('[Mapper] Invalid outline: slides array is required.');
  }

  const projectId = options.projectId || `proj-${Date.now().toString(36)}`;
  let cumulativeDuration = 0;

  const slides = outline.slides.map((s, idx) => {
    const templateId = s.suggestedTemplateId || 'concept-explain';
    const duration = s.durationSeconds || 16.0;
    const start = cumulativeDuration;
    cumulativeDuration += duration;

    // Convert elements based on templateId and contentPayload
    const elements = buildElementsForTemplate(templateId, s);

    // Build default animation timeline cues
    const animations = buildDefaultAnimations(templateId, elements);

    return {
      slideId: s.slideId || `slide-${String(idx + 1).padStart(2, '0')}`,
      templateId: templateId,
      layoutVariant: s.layoutVariant || 'default',
      title: s.title || `Slide ${idx + 1}`,
      subtitle: s.subtitle || (outline.sections?.[0]?.sectionTitle || ''),
      elements: elements,
      animations: animations,
      voice: {
        narration: s.speakerNotesDraft || '',
        provider: 'vieneu',
        voiceId: 'MyDuyen',
        audioUrl: `storage/projects/${projectId}/audio/slide-${String(idx + 1).padStart(2, '0')}.wav`,
        durationSeconds: Math.max(duration - 1.0, 5.0)
      },
      durationSeconds: duration,
      notes: s.speakerNotesDraft || ''
    };
  });

  return {
    projectId: projectId,
    title: outline.topic || 'Bài Giảng Mẫu',
    theme: {
      colorScheme: options.colorScheme || 'academic-ocean',
      fontFamily: 'Be Vietnam Pro, sans-serif',
      aspectRatio: '16:9'
    },
    totalDurationSeconds: Math.round(cumulativeDuration * 100) / 100,
    slides: slides
  };
}

/**
 * Step 2: Compile LessonSceneJSON to a full HyperFrames index.html composition
 * @param {object} scene - Conforming to schemas/lesson_scene.json
 * @param {object} [options]
 * @returns {string} - Full HTML string conforming to HyperFrames specifications
 */
export function sceneToHyperFramesHtml(scene, options = {}) {
  if (!scene || !Array.isArray(scene.slides)) {
    throw new Error('[Mapper] Invalid scene: slides array is required.');
  }

  let currentStart = 0;
  const slideSections = [];
  const audioTags = [];
  const slideTimingMetadata = [];
  const voiceCues = [];

  scene.slides.forEach((slide, idx) => {
    const duration = slide.durationSeconds || 16.0;
    const start = Math.round(currentStart * 100) / 100;
    const end = Math.round((currentStart + duration) * 100) / 100;
    const domId = slide.slideId || `slide-${idx + 1}`;
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

    // Render section
    slideSections.push(renderSlide({ ...slide, start }, idx, start));

    // Render corresponding audio tag
    const audioSrc = slide.voice?.audioUrl || `audio/slide${idx + 1}.wav`;
    audioTags.push(
      `<audio id="${audioDomId}" data-start="${start}" data-duration="${duration}" src="${audioSrc}" preload="auto"></audio>`
    );

    currentStart += duration;
  });

  const totalDuration = Math.round(currentStart * 100) / 100;

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>${escapeHtml(scene.title || 'Bài Giảng Học Thuật')}</title>
    <!-- Google Fonts: Be Vietnam Pro -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <!-- GSAP for HyperFrames Motion Engine -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="templates/tokens.css">
    <link rel="stylesheet" href="templates/templates.css">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        user-select: none;
      }
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
      .logo-area {
        display: flex;
        align-items: center;
        gap: 16px;
      }
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
      .soundwave {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 20px;
      }
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
      .slide-counter {
        font-size: 14px;
        font-weight: 700;
        color: var(--hf-text-muted);
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="hf-bg-grid"></div>

      <!-- Top Header -->
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

      <!-- Main Slides Container (.clip elements) -->
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
      window.__timelines["${escapeHtml(scene.projectId || 'lecture-composition')}"] = rootTl;

      const slides = ${JSON.stringify(slideTimingMetadata, null, 2)};
      const voiceCues = ${JSON.stringify(voiceCues, null, 2)};
      const totalDuration = ${totalDuration};

      // Slide visibility transitions
      slides.forEach((s, idx) => {
        // Activate slide
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
 * Helpers to build default elements from outline slide payload
 */
function buildElementsForTemplate(templateId, slide) {
  const payload = slide.contentPayload || {};
  const takeaways = slide.keyTakeaways || [];

  switch (templateId) {
    case 'title-slide':
      return [
        { id: 'badge-course', type: 'badge', content: payload.badge || 'Bài Học' },
        { id: 'txt-author', type: 'text', content: payload.author || takeaways[0] || 'Giảng viên' },
        { id: 'img-hero', type: 'image', content: payload.image || 'storage/projects/sample/images/philosophy_intro.png' }
      ];

    case 'learning-objectives':
      return [
        { id: 'obj-list', type: 'bullet-list', content: takeaways.length ? takeaways : ['Mục tiêu 1', 'Mục tiêu 2', 'Mục tiêu 3'] }
      ];

    case 'concept-explain':
      return [
        { id: 'txt-def', type: 'card', content: payload.quote || takeaways[0] || slide.speakerNotesDraft || '' },
        { id: 'img-concept', type: 'image', content: payload.image || 'storage/projects/sample/images/philosophy_concept.png' }
      ];

    case 'bullet-breakdown':
      return takeaways.map((t, idx) => ({
        id: `card-${idx}`,
        type: 'card',
        content: { heading: `Luận điểm ${idx + 1}`, body: t }
      }));

    case 'image-explain':
      return [
        { id: 'img-diagram', type: 'image', content: payload.image || 'storage/projects/sample/images/basic_problem.png' },
        { id: 'txt-side', type: 'text', content: takeaways[0] || slide.speakerNotesDraft || '' }
      ];

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
 * Helpers to build default GSAP animations for template elements
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
