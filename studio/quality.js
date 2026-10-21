/**
 * studio/quality.js
 * Pure functions for Pedagogical Quality Review of lesson slides (P7.4).
 * Audits text density, reading speed, duration, accessibility, and fill ratio.
 */

export const DEFAULT_THRESHOLDS = {
  maxTextChars: 350,
  maxWordsPerSlide: 55,
  maxWordsPerSecond: 4.5,
  minWordsPerSecond: 1.5,
  minDurationSeconds: 3.0,
  maxDurationSeconds: 90.0
};

/**
 * Count total characters across slide slotValues and text elements
 * @param {object} slide 
 * @returns {number}
 */
export function computeSlideTextLength(slide) {
  let len = 0;
  if (slide.slotValues && typeof slide.slotValues === 'object') {
    for (const [k, v] of Object.entries(slide.slotValues)) {
      if (typeof v === 'string') {
        len += v.trim().length;
      }
    }
  } else if (Array.isArray(slide.elements)) {
    for (const el of slide.elements) {
      if (typeof el.content === 'string') {
        len += el.content.trim().length;
      }
    }
  }
  return len;
}

/**
 * Count words in a string
 * @param {string} text 
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Audits a single slide for pedagogical quality issues.
 * Pure function.
 * 
 * @param {object} slide 
 * @param {number} slideIndex 
 * @param {object} [customThresholds] 
 * @returns {Array<object>} List of detected issues
 */
export function auditSlideQuality(slide, slideIndex = 0, customThresholds = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  const issues = [];
  const slideId = slide.slideId || `slide-${slideIndex + 1}`;

  // 1. Text Density
  const textLen = computeSlideTextLength(slide);
  if (textLen > t.maxTextChars) {
    issues.push({
      rule: 'TEXT_DENSITY_HIGH',
      level: 'warning',
      slideIndex,
      slideId,
      metric: textLen,
      threshold: t.maxTextChars,
      message: `Mật độ chữ quá cao (${textLen} ký tự > mức khuyến nghị ${t.maxTextChars}). Nên rút gọn hoặc tách sang slide mới.`
    });
  }

  // 2. Reading Speed (Words per second from narration and duration)
  const narration = slide.voice?.narration || '';
  const audioDur = slide.voice?.durationSeconds || slide.durationSeconds || 0;
  const wordCount = countWords(narration);

  if (wordCount > 0 && audioDur > 0) {
    const wps = Math.round((wordCount / audioDur) * 10) / 10;
    if (wps > t.maxWordsPerSecond) {
      issues.push({
        rule: 'READING_SPEED_FAST',
        level: 'warning',
        slideIndex,
        slideId,
        metric: wps,
        threshold: t.maxWordsPerSecond,
        message: `Tốc độ đọc quá nhanh (${wps} từ/giây > ${t.maxWordsPerSecond} từ/giây). Học sinh có thể không kịp tiếp thu.`
      });
    } else if (wps < t.minWordsPerSecond && audioDur > 5.0) {
      issues.push({
        rule: 'READING_SPEED_SLOW',
        level: 'info',
        slideIndex,
        slideId,
        metric: wps,
        threshold: t.minWordsPerSecond,
        message: `Tốc độ đọc khá chậm (${wps} từ/giây < ${t.minWordsPerSecond} từ/giây). Có thể tạo cảm giác chờ đợi.`
      });
    }
  }

  // 3. Slide Duration Extremes
  const dur = slide.durationSeconds || 0;
  if (dur < t.minDurationSeconds) {
    issues.push({
      rule: 'SLIDE_TOO_SHORT',
      level: 'error',
      slideIndex,
      slideId,
      metric: dur,
      threshold: t.minDurationSeconds,
      message: `Thời lượng slide quá ngắn (${dur}s < tối thiểu ${t.minDurationSeconds}s). Người học sẽ bị lướt qua quá nhanh.`
    });
  } else if (dur > t.maxDurationSeconds) {
    issues.push({
      rule: 'SLIDE_TOO_LONG',
      level: 'warning',
      slideIndex,
      slideId,
      metric: dur,
      threshold: t.maxDurationSeconds,
      message: `Thời lượng slide quá dài (${dur}s > khuyến nghị ${t.maxDurationSeconds}s). Nên chia nhỏ bài giảng.`
    });
  }

  // 4. Missing Alt Text on Images
  if (Array.isArray(slide.elements)) {
    slide.elements.forEach((el, elIdx) => {
      if (el.type === 'image' && el.content) {
        if (!el.alt || el.alt.trim().length === 0) {
          issues.push({
            rule: 'MISSING_ALT_TEXT',
            level: 'warning',
            slideIndex,
            slideId,
            elementId: el.id || `img-${elIdx}`,
            message: `Hình ảnh minh họa thiếu mô tả trợ năng (alt text). Cần thêm alt text cho người khiếm thị.`
          });
        }
      }
    });
  }

  // 5. Empty Slide (No text content and no elements)
  const hasContent = textLen > 0 || (Array.isArray(slide.elements) && slide.elements.length > 0);
  if (!hasContent) {
    issues.push({
      rule: 'SLIDE_EMPTY',
      level: 'error',
      slideIndex,
      slideId,
      message: `Slide hoàn toàn trống rỗng, chưa có nội dung hoặc khối trực quan nào.`
    });
  }

  return issues;
}

/**
 * Audits an entire presentation deck for pedagogical quality.
 * Pure function.
 * 
 * @param {object} scene 
 * @param {object} [customThresholds] 
 * @returns {object} Quality Report { score, issues, summary }
 */
export function auditDeckQuality(scene, customThresholds = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  const slides = scene?.slides || [];
  const allIssues = [];

  slides.forEach((slide, idx) => {
    const slideIssues = auditSlideQuality(slide, idx, t);
    allIssues.push(...slideIssues);
  });

  const errorCount = allIssues.filter(i => i.level === 'error').length;
  const warningCount = allIssues.filter(i => i.level === 'warning').length;
  const infoCount = allIssues.filter(i => i.level === 'info').length;

  // Pedagogical Score: 100 - (15 per error) - (5 per warning) - (2 per info)
  let rawScore = 100 - (errorCount * 15) - (warningCount * 5) - (infoCount * 2);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    thresholds: t,
    totalSlides: slides.length,
    totalDurationSeconds: scene?.totalDurationSeconds || 0,
    issues: allIssues,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      infos: infoCount,
      passedSlides: slides.length - new Set(allIssues.map(i => i.slideIndex)).size
    }
  };
}
