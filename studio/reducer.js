/**
 * studio/reducer.js
 * AI Lecture Studio — Pure state reducer & patch engine
 * Implements immutable updates, schema validation, and audio-first sync calculation.
 */

import { TemplateRegistry } from '../templates/registry.js';

export const ALLOWED_TEMPLATES = TemplateRegistry.get('basic')?.layouts.map(l => l.id) || [
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
];

export const ALLOWED_VARIANTS = [
  'default',
  'text-left-image-right',
  'text-right-image-left',
  'stacked-top',
  'fullscreen',
  'no-image'
];

export const ALLOWED_PRESETS = [
  'fade-in',
  'slide-in',
  'zoom-in',
  'typewriter',
  'step-by-step',
  'highlight-keyword'
];

export const ALLOWED_TTS_PROVIDERS = ['vieneu', 'viettel', 'fake'];

/**
 * Validates a slide object against core LessonSceneJSON schema constraints.
 * Throws an Error with a descriptive message if invalid.
 */
export function validateSlide(slide) {
  if (!slide || typeof slide !== 'object') {
    throw new Error('Slide must be a non-null object');
  }
  if (!slide.slideId || typeof slide.slideId !== 'string') {
    throw new Error('Slide must have a valid string slideId');
  }
  const layoutId = slide.layoutId || slide.templateId;
  const packId = slide.packId || 'basic';
  const isValid = TemplateRegistry.hasLayout(packId, layoutId) || ALLOWED_TEMPLATES.includes(layoutId);
  if (!isValid) {
    throw new Error(`Invalid templateId: "${layoutId}". Must be one of ${ALLOWED_TEMPLATES.join(', ')}`);
  }
  if (!Array.isArray(slide.elements)) {
    throw new Error('Slide elements must be an array');
  }
  if (!Array.isArray(slide.animations)) {
    throw new Error('Slide animations must be an array');
  }
  for (const anim of slide.animations) {
    if (!anim.target || typeof anim.target !== 'string') {
      throw new Error('Animation item must have target selector');
    }
    if (!ALLOWED_PRESETS.includes(anim.preset)) {
      throw new Error(`Invalid animation preset: "${anim.preset}"`);
    }
    if (typeof anim.duration !== 'number' || anim.duration <= 0) {
      throw new Error('Animation duration must be a positive number');
    }
  }
  if (!slide.voice || typeof slide.voice !== 'object') {
    throw new Error('Slide must contain a voice object');
  }
  if (typeof slide.voice.narration !== 'string') {
    throw new Error('voice.narration must be a string');
  }
  if (slide.voice.provider && !ALLOWED_TTS_PROVIDERS.includes(slide.voice.provider)) {
    throw new Error(`Invalid voice provider: "${slide.voice.provider}"`);
  }
  if (typeof slide.durationSeconds !== 'number' || slide.durationSeconds < 1.0) {
    throw new Error(`Slide durationSeconds must be a number >= 1.0 (got ${slide.durationSeconds})`);
  }
  return true;
}

/**
 * Audio-first sync rule:
 * slide.durationSeconds = max(audio_duration + padding, last_animation_end, 3.0)
 */
export function computeSlideDuration(slide, padding = 1.0) {
  const audioDuration = (slide.voice && typeof slide.voice.durationSeconds === 'number') 
    ? slide.voice.durationSeconds 
    : 0;

  let maxAnimEnd = 0;
  if (Array.isArray(slide.animations)) {
    for (const a of slide.animations) {
      const end = (a.delay || 0) + (a.duration || 0);
      if (end > maxAnimEnd) maxAnimEnd = end;
    }
  }

  const audioRequired = audioDuration > 0 ? (audioDuration + padding) : 0;
  const calculated = Math.max(audioRequired, maxAnimEnd, 3.0);
  return Math.round(calculated * 10) / 10;
}

/**
 * Recomputes totalDurationSeconds across all slides.
 */
export function recomputeTotalDuration(slides) {
  if (!Array.isArray(slides)) return 0;
  return slides.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
}

/**
 * Pure reducer handling scene mutations.
 * Returns a new scene object, leaving the original state intact.
 */
