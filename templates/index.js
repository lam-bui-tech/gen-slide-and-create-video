/**
 * templates/index.js
 * Template Registry and Component Renderers for HyperFrames Academic Pro Templates
 * Integrates with templates/registry.js and schemas/lesson_scene.json v2.
 */

import { TemplateRegistry } from './registry.js';
import { migrateSceneV1ToV2 } from './migration.js';

const RENDERERS = {
  'title-slide': renderTitleSlide,
  'learning-objectives': renderLearningObjectives,
  'concept-explain': renderConceptExplain,
  'bullet-breakdown': renderBulletBreakdown,
  'image-explain': renderImageExplain,
  'comparison': renderComparison,
  'timeline': renderTimeline,
  'formula-explain': renderFormulaExplain,
  'quiz': renderQuiz,
  'summary': renderSummary
};

export const TEMPLATES = {};
const basicPack = TemplateRegistry.get('basic');
if (basicPack?.layouts) {
  for (const layout of basicPack.layouts) {
    TEMPLATES[layout.id] = {
      id: layout.id,
      name: layout.name,
      purpose: layout.purpose,
      supportedVariants: layout.variants.map(v => v.id),
      render: RENDERERS[layout.id] || renderConceptExplain
    };
  }
}

/**
 * Helper to render either a standard image or an embedded video component (P6.3)
 */
function renderMediaBlock(slide, imgEl, defaultId, wrapClass) {
  const vidEl = slide.elements?.find(e => e.type === 'video');
  if (vidEl && vidEl.content) {
    const videoSrc = vidEl.content;
    const trimStart = vidEl.trimStart ?? 0.0;
    const trimEnd = vidEl.trimEnd ?? (slide.durationSeconds || 16.0);
    const duration = Math.min(Math.max(1.0, trimEnd - trimStart), slide.durationSeconds || 16.0);
    const hasNarration = Boolean(slide.voice?.narration && (slide.voice?.durationSeconds > 0 || slide.voice.narration.trim().length > 0));
    const rawVolume = vidEl.volume ?? 1.0;
    const effectiveVolume = (vidEl.ducking && hasNarration) ? 0.2 : rawVolume;
    const isMuted = effectiveVolume <= 0 || Boolean(vidEl.muted);
    const hasAudioAttr = isMuted ? 'data-has-audio="false"' : 'data-has-audio="true"';
    const mutedAttr = isMuted ? 'muted' : '';
    const posterAttr = vidEl.poster ? `poster="${escapeHtml(vidEl.poster)}"` : '';

    return `
      <div class="${wrapClass}">
        <video id="${vidEl.id || defaultId}" class="clip" src="${escapeHtml(videoSrc)}"
          data-start="${slide.start || 0}" data-duration="${duration}"
          data-media-start="${trimStart}" data-media-end="${trimEnd}"
          data-volume="${effectiveVolume.toFixed(1)}" data-ducking="${vidEl.ducking ? 'true' : 'false'}"
          ${hasAudioAttr} ${mutedAttr} ${posterAttr} playsinline preload="metadata"
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
        </video>
      </div>`;
  }

  const mediaVal = slide.slotValues?.media || imgEl?.content;
  const imgSrc = (typeof mediaVal === 'string') ? mediaVal.trim() : (mediaVal?.url?.trim() || '');
  if (!imgSrc) return '';

  return `
    <div class="${wrapClass}">
      <img id="${imgEl?.id || defaultId}" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(slide.title)}" onerror="this.style.display='none'" />
    </div>`;
}

/**
 * 1. Title Slide (Hero)
 */
