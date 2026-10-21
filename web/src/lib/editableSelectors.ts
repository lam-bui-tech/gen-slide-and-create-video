/**
 * web/src/lib/editableSelectors.ts
 * AI Lecture Studio — Editable Canvas Selectors & Content Hashing
 * Defines the 12 CSS selectors that support inline editing on the slide canvas,
 * event delegation helpers, and slide hashing for caret preservation.
 */

export interface EditableSelectorDef {
  /** The CSS selector class */
  selector: string;
  /** Human-readable description of what this selector targets */
  description: string;
  /** What field or element it maps to */
  targetType: 'title' | 'subtitle' | 'concept-quote' | 'element-content' | 'generic';
}

export const EDITABLE_SELECTORS: EditableSelectorDef[] = [
  {
    selector: '.slide-title',
    description: 'Primary slide title or heading across templates (maps to slide.title)',
    targetType: 'title',
  },
  {
    selector: '.title-hero-sub',
    description: 'Hero subtitle on title-slide (maps to slide.subtitle)',
    targetType: 'subtitle',
  },
  {
    selector: '.concept-quote',
    description: 'Central definition quote block on concept-explain (maps to card/text element)',
    targetType: 'concept-quote',
  },
  {
    selector: '.breakdown-title',
    description: 'Card title inside bullet-breakdown template items',
    targetType: 'element-content',
  },
  {
    selector: '.breakdown-body',
    description: 'Card body or description inside bullet-breakdown template items',
    targetType: 'element-content',
  },
  {
    selector: '.timeline-event-title',
    description: 'Event title header in timeline template milestones',
    targetType: 'element-content',
  },
  {
    selector: '.timeline-event-desc',
    description: 'Event description text in timeline template milestones',
    targetType: 'element-content',
  },
  {
    selector: '.formula-display-box',
    description: 'Main mathematical equation / formula text in formula-explain',
    targetType: 'element-content',
  },
  {
    selector: '.formula-note-text',
    description: 'Explanatory footnote beneath math formula in formula-explain',
    targetType: 'element-content',
  },
  {
    selector: '.question-txt',
    description: 'Main question heading inside quiz template',
    targetType: 'element-content',
  },
  {
    selector: '.quiz-opt-text',
    description: 'Option label or explanation in quiz choices',
    targetType: 'element-content',
  },
  {
    selector: '.objective-text',
    description: 'Item bullet text in learning-objectives template',
    targetType: 'element-content',
  },
  {
    selector: '.summary-bullet-text',
    description: 'Summary key takeaway bullet item in summary template',
    targetType: 'element-content',
  },
];

/** Combined selector string for querySelectorAll */
export const EDITABLE_SELECTORS_STRING = EDITABLE_SELECTORS.map((s) => s.selector).join(', ');

/**
 * Checks if a DOM element matches any of the 12 editable selectors.
 */
export function isEditableElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  return EDITABLE_SELECTORS.some((def) => el.matches(def.selector));
}

/**
 * Returns matching EditableSelectorDef for an element, if any.
 */
export function getEditableDefinition(el: Element | null): EditableSelectorDef | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  for (const def of EDITABLE_SELECTORS) {
    if (el.matches(def.selector)) return def;
  }
  return null;
}

/**
 * Deterministic hash of slide contents used to detect when the canvas
 * HTML must actually be re-rendered vs when an inline edit is in progress.
 */
export function computeSlideHash(slide: any): string {
  if (!slide) return '';
  const keyParts = [
    slide.slideId || '',
    slide.templateId || slide.layoutId || '',
    slide.layoutVariant || slide.variantId || '',
    slide.title || '',
    slide.subtitle || '',
    JSON.stringify(slide.elements || []),
    JSON.stringify(slide.slotValues || {}),
    JSON.stringify(slide.media || []),
    JSON.stringify(slide.animations || []),
  ];
  return keyParts.join(':::');
}

/**
 * Format seconds to MM:SS.S display string (e.g. 16.0 -> "00:16.0")
 */
export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
