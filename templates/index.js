/**
 * templates/index.js
 * Template Registry and Component Renderers for 10 HyperFrames Academic Pro Templates
 * Works directly from fixtures/scene.sample.json and schemas/lesson_scene.json
 */

export const TEMPLATES = {
  'title-slide': {
    id: 'title-slide',
    name: 'Slide Tiêu Đề (Hero Title)',
    category: 'intro',
    supportedVariants: ['default', 'fullscreen', 'text-left-image-right', 'text-right-image-left'],
    render: renderTitleSlide
  },
  'learning-objectives': {
    id: 'learning-objectives',
    name: 'Mục Tiêu Bài Học (Learning Objectives)',
    category: 'intro',
    supportedVariants: ['default', 'stacked-top', 'no-image'],
    render: renderLearningObjectives
  },
  'concept-explain': {
    id: 'concept-explain',
    name: 'Giải Thích Khái Niệm (Concept Explain)',
    category: 'core',
    supportedVariants: ['default', 'text-left-image-right', 'text-right-image-left', 'no-image'],
    render: renderConceptExplain
  },
  'bullet-breakdown': {
    id: 'bullet-breakdown',
    name: 'Phân Tích Luận Điểm (Bullet Breakdown)',
    category: 'core',
    supportedVariants: ['default', 'stacked-top'],
    render: renderBulletBreakdown
  },
  'image-explain': {
    id: 'image-explain',
    name: 'Sơ Đồ / Hình Ảnh Trực Quan (Image Explain)',
    category: 'diagram',
    supportedVariants: ['default', 'text-left-image-right', 'text-right-image-left'],
    render: renderImageExplain
  },
  'comparison': {
    id: 'comparison',
    name: 'So Sánh Đối Chiếu 2 Cột (Comparison)',
    category: 'analysis',
    supportedVariants: ['default', 'stacked-top'],
    render: renderComparison
  },
  'timeline': {
    id: 'timeline',
    name: 'Trục Tiến Trình Thời Gian (Timeline)',
    category: 'process',
    supportedVariants: ['default', 'stacked-top'],
    render: renderTimeline
  },
  'formula-explain': {
    id: 'formula-explain',
    name: 'Công Thức & Định Lý (Formula Explain)',
    category: 'core',
    supportedVariants: ['default', 'stacked-top'],
    render: renderFormulaExplain
  },
  'quiz': {
    id: 'quiz',
    name: 'Câu Hỏi Tương Tác (Interactive Quiz)',
    category: 'interaction',
    supportedVariants: ['default', 'stacked-top'],
    render: renderQuiz
  },
  'summary': {
    id: 'summary',
    name: 'Tổng Kết Bài Học (Summary & Takeaways)',
    category: 'conclusion',
    supportedVariants: ['default', 'no-image', 'stacked-top'],
    render: renderSummary
  }
};

/**
 * 1. Title Slide (Hero)
 */
function renderTitleSlide(slide) {
  const variant = slide.layoutVariant || 'default';
  const badgeEl = slide.elements?.find(e => e.type === 'badge');
  const authorEl = slide.elements?.find(e => e.id === 'txt-author' || e.type === 'text');
  const imgEl = slide.elements?.find(e => e.type === 'image');

  const badgeHtml = badgeEl ? `<div id="${badgeEl.id || 'badge-course'}" class="hf-badge">${escapeHtml(badgeEl.content)}</div>` : '';
  const authorHtml = authorEl ? `<div id="${authorEl.id || 'txt-author'}" class="title-hero-author"><span>👨‍🏫</span> ${escapeHtml(authorEl.content)}</div>` : '';
  const imgHtml = imgEl ? `
    <div class="title-hero-image-wrap">
      <img id="${imgEl.id || 'img-hero'}" src="${escapeHtml(imgEl.content)}" alt="${escapeHtml(slide.title)}" onerror="this.src='https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80'" />
    </div>` : '';

  return `
    <div class="hf-template-title-slide variant-${variant}">
      <div class="title-hero-content">
        ${badgeHtml}
        <h1 class="slide-title title-hero-heading">${escapeHtml(slide.title)}</h1>
        ${slide.subtitle ? `<p class="title-hero-sub">${escapeHtml(slide.subtitle)}</p>` : ''}
        ${authorHtml}
      </div>
      ${imgHtml}
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
  const variant = slide.layoutVariant || 'default';
  const cardEl = slide.elements?.find(e => e.type === 'card' || e.type === 'text');
  const imgEl = slide.elements?.find(e => e.type === 'image');

  const cardHtml = `
    <div class="concept-card" id="${cardEl?.id || 'txt-def'}">
      <p class="concept-quote">“${escapeHtml(cardEl?.content || '')}”</p>
    </div>
  `;

  const imgHtml = imgEl ? `
    <div class="concept-image-wrap">
      <img id="${imgEl.id || 'img-concept'}" src="${escapeHtml(imgEl.content)}" alt="${escapeHtml(slide.title)}" onerror="this.src='https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80'" />
    </div>` : '';

  return `
    <div class="hf-template-concept-explain variant-${variant}">
      <div>
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
        </div>
        ${cardHtml}
      </div>
      ${imgHtml}
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
  const variant = slide.layoutVariant || 'default';
  const imgEl = slide.elements?.find(e => e.type === 'image');
  const txtEl = slide.elements?.find(e => e.type === 'text');

  return `
    <div class="hf-template-image-explain variant-${variant}">
      <div class="explain-image-wrap">
        <img id="${imgEl?.id || 'img-diagram'}" src="${escapeHtml(imgEl?.content || '')}" alt="${escapeHtml(slide.title)}" onerror="this.src='https://images.unsplash.com/photo-1507842229451-7f01be7fe7ab?w=800&auto=format&fit=crop&q=80'" />
      </div>
      <div>
        <div class="hf-slide-header">
          <h2 class="slide-title hf-slide-title">${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="hf-slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
        </div>
        <div class="explain-text-card" id="${txtEl?.id || 'txt-side'}">
          <p>${escapeHtml(txtEl?.content || '')}</p>
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
  const templateMeta = TEMPLATES[slide.templateId] || TEMPLATES['concept-explain'];
  const innerHtml = templateMeta.render(slide);
  const start = slide.start !== undefined ? slide.start : startOffset;
  const duration = slide.durationSeconds || 16.0;
  const slideId = slide.slideId || `slide-${String(index + 1).padStart(2, '0')}`;
  const activeClass = index === 0 ? 'clip active' : 'clip';

  return `
    <!-- Slide ${index + 1}: [${slide.templateId}] ${escapeHtml(slide.title)} -->
    <section id="${slideId}" class="${activeClass}" data-start="${start}" data-duration="${duration}">
      ${innerHtml}
    </section>
  `.trim();
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