export function sceneReducer(state, action) {
  if (!state) return state;

  // Deep clone to ensure immutability
  const next = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case 'SET_SCENE': {
      if (!action.payload || !Array.isArray(action.payload.slides)) {
        throw new Error('SET_SCENE requires a payload with slides array');
      }
      return JSON.parse(JSON.stringify(action.payload));
    }

    case 'UPDATE_SLIDE': {
      const { slideIndex, changes } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      Object.assign(slide, changes);
      validateSlide(slide);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'UPDATE_ELEMENT': {
      const { slideIndex, elementId, changes } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      const el = slide.elements.find(e => e.id === elementId);
      if (el) {
        Object.assign(el, changes);
      } else {
        // Fallback: match by index or push if elementId not found
        const idx = typeof elementId === 'number' ? elementId : -1;
        if (idx >= 0 && idx < slide.elements.length) {
          Object.assign(slide.elements[idx], changes);
        }
      }
      return next;
    }

    case 'UPDATE_VOICE': {
      const { slideIndex, changes, autoSync = true } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      if (!slide.voice) slide.voice = { narration: '', provider: 'vieneu' };
      Object.assign(slide.voice, changes);

      if (autoSync && typeof changes.durationSeconds === 'number') {
        slide.durationSeconds = computeSlideDuration(slide);
      }
      validateSlide(slide);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'SET_ANIMATION': {
      const { slideIndex, animIndex, animation } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      if (animIndex >= 0 && animIndex < slide.animations.length) {
        slide.animations[animIndex] = { ...slide.animations[animIndex], ...animation };
      } else {
        slide.animations.push(animation);
      }
      slide.durationSeconds = computeSlideDuration(slide);
      validateSlide(slide);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'REMOVE_ANIMATION': {
      const { slideIndex, animIndex } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      slide.animations.splice(animIndex, 1);
      slide.durationSeconds = computeSlideDuration(slide);
      validateSlide(slide);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'REORDER_SLIDES': {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex < 0 || fromIndex >= next.slides.length ||
        toIndex < 0 || toIndex >= next.slides.length
      ) {
        throw new Error('Reorder slide indices out of bounds');
      }
      const [moved] = next.slides.splice(fromIndex, 1);
      next.slides.splice(toIndex, 0, moved);
      return next;
    }

    case 'ADD_SLIDE': {
      const { index, slide } = action.payload;
      validateSlide(slide);
      const targetIdx = (typeof index === 'number' && index >= 0 && index <= next.slides.length)
        ? index
        : next.slides.length;
      next.slides.splice(targetIdx, 0, slide);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'DELETE_SLIDE': {
      const { slideIndex } = action.payload;
      if (next.slides.length <= 1) {
        throw new Error('Cannot delete the last remaining slide');
      }
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Delete slide index out of bounds: ${slideIndex}`);
      }
      next.slides.splice(slideIndex, 1);
      next.totalDurationSeconds = recomputeTotalDuration(next.slides);
      return next;
    }

    case 'SWITCH_TEMPLATE_PACK': {
      const { packId } = action.payload || {};
      if (!packId || typeof packId !== 'string') {
        throw new Error('SWITCH_TEMPLATE_PACK requires a valid packId string');
      }
      const pack = TemplateRegistry.get(packId);
      if (!pack) {
        throw new Error(`Pack "${packId}" not found in TemplateRegistry`);
      }
      next.templatePackId = packId;
      const validLayoutIds = pack.layouts.map(l => l.id);
      for (const slide of next.slides) {
        slide.packId = packId;
        const currentLayout = slide.layoutId || slide.templateId;
        if (!validLayoutIds.includes(currentLayout) && validLayoutIds.length > 0) {
          slide.layoutId = validLayoutIds[0];
          slide.templateId = validLayoutIds[0];
        }
        validateSlide(slide);
      }
      return next;
    }

    case 'SET_MEDIA_SLOT': {
      const { slideIndex, mediaUrl, variant } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      if (!slide.slotValues) slide.slotValues = {};
      slide.slotValues.media = mediaUrl;
      if (variant) {
        slide.layoutVariant = variant;
        slide.variantId = variant;
      } else if (slide.layoutVariant === 'no-image') {
        slide.layoutVariant = 'default';
        slide.variantId = 'default';
      }
      const imgEl = slide.elements.find(e => e.type === 'image');
      if (imgEl) {
        imgEl.content = mediaUrl;
      } else {
        slide.elements.push({ id: 'img-media', type: 'image', content: mediaUrl });
      }
      validateSlide(slide);
      return next;
    }

    case 'REMOVE_MEDIA_SLOT': {
      const { slideIndex } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      if (slide.slotValues) {
        delete slide.slotValues.media;
      }
      slide.layoutVariant = 'no-image';
      slide.variantId = 'no-image';
      const imgEl = slide.elements.find(e => e.type === 'image');
      if (imgEl) {
        imgEl.content = '';
      }
      validateSlide(slide);
      return next;
    }

    case 'UPDATE_VIDEO_COMPONENT': {
      const { slideIndex, elementId, changes } = action.payload;
      if (slideIndex < 0 || slideIndex >= next.slides.length) {
        throw new Error(`Slide index out of bounds: ${slideIndex}`);
      }
      const slide = next.slides[slideIndex];
      const el = slide.elements.find(e => e.id === elementId || e.type === 'video');
      if (el) {
        Object.assign(el, changes);
      }
      validateSlide(slide);
      return next;
    }

    default:
      return next;
  }
}

export { sceneReducer as studioReducer };