function renderTitleSlide(slide) {
  let variant = slide.variantId || slide.layoutVariant || 'default';
  const badgeEl = slide.elements?.find(e => e.type === 'badge');
  const authorEl = slide.elements?.find(e => e.id === 'txt-author' || e.type === 'text');
  const imgEl = slide.elements?.find(e => e.type === 'image');
  const vidEl = slide.elements?.find(e => e.type === 'video');

  const mediaVal = slide.slotValues?.media || imgEl?.content || vidEl?.content;
  const imgSrc = (typeof mediaVal === 'string') ? mediaVal.trim() : (mediaVal?.url?.trim() || '');
  const hasValidMedia = Boolean(imgSrc);

  if (!hasValidMedia && variant === 'default') {
    variant = 'no-image';
  }

  const badgeText = slide.slotValues?.badge || badgeEl?.content;
  const badgeHtml = badgeText ? `<div id="${badgeEl?.id || 'badge-course'}" class="hf-badge">${escapeHtml(badgeText)}</div>` : '';
  const authorText = slide.slotValues?.author || authorEl?.content;
  const authorHtml = authorText ? `<div id="${authorEl?.id || 'txt-author'}" class="title-hero-author"><span>👨‍🏫</span> ${escapeHtml(authorText)}</div>` : '';

  const mediaHtml = hasValidMedia ? renderMediaBlock(slide, imgEl, 'img-hero', 'title-hero-image-wrap') : '';

  return `
    <div class="hf-template-title-slide variant-${variant}">
      <div class="title-hero-content">
        ${badgeHtml}
        <h1 class="slide-title title-hero-heading">${escapeHtml(slide.title)}</h1>
        ${slide.subtitle ? `<p class="title-hero-sub">${escapeHtml(slide.subtitle)}</p>` : ''}
        ${authorHtml}
      </div>
      ${mediaHtml}
    </div>
  `;
}


/**
 * 2. Learning Objectives
 */
