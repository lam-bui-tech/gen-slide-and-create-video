/**
 * templates/migration.js
 * Pure, idempotent migration engine from AI Lecture Studio v1 to v2 (Template-First)
 * JavaScript port of scripts/migrate_v1_to_v2.py.
 * Conforms strictly to docs/SPEC_V2.md §4, ADR-0006, and passes golden fixtures.
 */

/**
 * Pure, idempotent migration function converting a v1 LessonSceneJSON to v2.
 * If already v2 (schemaVersion >= 2 and packId present), returns an exact deep copy.
 *
 * @param {object} scene - LessonSceneJSON
 * @returns {object} Migrated LessonSceneJSON v2
 */
export function migrateSceneV1ToV2(scene) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('Input scene must be an object');
  }

  // Idempotent check
  if ((scene.schemaVersion ?? 1) >= 2 && scene.packId) {
    return JSON.parse(JSON.stringify(scene));
  }

  const v2Scene = JSON.parse(JSON.stringify(scene));
  v2Scene.schemaVersion = 2;
  v2Scene.packId = scene.packId || 'basic';

  const slides = v2Scene.slides || [];
  const migratedSlides = [];

  for (const slide of slides) {
    const mSlide = JSON.parse(JSON.stringify(slide));
    
    // 1. Map layoutId and variantId
    const layoutId = mSlide.layoutId || mSlide.templateId || 'concept-explain';
    const variantId = mSlide.variantId || mSlide.layoutVariant || 'default';
    mSlide.layoutId = layoutId;
    mSlide.variantId = variantId;

    // Preserve legacy aliases for backward compatibility
    mSlide.templateId = layoutId;
    mSlide.layoutVariant = variantId;

    // 2. Extract and initialize slotValues & media
    const slotValues = JSON.parse(JSON.stringify(mSlide.slotValues || {}));
    const mediaList = JSON.parse(JSON.stringify(mSlide.media || []));
    const remainingElements = [];

    // 3. Map v1 elements to v2 slotValues
    const elements = mSlide.elements || [];
    for (const el of elements) {
      const elType = el.type;
      const elId = el.id || '';
      const content = el.content;

      if (elType === 'badge') {
        if (slotValues.badge === undefined) slotValues.badge = content;

      } else if (elType === 'text' || elType === 'card') {
        if (elId === 'txt-author') {
          if (slotValues.author === undefined) slotValues.author = content;
        } else if (elId === 'txt-side') {
          if (slotValues.sideText === undefined) slotValues.sideText = content;
        } else if (elId === 'formula-note') {
          if (slotValues.note === undefined) slotValues.note = content;
        } else if (layoutId === 'comparison') {
          const lowerId = elId.toLowerCase();
          if (lowerId.includes('left') || lowerId.includes('materialism')) {
            if (slotValues.leftColumn === undefined) slotValues.leftColumn = content;
          } else if (lowerId.includes('right') || lowerId.includes('idealism')) {
            if (slotValues.rightColumn === undefined) slotValues.rightColumn = content;
          } else {
            remainingElements.push(el);
          }
        } else if (layoutId === 'bullet-breakdown') {
          if (!slotValues.cards) slotValues.cards = [];
          slotValues.cards.push(content);
        } else {
          if (content && typeof content === 'object') {
            if (slotValues.card === undefined) slotValues.card = content;
          } else {
            if (slotValues.body === undefined) slotValues.body = content;
          }
        }

      } else if (elType === 'bullet-list') {
        if (slotValues.bullets === undefined) slotValues.bullets = content;

      } else if (elType === 'image') {
        const imgUrl = typeof content === 'string' ? content : (content?.url || '');
        if (slotValues.media === undefined) slotValues.media = imgUrl;
        if (imgUrl && !mediaList.some(m => m.url === imgUrl)) {
          mediaList.push({
            id: elId || `media-${mediaList.length + 1}`,
            source: 'document',
            type: 'image',
            url: imgUrl,
            alt: mSlide.title || '',
            relevance: 1.0,
            license: 'educational-fair-use'
          });
        }

      } else if (elType === 'formula') {
        if (slotValues.formula === undefined) slotValues.formula = content;

      } else if (elType === 'quiz-block') {
        if (slotValues.quiz === undefined) slotValues.quiz = content;

      } else if (elType === 'timeline-step') {
        if (slotValues.timeline === undefined) slotValues.timeline = content;

      } else if (elType === 'comparison-table') {
        if (slotValues.comparison === undefined) slotValues.comparison = content;

      } else {
        remainingElements.push(el);
      }
    }

    mSlide.slotValues = slotValues;
    mSlide.media = mediaList;
    mSlide.elements = remainingElements;

    migratedSlides.push(mSlide);
  }

  v2Scene.slides = migratedSlides;
  return v2Scene;
}

/**
 * Transparent runtime in-memory helper for scene loading.
 * If input contains a v1 scene, migrates it to v2 without mutating the original.
 */
export function migrateOnRead(data) {
  if (data && typeof data === 'object' && Array.isArray(data.slides)) {
    return migrateSceneV1ToV2(data);
  }
  return data;
}
