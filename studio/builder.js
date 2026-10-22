/**
 * studio/builder.js
 * AI Lecture Studio v2 — Template Builder & Inspector Engine (P5.1, P5.2).
 * Handles draftLayout state, snap-to-grid, slot vs decor role tagging,
 * constraints, GSAP preset animation, and validation before saving to pack.
 *
 * Owned by Person B (Engine/Studio).
 */

export function snapToGrid(value, gridSize = 8) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  if (!gridSize || gridSize <= 0) return Math.round(value);
  return Math.round(value / gridSize) * gridSize;
}

export function createDraftLayout(idOrOptions, name, purpose = 'concept-explain', category = 'lecture') {
  let id = idOrOptions;
  let layoutName = name;
  let layoutPurpose = purpose;
  let layoutCategory = category;

  if (typeof idOrOptions === 'object' && idOrOptions !== null) {
    id = idOrOptions.id;
    layoutName = idOrOptions.name;
    layoutPurpose = idOrOptions.purpose || 'concept-explain';
    layoutCategory = idOrOptions.category || 'lecture';
  }

  const generatedId =
    typeof id === 'string' && id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
      : `custom-layout-${Date.now().toString().slice(-4)}`;

  const finalPurpose =
    layoutPurpose === 'academic' || !layoutPurpose ? 'concept-explain' : layoutPurpose;

  return {
    id: generatedId,
    name: layoutName || 'Bố Cục Tùy Biến',
    purpose: finalPurpose,
    category: layoutCategory || 'lecture',
    variants: [
      { id: 'default', name: 'Mặc định' },
      { id: 'no-image', name: 'Không Có Ảnh' }
    ],
    elements: [],
    slots: [],
    defaultAnimations: []
  };
}

export function addDraftBlock(draft, block) {
  if (!draft || !Array.isArray(draft.elements)) {
    throw new Error('Invalid draft layout');
  }
  const next = JSON.parse(JSON.stringify(draft));
  const newBlock = {
    id: block.id || `el-${Date.now().toString().slice(-4)}`,
    type: block.type || 'text',
    x: snapToGrid(block.x ?? 100),
    y: snapToGrid(block.y ?? 100),
    width: snapToGrid(block.width ?? 400),
    height: snapToGrid(block.height ?? 100),
    content: block.content ?? '',
    ...block
  };
  next.elements.push(newBlock);
  return next;
}

export function updateDraftBlock(draft, elementId, changes) {
  if (!draft || !Array.isArray(draft.elements)) {
    throw new Error('Invalid draft layout');
  }
  const next = JSON.parse(JSON.stringify(draft));
  const el = next.elements.find(e => e.id === elementId);
  if (!el) {
    throw new Error(`Element "${elementId}" not found in draft layout`);
  }
  const updatedChanges = { ...changes };
  if (typeof updatedChanges.x === 'number') updatedChanges.x = snapToGrid(updatedChanges.x);
  if (typeof updatedChanges.y === 'number') updatedChanges.y = snapToGrid(updatedChanges.y);
  if (typeof updatedChanges.width === 'number') updatedChanges.width = snapToGrid(updatedChanges.width);
  if (typeof updatedChanges.height === 'number') updatedChanges.height = snapToGrid(updatedChanges.height);

  Object.assign(el, updatedChanges);
  return next;
}

export function removeDraftBlock(draft, elementId) {
  if (!draft || !Array.isArray(draft.elements)) {
    throw new Error('Invalid draft layout');
  }
  const next = JSON.parse(JSON.stringify(draft));
  next.elements = next.elements.filter(e => e.id !== elementId);
  if (Array.isArray(next.slots)) {
    next.slots = next.slots.filter(s => s.targetElementId !== elementId);
  }
  if (Array.isArray(next.defaultAnimations)) {
    next.defaultAnimations = next.defaultAnimations.filter(a => a.target !== `#${elementId}`);
  }
  return next;
}

export function setElementSlotRole(draft, elementId, roleConfig) {
  if (!draft || !Array.isArray(draft.elements)) {
    throw new Error('Invalid draft layout');
  }
  const next = JSON.parse(JSON.stringify(draft));
  const el = next.elements.find(e => e.id === elementId);
  if (!el) {
    throw new Error(`Element "${elementId}" not found in draft layout`);
  }

  if (!Array.isArray(next.slots)) next.slots = [];
  // Clear any existing slot bound to this element
  next.slots = next.slots.filter(s => s.targetElementId !== elementId);

  if (roleConfig.role === 'slot') {
    const slotName = roleConfig.slotName || el.id;
    next.slots.push({
      name: slotName,
      targetElementId: elementId,
      constraints: {
        maxLength: roleConfig.constraints?.maxLength || 300,
        required: roleConfig.constraints?.required ?? true,
        acceptedMediaTypes: roleConfig.constraints?.acceptedMediaTypes || ['image', 'diagram']
      }
    });
  }
  return next;
}

export function assignElementAnimation(draft, elementId, animConfig = {}) {
  if (!draft) throw new Error('Invalid draft layout');
  const next = JSON.parse(JSON.stringify(draft));
  if (!Array.isArray(next.defaultAnimations)) next.defaultAnimations = [];

  const target = `#${elementId}`;
  next.defaultAnimations = next.defaultAnimations.filter(a => a.target !== target);

  next.defaultAnimations.push({
    target,
    preset: animConfig.preset || 'fade-in',
    delay: typeof animConfig.delay === 'number' ? animConfig.delay : 0.5,
    duration: typeof animConfig.duration === 'number' ? animConfig.duration : 1.0,
    easing: animConfig.easing || 'power2.out'
  });
  return next;
}

export function validateDraftLayout(draft) {
  const errors = [];
  if (!draft || typeof draft !== 'object') {
    return { valid: false, errors: ['draft layout must be an object'] };
  }
  if (!draft.id || typeof draft.id !== 'string' || !/^[a-z0-9-_]+$/.test(draft.id)) {
    errors.push('Layout id must be non-empty alphanumeric with hyphens/underscores');
  }
  if (!draft.name || typeof draft.name !== 'string' || draft.name.trim() === '') {
    errors.push('Layout name must be non-empty');
  }
  if (!Array.isArray(draft.elements) || draft.elements.length === 0) {
    errors.push('Layout must have at least one element');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

export function exportLayoutForSave(draft) {
  const slots = (draft.slots || []).map(s => ({
    id: s.name || s.id,
    role: s.role || s.name || 'body',
    accepts: s.accepts || ['text']
  }));
  const decor = (draft.elements || [])
    .filter(e => !draft.slots?.some(s => s.targetElementId === e.id))
    .map(e => ({ id: e.id, type: e.type, content: e.content }));

  const rawPurpose = draft.purpose;
  const validPurpose =
    rawPurpose === 'academic' || !rawPurpose ? 'concept-explain' : rawPurpose;

  return {
    id: draft.id,
    name: draft.name,
    purpose: validPurpose,
    slots,
    decor,
    variants: draft.variants || [{ id: 'default', name: 'Mặc định' }],
    defaultAnimations: draft.defaultAnimations || []
  };
}