function renderLearningObjectives(slide) {
  const listEl = slide.elements?.find(e => e.type === 'bullet-list');
  const items = Array.isArray(listEl?.content) ? listEl.content : [];

  const itemsHtml = items.map((item, idx) => `
    <div class="objective-item obj-item-${idx}">
      <div class="objective-num">${String(idx + 1).padStart(2, '0')}</div>
      <div class="objective-text">${escapeHtml(item.replace(/^\d+[\.\)]\s*/, ''))}</div>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-learning-objectives">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="objectives-grid" id="${listEl?.id || 'obj-list'}">
        ${itemsHtml}
      </div>
    </div>
  `;
}

/**
 * 3. Concept Explain
 */
function renderConceptExplain(slide) {
  let variant = slide.variantId || slide.layoutVariant || 'default';
  const cardEl = slide.elements?.find(e => e.type === 'card' || e.type === 'text');
  const imgEl = slide.elements?.find(e => e.type === 'image');
  const vidEl = slide.elements?.find(e => e.type === 'video');

  const mediaVal = slide.slotValues?.media || imgEl?.content || vidEl?.content;
  const imgSrc = (typeof mediaVal === 'string') ? mediaVal.trim() : (mediaVal?.url?.trim() || '');
  const hasValidMedia = Boolean(imgSrc);

  if (!hasValidMedia && (variant === 'default' || variant === 'text-left-image-right' || variant === 'text-right-image-left')) {
    variant = 'no-image';
  }

  const bodyText = slide.slotValues?.body || (typeof slide.slotValues?.card === 'string' ? slide.slotValues.card : '') || cardEl?.content || '';
  const cardHtml = `
    <div class="concept-card" id="${cardEl?.id || 'txt-def'}">
      <p class="concept-quote">“${formatSlotText(bodyText, 'Nhập nội dung định nghĩa/khái niệm...')}”</p>
    </div>
  `;

  const mediaHtml = hasValidMedia ? renderMediaBlock(slide, imgEl, 'img-concept', 'concept-image-wrap') : '';

  return `
    <div class="hf-template-concept-explain variant-${variant}">
      <div>
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
        </div>
        ${cardHtml}
      </div>
      ${mediaHtml}
    </div>
  `;
}

/**
 * 4. Bullet Breakdown
 */
function renderBulletBreakdown(slide) {
  const cardEls = slide.elements?.filter(e => e.type === 'card') || [];

  const cardsHtml = cardEls.map((c, idx) => {
    const heading = c.content?.heading || `Điểm ${idx + 1}`;
    const body = c.content?.body || (typeof c.content === 'string' ? c.content : '');
    return `
      <div class="breakdown-card" id="${c.id || `card-${idx}`}">
        <div class="breakdown-card-head">
          <div class="breakdown-icon">${idx + 1}</div>
          <h3 class="breakdown-title">${escapeHtml(heading)}</h3>
        </div>
        <p class="breakdown-body">${escapeHtml(body)}</p>
      </div>
    `;
  }).join('\n');

  return `
    <div class="hf-template-bullet-breakdown">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="cards-breakdown-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/**
 * 5. Image Explain
 */
function renderImageExplain(slide) {
  let variant = slide.variantId || slide.layoutVariant || 'default';
  const imgEl = slide.elements?.find(e => e.type === 'image');
  const vidEl = slide.elements?.find(e => e.type === 'video');
  const txtEl = slide.elements?.find(e => e.type === 'text');

  const mediaVal = slide.slotValues?.media || imgEl?.content || vidEl?.content;
  const imgSrc = (typeof mediaVal === 'string') ? mediaVal.trim() : (mediaVal?.url?.trim() || '');
  const hasValidMedia = Boolean(imgSrc);

  if (!hasValidMedia && (variant === 'default' || variant === 'text-left-image-right' || variant === 'text-right-image-left')) {
    variant = 'no-image';
  }

  const sideText = slide.slotValues?.sideText || txtEl?.content || '';
  const mediaHtml = hasValidMedia ? renderMediaBlock(slide, imgEl, 'img-diagram', 'explain-image-wrap') : '';

  return `
    <div class="hf-template-image-explain variant-${variant}">
      ${mediaHtml}
      <div>
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
        </div>
        <div class="explain-text-card" id="${txtEl?.id || 'txt-side'}">
          <p>${escapeHtml(sideText)}</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * 6. Comparison
 */
function renderComparison(slide) {
  const cols = slide.elements?.filter(e => e.type === 'card') || [];
  const colLeft = cols[0];
  const colRight = cols[1];

  const renderCol = (c, sideClass) => {
    if (!c) return '';
    const title = c.content?.title || (sideClass === 'col-left' ? 'Vế Thứ Nhất' : 'Vế Thứ Hai');
    const items = Array.isArray(c.content?.items) ? c.content.items : [];
    return `
      <div class="comparison-col ${sideClass}" id="${c.id}">
        <div class="comparison-col-header">
          <span>${sideClass === 'col-left' ? '⚖️' : '⚡'}</span>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <ul class="comparison-list">
          ${items.map(it => `<li><span>✓</span> ${escapeHtml(it)}</li>`).join('\n')}
        </ul>
      </div>
    `;
  };

  return `
    <div class="hf-template-comparison">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="comparison-grid">
        ${renderCol(colLeft, 'col-left')}
        ${renderCol(colRight, 'col-right')}
      </div>
    </div>
  `;
}

/**
 * 7. Timeline
 */
function renderTimeline(slide) {
  const timelineEl = slide.elements?.find(e => e.type === 'timeline-step' || e.type === 'timeline');
  const steps = Array.isArray(timelineEl?.content) ? timelineEl.content : [];

  const stepsHtml = steps.map((s, idx) => `
    <div class="timeline-step-card step-${idx} ${s.highlight ? 'highlight' : ''}">
      <div class="timeline-time-badge">${escapeHtml(s.time)}</div>
      <div class="timeline-event-title">${escapeHtml(s.event)}</div>
      ${s.desc ? `<p class="timeline-event-desc">${escapeHtml(s.desc)}</p>` : ''}
    </div>
  `).join('\n');

  return `
    <div class="hf-template-timeline">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="timeline-track-wrap" id="${timelineEl?.id || 'timeline-track'}">
        <div class="timeline-line"></div>
        <div class="timeline-steps-container">
          ${stepsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * 8. Formula Explain
 */
function renderFormulaExplain(slide) {
  const formulaEl = slide.elements?.find(e => e.type === 'formula');
  const noteEl = slide.elements?.find(e => e.type === 'text');

  return `
    <div class="hf-template-formula-explain">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="formula-stage">
        <div class="formula-display-box" id="${formulaEl?.id || 'formula-box'}">
          ${escapeHtml(formulaEl?.content || '')}
        </div>
        ${noteEl ? `
          <div class="formula-explanation-box" id="${noteEl.id || 'formula-note'}">
            ${escapeHtml(noteEl.content)}
          </div>` : ''}
      </div>
    </div>
  `;
}

/**
 * 9. Quiz
 */
function renderQuiz(slide) {
  const quizEl = slide.elements?.find(e => e.type === 'quiz-block');
  const qData = quizEl?.content || {};
  const question = qData.question || 'Câu hỏi củng cố kiến thức:';
  const options = Array.isArray(qData.options) ? qData.options : [];
  const correctIdx = qData.correctIndex ?? 0;

  const optionsHtml = options.map((opt, idx) => `
    <div class="quiz-option opt-${idx} ${idx === correctIdx ? 'correct' : ''}">
      <span class="quiz-badge">${String.fromCharCode(65 + idx)}</span>
      <span>${escapeHtml(opt.replace(/^[A-D]\.\s*/, ''))}</span>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-quiz">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="quiz-container" id="${quizEl?.id || 'quiz-box'}">
        <div class="quiz-question-box question-txt">
          ❓ ${escapeHtml(question)}
        </div>
        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * 10. Summary
 */
function renderSummary(slide) {
  const listEl = slide.elements?.find(e => e.type === 'bullet-list');
  const bullets = Array.isArray(listEl?.content) ? listEl.content : [];

  const bulletsHtml = bullets.map((b, idx) => `
    <div class="summary-bullet-item">
      <div class="summary-bullet-icon">✦</div>
      <div class="summary-bullet-text">${escapeHtml(b)}</div>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-summary">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
      <div class="summary-card-deck" id="${listEl?.id || 'summary-points'}">
        ${bulletsHtml}
      </div>
    </div>
  `;
}

/**
 * Render a complete slide section element conforming to HyperFrames specifications
 */
export function renderSlide(slide, index = 0, startOffset = 0) {
  const packId = slide.packId || 'basic';
  const layoutId = slide.layoutId || slide.templateId || 'concept-explain';
  const renderer = RENDERERS[layoutId] || TEMPLATES[layoutId]?.render || renderConceptExplain;
  const innerHtml = renderer(slide);
  const start = slide.start !== undefined ? slide.start : startOffset;
  const duration = slide.durationSeconds || 16.0;
  const slideId = slide.slideId || `slide-${String(index + 1).padStart(2, '0')}`;
  const activeClass = index === 0 ? 'clip active' : 'clip';

  return `
    <!-- Slide ${index + 1}: [${packId}/${layoutId}] ${escapeHtml(slide.title)} -->
    <section id="${slideId}" class="${activeClass}" data-start="${start}" data-duration="${duration}">
      ${innerHtml}
    </section>
  `.trim();
}

/**
 * Build a GSAP timeline for a single slide based on its animations array
 */
export function buildGsapTimelineForSlide(slide, containerEl) {
  if (typeof gsap === 'undefined' || !containerEl) return null;
  const tl = gsap.timeline({ paused: true });
  if (!Array.isArray(slide.animations)) return tl;

  slide.animations.forEach(anim => {
    const targets = containerEl.querySelectorAll(anim.target);
    if (!targets || targets.length === 0) return;

    const delay = anim.delay || 0;
    const duration = anim.duration || 1.0;
    const ease = anim.easing || 'power2.out';

    switch (anim.preset) {
      case 'fade-in':
        tl.fromTo(targets, { opacity: 0 }, { opacity: 1, duration, ease }, delay);
        break;
      case 'slide-in':
        tl.fromTo(targets, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration, ease }, delay);
        break;
      case 'zoom-in':
        tl.fromTo(targets, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration, ease }, delay);
        break;
      case 'typewriter':
        tl.fromTo(targets, { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration, ease }, delay);
        break;
      case 'step-by-step':
        tl.fromTo(targets, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration, ease, stagger: 0.25 }, delay);
        break;
      case 'highlight-keyword':
        tl.fromTo(targets, { outline: '2px solid transparent' }, { outline: '2px solid var(--hf-accent-amber)', duration, ease }, delay);
        break;
      default:
        tl.fromTo(targets, { opacity: 0 }, { opacity: 1, duration, ease }, delay);
        break;
    }
  });

  return tl;
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format slot text with placeholder fallback when empty (P3.3)
 */
export function formatSlotText(str, placeholder = 'Nhấp để thêm nội dung...') {
  if (str === null || str === undefined || String(str).trim() === '') {
    return `<span class="slot-placeholder" data-slot-placeholder="true" style="opacity: 0.5; font-style: italic;">✎ ${escapeHtml(placeholder)}</span>`;
  }
  return escapeHtml(str);
}


