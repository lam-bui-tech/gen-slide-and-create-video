/**
 * studio/outline_editor.js
 * Pedagogical Outline review & mutation engine for Studio v2 (P3.3).
 * Owned by Person B (Engine/Studio).
 */

export function updateOutlineSlide(outline, slideIndex, changes) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('Invalid outline object');
  }
  const next = JSON.parse(JSON.stringify(outline));
  if (slideIndex < 0 || slideIndex >= next.slides.length) {
    throw new Error(`Slide index out of bounds: ${slideIndex}`);
  }
  Object.assign(next.slides[slideIndex], changes);
  return next;
}

export function addOutlineSlide(outline, newSlideData = {}, targetIndex = null) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('Invalid outline object');
  }
  const next = JSON.parse(JSON.stringify(outline));
  const insertAt = (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= next.slides.length)
    ? targetIndex
    : next.slides.length;

  const slide = {
    slideIndex: insertAt,
    title: newSlideData.title || 'Slide Mới',
    layoutId: newSlideData.layoutId || 'concept-explain',
    visualNeed: newSlideData.visualNeed || 'none',
    pedagogicalGoal: newSlideData.pedagogicalGoal || '',
    keyPoints: newSlideData.keyPoints || [],
    ...newSlideData
  };

  next.slides.splice(insertAt, 0, slide);
  // Re-index all slides
  next.slides.forEach((s, idx) => { s.slideIndex = idx; });
  return next;
}

export function removeOutlineSlide(outline, slideIndex) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('Invalid outline object');
  }
  const next = JSON.parse(JSON.stringify(outline));
  if (slideIndex < 0 || slideIndex >= next.slides.length) {
    throw new Error(`Slide index out of bounds: ${slideIndex}`);
  }
  next.slides.splice(slideIndex, 1);
  next.slides.forEach((s, idx) => { s.slideIndex = idx; });
  return next;
}

export function reorderOutlineSlides(outline, fromIndex, toIndex) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('Invalid outline object');
  }
  const next = JSON.parse(JSON.stringify(outline));
  if (
    fromIndex < 0 || fromIndex >= next.slides.length ||
    toIndex < 0 || toIndex >= next.slides.length
  ) {
    throw new Error('Reorder indices out of bounds');
  }
  const [moved] = next.slides.splice(fromIndex, 1);
  next.slides.splice(toIndex, 0, moved);
  next.slides.forEach((s, idx) => { s.slideIndex = idx; });
  return next;
}

export function approveOutline(outline) {
  if (!outline || !Array.isArray(outline.slides)) {
    throw new Error('Invalid outline object');
  }
  const next = JSON.parse(JSON.stringify(outline));
  next.status = 'approved';
  next.slides.forEach((s, idx) => { s.slideIndex = idx; });
  return next;
}
