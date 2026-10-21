/**
 * templates/registry.js
 * Deep Module: Template Pack & Layout Registry for AI Lecture Studio v2
 * 
 * Provides unified interface:
 * - list(): list all loaded packs
 * - get(packId): get pack by id
 * - getLayout(packId, layoutId): get specific layout definition
 * - validate(pack): validate pack object against template_pack.json schema constraints
 * - registerPack(pack): add/update pack in-memory
 */

import basicPackData from './packs/basic/pack.json' with { type: 'json' };
import pedagogyVisualPackData from './packs/pedagogy-visual/pack.json' with { type: 'json' };

const VALID_SUBJECT_TAGS = new Set([
  'toan-tin',
  'khoa-hoc-tu-nhien',
  'xa-hoi-nhan-van',
  'ngoai-ngu',
  'kinh-te-quan-tri',
  'tong-hop'
]);

const VALID_STYLE_TAGS = new Set([
  'hoc-thuat-nghiem-tuc',
  'hien-dai-toi-gian',
  'sinh-dong-tre-trung',
  'cong-nghe-tuong-lai'
]);

const VALID_EFFECT_TAGS = new Set([
  'nhe-nhang-fade',
  'nang-dong-kinetic',
  'chu-danh-may-typewriter'
]);

const VALID_LAYOUT_PURPOSES = new Set([
  'title',
  'concept-explain',
  'bullet-breakdown',
  'image-explain',
  'comparison',
  'timeline',
  'formula-explain',
  'quiz',
  'summary',
  'custom'
]);

class Registry {
  constructor() {
    this._packs = new Map();
    // Register default basic pack
    if (basicPackData) {
      this.registerPack(basicPackData);
    }
    // Register new rich pedagogy-visual pack
    if (pedagogyVisualPackData) {
      this.registerPack(pedagogyVisualPackData);
    }
  }

  /**
   * Validate a TemplatePack structure according to schemas/template_pack.json
   * @param {object} pack
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(pack) {
    const errors = [];
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
      return { valid: false, errors: ['[pack] Must be a non-null object'] };
    }

    const packId = pack.id || 'unknown';
    const reqFields = ['id', 'name', 'description', 'aspectRatio', 'tokens', 'tags', 'layouts'];
    for (const f of reqFields) {
      if (pack[f] === undefined || pack[f] === null) {
        errors.push(`[pack.${packId}] Missing required field: ${f}`);
      }
    }

    if (pack.id && !/^[a-z0-9_-]+$/.test(pack.id)) {
      errors.push(`[pack.${packId}] Field id must match pattern ^[a-z0-9_-]+$`);
    }

    if (pack.aspectRatio && pack.aspectRatio !== '16:9') {
      errors.push(`[pack.${packId}] aspectRatio must be '16:9'`);
    }

    if (pack.tags && typeof pack.tags === 'object') {
      const tagCats = ['subject', 'style', 'effect'];
      for (const cat of tagCats) {
        if (!Array.isArray(pack.tags[cat])) {
          errors.push(`[pack.${packId}.tags] Missing array for tag category: ${cat}`);
        }
      }
      if (Array.isArray(pack.tags.subject)) {
        for (const s of pack.tags.subject) {
          if (!VALID_SUBJECT_TAGS.has(s)) {
            errors.push(`[pack.${packId}.tags.subject] Invalid subject tag: "${s}"`);
          }
        }
      }
      if (Array.isArray(pack.tags.style)) {
        for (const st of pack.tags.style) {
          if (!VALID_STYLE_TAGS.has(st)) {
            errors.push(`[pack.${packId}.tags.style] Invalid style tag: "${st}"`);
          }
        }
      }
      if (Array.isArray(pack.tags.effect)) {
        for (const ef of pack.tags.effect) {
          if (!VALID_EFFECT_TAGS.has(ef)) {
            errors.push(`[pack.${packId}.tags.effect] Invalid effect tag: "${ef}"`);
          }
        }
      }
    }

    if (pack.tokens && typeof pack.tokens === 'object') {
      const tokenCats = ['colors', 'fonts', 'spacing'];
      for (const tc of tokenCats) {
        if (!pack.tokens[tc] || typeof pack.tokens[tc] !== 'object') {
          errors.push(`[pack.${packId}.tokens] Missing object for: ${tc}`);
        }
      }
    }

    if (pack.layouts) {
      if (!Array.isArray(pack.layouts) || pack.layouts.length === 0) {
        errors.push(`[pack.${packId}] layouts must be a non-empty array`);
      } else {
        pack.layouts.forEach((layout, idx) => {
          const lId = layout?.id || `index_${idx}`;
          const lReq = ['id', 'name', 'purpose', 'slots', 'variants'];
          for (const lf of lReq) {
            if (layout[lf] === undefined || layout[lf] === null) {
              errors.push(`[pack.${packId}.layouts.${lId}] Missing field: ${lf}`);
            }
          }
          if (layout.purpose && !VALID_LAYOUT_PURPOSES.has(layout.purpose)) {
            errors.push(`[pack.${packId}.layouts.${lId}] Invalid purpose: "${layout.purpose}"`);
          }
          if (Array.isArray(layout.variants)) {
            const hasDefault = layout.variants.some(v => v?.id === 'default');
            if (!hasDefault) {
              errors.push(`[pack.${packId}.layouts.${lId}] Must have at least one variant with id "default"`);
            }
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Register a template pack
   * @param {object} pack
   */
  registerPack(pack) {
    const val = this.validate(pack);
    if (!val.valid) {
      throw new Error(`Invalid template pack "${pack?.id}": ${val.errors.join('; ')}`);
    }
    this._packs.set(pack.id, pack);
  }

  /**
   * List all registered template packs
   * @returns {object[]}
   */
  list() {
    return Array.from(this._packs.values());
  }

  /**
   * Get template pack by id
   * @param {string} packId
   * @returns {object|undefined}
   */
  get(packId = 'basic') {
    return this._packs.get(packId);
  }

  /**
   * Get layout from pack
   * @param {string} packId
   * @param {string} layoutId
   * @returns {object|undefined}
   */
  getLayout(packId = 'basic', layoutId) {
    const pack = this.get(packId);
    if (!pack || !Array.isArray(pack.layouts)) return undefined;
    return pack.layouts.find(l => l.id === layoutId);
  }

  /**
   * Check if a template layout exists
   * @param {string} packId
   * @param {string} layoutId
   * @returns {boolean}
   */
  hasLayout(packId = 'basic', layoutId) {
    return this.getLayout(packId, layoutId) !== undefined;
  }
}

export const TemplateRegistry = new Registry();
