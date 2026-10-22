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
        <video id="${vidEl.id || defaultId}" class="hf-embedded-video" src="${escapeHtml(videoSrc)}"
          data-start="${slide.start || 0}" data-duration="${duration}"
          data-media-start="${trimStart}" data-media-end="${trimEnd}"
          data-volume="${effectiveVolume.toFixed(1)}" data-ducking="${vidEl.ducking ? 'true' : 'false'}"
          ${hasAudioAttr} ${mutedAttr} ${posterAttr} playsinline preload="metadata"
          style="width: 100%; height: 100%; object-fit: contain; background: #000000; border-radius: 8px;">
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

function getSlideTitle(slide, defaultTitle = 'Slide Tiêu Đề') {
  if (slide.title && String(slide.title).trim()) return String(slide.title).trim();
  if (slide.slotValues?.title && String(slide.slotValues.title).trim()) return String(slide.slotValues.title).trim();
  if (slide.slotValues?.heading && String(slide.slotValues.heading).trim()) return String(slide.slotValues.heading).trim();
  return defaultTitle;
}

function getSlideSubtitle(slide) {
  if (slide.subtitle && String(slide.subtitle).trim()) return String(slide.subtitle).trim();
  if (slide.slotValues?.subtitle && String(slide.slotValues.subtitle).trim()) return String(slide.slotValues.subtitle).trim();
  if (slide.slotValues?.sub && String(slide.slotValues.sub).trim()) return String(slide.slotValues.sub).trim();
  return '';
}

/**
 * 1. Title Slide (Hero)
 */
function renderTitleSlide(slide) {
  let variant = slide.layoutVariant || slide.variantId || 'default';
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

  const title = getSlideTitle(slide, 'Tiêu Đề Bài Giảng');
  const subtitle = getSlideSubtitle(slide);

  const badgeText = slide.slotValues?.badge || badgeEl?.content;
  const badgeHtml = badgeText ? `<div id="${badgeEl?.id || 'badge-course'}" class="hf-badge">${escapeHtml(badgeText)}</div>` : '';
  let authorText = slide.slotValues?.author || authorEl?.content;
  if (authorText) {
    const rawLower = String(authorText).toLowerCase().trim();
    if (['myduyen', 'banmai', 'hamy', 'leminh', 'naman', 'phuongtrang', 'giảng viên: myduyen', 'giảng viên: banmai', 'giảng viên: hamy'].some(v => rawLower === v || rawLower.endsWith(v))) {
      authorText = '';
    }
  }
  const authorHtml = authorText ? `<div id="${authorEl?.id || 'txt-author'}" class="title-hero-author"><span style="display:inline-flex;align-items:center;margin-right:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> ${escapeHtml(authorText)}</div>` : '';

  const mediaHtml = hasValidMedia ? renderMediaBlock(slide, imgEl, 'img-hero', 'title-hero-image-wrap') : '';

  return `
    <div class="hf-template-title-slide variant-${variant}">
      <div class="title-hero-content">
        ${badgeHtml}
        <h1 class="slide-title title-hero-heading">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="title-hero-sub">${escapeHtml(subtitle)}</p>` : ''}
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
  const title = getSlideTitle(slide, 'Mục Tiêu Bài Học');
  const subtitle = getSlideSubtitle(slide);

  const listEl = slide.elements?.find(e => e.type === 'bullet-list');
  const items = (Array.isArray(listEl?.content) && listEl.content.length > 0) 
    ? listEl.content 
    : (Array.isArray(slide.slotValues?.bullets) ? slide.slotValues.bullets : []);

  const itemsHtml = items.map((item, idx) => `
    <div class="objective-item obj-item-${idx}">
      <div class="objective-num">${String(idx + 1).padStart(2, '0')}</div>
      <div class="objective-text">${escapeHtml(String(item).replace(/^\d+[\.\)]\s*/, ''))}</div>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-learning-objectives">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
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
  let variant = slide.layoutVariant || slide.variantId || 'default';
  const title = getSlideTitle(slide, 'Giải Thích Khái Niệm');
  const subtitle = getSlideSubtitle(slide);

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
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${cardHtml}
      </div>
      ${mediaHtml}
    </div>
  `;
}

/**
 * 4. Bullet Breakdown
 * Supports 5 variants:
 * - default: Classical elegant cards grid
 * - tree-hierarchy: Tree branch logic flow with capsule pills
 * - contour-numbers: 2x2 grid with thick contour outline numbers
 * - skewed-badges: 2-column list with 3D skewed parallelogram badges
 * - visual-anchor: Left anchor illustration/concept + right 2-col micro items
 */
function renderBulletBreakdown(slide) {
  const variant = slide.layoutVariant || slide.variantId || 'default';
  const title = getSlideTitle(slide, 'Phân Tích Chi Tiết');
  const subtitle = getSlideSubtitle(slide);

  let cardEls = slide.elements?.filter(e => e.type === 'card') || [];
  if (cardEls.length === 0) {
    const rawCards = slide.slotValues?.cards || slide.slotValues?.bullets || [];
    if (Array.isArray(rawCards) && rawCards.length > 0) {
      cardEls = rawCards.map((c, idx) => ({
        id: `card-${idx}`,
        type: 'card',
        content: typeof c === 'object' ? c : { heading: `Điểm ${idx + 1}`, body: String(c) }
      }));
    }
  }

  const cards = cardEls.map((c, idx) => {
    const heading = c.content?.heading || `Điểm ${idx + 1}`;
    const body = c.content?.body || (typeof c.content === 'string' ? c.content : '');
    return {
      id: c.id || `card-${idx}`,
      heading,
      body,
      index: idx
    };
  });

  // Variant 1: Tree Hierarchy (Hierarchy List)
  if (variant === 'tree-hierarchy') {
    return `
      <div class="hf-template-bullet-breakdown variant-tree-hierarchy">
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="breakdown-tree-wrap">
          <div class="tree-root-col">
            <div class="tree-root-pill">
              <span class="tree-root-text">${escapeHtml(title)}</span>
            </div>
          </div>
          <div class="tree-branches-col">
            <div class="tree-connector-line"></div>
            <div class="tree-nodes-list">
              ${cards.map((c, i) => `
                <div class="tree-node-row tree-node-color-${i % 5}" id="${c.id}">
                  <div class="tree-node-branch"></div>
                  <div class="tree-node-pill">
                    <span class="tree-node-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    </span>
                    <span class="tree-node-title">${escapeHtml(c.heading)}</span>
                  </div>
                  <div class="tree-node-body">${escapeHtml(c.body)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Variant 2: Contour Numbers (Infographic Numbered List)
  if (variant === 'contour-numbers') {
    return `
      <div class="hf-template-bullet-breakdown variant-contour-numbers">
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="breakdown-contour-grid count-${cards.length}">
          ${cards.slice(0, 4).map((c, i) => `
            <div class="contour-card contour-color-${i % 4}" id="${c.id}">
              <div class="contour-num-box">
                <span class="contour-num">${i + 1}</span>
              </div>
              <div class="contour-card-content">
                <h3 class="contour-heading">${escapeHtml(c.heading)}</h3>
                <p class="contour-body">${escapeHtml(c.body)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Variant 3: Skewed Badges (Simple Table of Contents / 3D Blocks)
  if (variant === 'skewed-badges') {
    return `
      <div class="hf-template-bullet-breakdown variant-skewed-badges">
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="breakdown-skewed-grid count-${cards.length}">
          ${cards.map((c, i) => `
            <div class="skewed-item-row skewed-color-${i % 6}" id="${c.id}">
              <div class="skewed-badge-box">
                <span class="skewed-num">${String(i + 1).padStart(2, '0')}</span>
              </div>
              <div class="skewed-text-content">
                <h3 class="skewed-title">${escapeHtml(c.heading)}</h3>
                <p class="skewed-desc">${escapeHtml(c.body)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Variant 4: Visual Anchor & List (Calculator & List style)
  if (variant === 'visual-anchor') {
    return `
      <div class="hf-template-bullet-breakdown variant-visual-anchor">
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="breakdown-anchor-layout">
          <div class="anchor-hero-widget">
            <div class="anchor-hero-box">
              <div class="anchor-hero-screen">
                <span class="anchor-screen-label">${escapeHtml(title)}</span>
              </div>
              <div class="anchor-keypad-grid">
                <span class="key-dot active"></span><span class="key-dot"></span><span class="key-dot"></span><span class="key-dot"></span>
                <span class="key-dot"></span><span class="key-dot"></span><span class="key-dot"></span><span class="key-dot"></span>
                <span class="key-dot"></span><span class="key-dot"></span><span class="key-dot highlight"></span><span class="key-dot"></span>
              </div>
            </div>
          </div>
          <div class="anchor-items-grid count-${cards.length}">
            ${cards.map((c, i) => `
              <div class="anchor-micro-item" id="${c.id}">
                <div class="anchor-squircle-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <div class="anchor-item-content">
                  <h4 class="anchor-item-title">${escapeHtml(c.heading)}</h4>
                  <p class="anchor-item-body">${escapeHtml(c.body)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Variant 0: Default Grid (Elevated)
  const cardsHtml = cards.map((c, idx) => `
    <div class="breakdown-card" id="${c.id}">
      <div class="breakdown-card-head">
        <div class="breakdown-icon">${idx + 1}</div>
        <h3 class="breakdown-title">${escapeHtml(c.heading)}</h3>
      </div>
      <p class="breakdown-body">${escapeHtml(c.body)}</p>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-bullet-breakdown variant-default">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="cards-breakdown-grid count-${cards.length}">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/**
 * 5. Image Explain
 */
function renderImageExplain(slide) {
  let variant = slide.layoutVariant || slide.variantId || 'default';
  const title = getSlideTitle(slide, 'Minh Họa Hình Ảnh / Sơ Đồ');
  const subtitle = getSlideSubtitle(slide);

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
          <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
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
  const title = getSlideTitle(slide, 'So Sánh & Đối Chiếu');
  const subtitle = getSlideSubtitle(slide);

  let cols = slide.elements?.filter(e => e.type === 'card') || [];
  if (cols.length === 0) {
    const leftData = slide.slotValues?.leftColumn || slide.slotValues?.left || { title: 'Vế Thứ Nhất', items: [] };
    const rightData = slide.slotValues?.rightColumn || slide.slotValues?.right || { title: 'Vế Thứ Hai', items: [] };
    cols = [
      { id: 'col-left', type: 'card', content: typeof leftData === 'object' ? leftData : { title: 'Vế Thứ Nhất', items: [String(leftData)] } },
      { id: 'col-right', type: 'card', content: typeof rightData === 'object' ? rightData : { title: 'Vế Thứ Hai', items: [String(rightData)] } }
    ];
  }

  const colLeft = cols[0];
  const colRight = cols[1];

  const renderCol = (c, sideClass) => {
    if (!c) return '';
    const colTitle = c.content?.title || (sideClass === 'col-left' ? 'Vế Thứ Nhất' : 'Vế Thứ Hai');
    const items = Array.isArray(c.content?.items) ? c.content.items : (Array.isArray(c.content) ? c.content : []);
    return `
      <div class="comparison-col ${sideClass}" id="${c.id || sideClass}">
        <div class="comparison-col-header">
          <span style="display:inline-flex;align-items:center;color:var(--hf-primary);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg></span>
          <h3>${escapeHtml(colTitle)}</h3>
        </div>
        <ul class="comparison-list">
          ${items.map(it => `<li><span>✓</span> ${escapeHtml(String(it))}</li>`).join('\n')}
        </ul>
      </div>
    `;
  };

  return `
    <div class="hf-template-comparison">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
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
  const title = getSlideTitle(slide, 'Tiến Trình & Mốc Thời Gian');
  const subtitle = getSlideSubtitle(slide);

  const timelineEl = slide.elements?.find(e => e.type === 'timeline-step' || e.type === 'timeline');
  const steps = (Array.isArray(timelineEl?.content) && timelineEl.content.length > 0)
    ? timelineEl.content
    : (Array.isArray(slide.slotValues?.timeline) ? slide.slotValues.timeline : (Array.isArray(slide.slotValues?.steps) ? slide.slotValues.steps : []));

  const stepsHtml = steps.map((s, idx) => `
    <div class="timeline-step-card step-${idx} ${s.highlight ? 'highlight' : ''}">
      <div class="timeline-time-badge">${escapeHtml(s.time || `Mốc ${idx + 1}`)}</div>
      <div class="timeline-event-title">${escapeHtml(s.event || s.title || `Sự kiện ${idx + 1}`)}</div>
      ${s.desc ? `<p class="timeline-event-desc">${escapeHtml(s.desc)}</p>` : ''}
    </div>
  `).join('\n');

  return `
    <div class="hf-template-timeline">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
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
  const title = getSlideTitle(slide, 'Công Thức & Định Lý');
  const subtitle = getSlideSubtitle(slide);

  const formulaEl = slide.elements?.find(e => e.type === 'formula');
  const noteEl = slide.elements?.find(e => e.type === 'text');
  const formulaText = formulaEl?.content || slide.slotValues?.formula || '';
  const noteText = noteEl?.content || slide.slotValues?.notes || (Array.isArray(slide.slotValues?.variables) ? slide.slotValues.variables.join(' • ') : '');

  return `
    <div class="hf-template-formula-explain">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="formula-stage">
        <div class="formula-display-box" id="${formulaEl?.id || 'formula-box'}">
          ${escapeHtml(formulaText)}
        </div>
        ${noteText ? `
          <div class="formula-explanation-box" id="${noteEl?.id || 'formula-note'}">
            ${escapeHtml(noteText)}
          </div>` : ''}
      </div>
    </div>
  `;
}

/**
 * 9. Quiz
 */
function renderQuiz(slide) {
  const title = getSlideTitle(slide, 'Câu Hỏi Củng Cố');
  const subtitle = getSlideSubtitle(slide);

  const quizEl = slide.elements?.find(e => e.type === 'quiz-block');
  const qData = quizEl?.content || {};
  const question = qData.question || slide.slotValues?.question || 'Câu hỏi củng cố kiến thức:';
  const options = (Array.isArray(qData.options) && qData.options.length > 0)
    ? qData.options
    : (Array.isArray(slide.slotValues?.options) ? slide.slotValues.options : []);
  const correctIdx = qData.correctIndex ?? slide.slotValues?.correctIndex ?? 0;

  const optionsHtml = options.map((opt, idx) => `
    <div class="quiz-option opt-${idx} ${idx === correctIdx ? 'correct' : ''}">
      <span class="quiz-badge">${String.fromCharCode(65 + idx)}</span>
      <span>${escapeHtml(String(opt).replace(/^[A-D]\.\s*/, ''))}</span>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-quiz">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="quiz-container" id="${quizEl?.id || 'quiz-box'}">
        <div class="quiz-question-box question-txt">
          <span style="display:inline-flex;align-items:center;margin-right:8px;color:var(--hf-primary);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
          <span>${escapeHtml(question)}</span>
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
  const title = getSlideTitle(slide, 'Tổng Kết Bài Học');
  const subtitle = getSlideSubtitle(slide);

  const listEl = slide.elements?.find(e => e.type === 'bullet-list');
  const bullets = (Array.isArray(listEl?.content) && listEl.content.length > 0)
    ? listEl.content
    : (Array.isArray(slide.slotValues?.bullets) ? slide.slotValues.bullets : []);

  const bulletsHtml = bullets.map((b, idx) => `
    <div class="summary-bullet-item">
      <div class="summary-bullet-icon">✦</div>
      <div class="summary-bullet-text">${escapeHtml(String(b))}</div>
    </div>
  `).join('\n');

  return `
    <div class="hf-template-summary">
      <div class="hf-slide-header">
        <h2 class="slide-title hf-slide-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(subtitle)}</p>` : ''}
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

  let animList = Array.isArray(slide.animations) && slide.animations.length > 0
    ? slide.animations
    : null;

  if (!animList) {
    const packId = slide.packId || 'basic';
    const layoutId = slide.layoutId || slide.templateId || 'concept-explain';
    const layout = TemplateRegistry.getLayout(packId, layoutId);
    if (layout?.defaultAnimations && layout.defaultAnimations.length > 0) {
      animList = layout.defaultAnimations;
    } else {
      animList = [
        { target: '.slide-title, .title-hero-heading', preset: 'slide-in', delay: 0.2, duration: 0.8 },
        { target: '.title-hero-sub, .hf-slide-subtitle, .hf-badge', preset: 'fade-in', delay: 0.4, duration: 0.6 },
        { target: '.concept-card, .objective-item, .breakdown-card, .explain-text-card, .comparison-col, .timeline-step-card, .formula-stage, .quiz-container, .summary-card-deck', preset: 'slide-in', delay: 0.6, duration: 0.8 },
        { target: 'img, video, .concept-image-wrap, .title-hero-image-wrap, .explain-image-wrap', preset: 'zoom-in', delay: 0.5, duration: 0.8 }
      ];
    }
  }

  animList.forEach(anim => {
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
        tl.fromTo(targets, { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration, ease }, delay);
        break;
      case 'zoom-in':
        tl.fromTo(targets, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration, ease }, delay);
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

  // Ensure the GSAP timeline spans the entire slide duration so scrubbing matches durationSeconds
  const maxDur = Math.max(1.0, slide.durationSeconds || 5.0);
  tl.set({}, {}, maxDur);

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


