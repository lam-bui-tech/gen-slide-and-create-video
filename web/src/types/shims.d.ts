declare module '@engine/reducer.js' {
  export const ALLOWED_PRESETS: string[];
  export const ALLOWED_VARIANTS: string[];
  export function sceneReducer(state: any, action: { type: string; payload?: any }): any;
  export function validateSlide(slide: any): { valid: boolean; errors: string[] };
  export function computeSlideDuration(slide: any): number;
  export function recomputeTotalDuration(slides: any[]): number;
}

declare module '@engine/flow.js' {
  export function createFlowMachine(initialState?: any): {
    getState(): any;
    transition(event: any, payload?: any): any;
    can(event: string): boolean;
    subscribe(listener: (state: any) => void): () => void;
  };
}

declare module '@engine/builder.js' {
  export function createDraftLayout(opts?: any): any;
  export function addDraftBlock(draft: any, block: any): any;
  export function updateDraftBlock(draft: any, blockId: string, changes: any): any;
  export function removeDraftBlock(draft: any, blockId: string): any;
  export function setElementSlotRole(draft: any, elementId: string, options: any): any;
  export function assignElementAnimation(draft: any, elementId: string, animConfig: any): any;
  export function validateDraftLayout(draft: any): { valid: boolean; errors: string[] };
  export function exportLayoutForSave(draft: any): any;
  export function snapToGrid(value: number, gridSize?: number): number;
}

declare module '@engine/quality.js' {
  export const DEFAULT_THRESHOLDS: Record<string, any>;
  export function computeSlideTextLength(slide: any): number;
  export function countWords(text: string): number;
  export function auditSlideQuality(slide: any, slideIndex?: number, customThresholds?: any): any[];
  export function auditDeckQuality(scene: any, customThresholds?: any): {
    score: number;
    thresholds: Record<string, any>;
    totalSlides: number;
    totalDurationSeconds: number;
    issues: Array<{
      rule: string;
      level: 'error' | 'warning' | 'info';
      slideIndex: number;
      slideId?: string;
      elementId?: string;
      metric?: any;
      threshold?: any;
      message: string;
    }>;
    summary: {
      errors: number;
      warnings: number;
      infos: number;
      passedSlides: number;
    };
  };
}

declare module '@engine/outline_editor.js' {
  export function updateOutlineSlide(outline: any, slideIndex: number, changes: any): any;
  export function addOutlineSlide(outline: any, slideData?: any, targetIndex?: number | null): any;
  export function removeOutlineSlide(outline: any, index: number): any;
  export function reorderOutlineSlides(outline: any, fromIndex: number, toIndex: number): any;
  export function approveOutline(outline: any): any;
}

declare module '@templates/index.js' {
  export const TEMPLATES: Record<string, any>;
  export function renderSlide(slide: any, startOffset?: number, totalDuration?: number): string;
  export function buildGsapTimelineForSlide(slide: any, containerEl: HTMLElement): any;
  export function formatSlotText(str?: string | null, placeholder?: string): string;
}

declare module '@templates/registry.js' {
  export class TemplateRegistry {
    static list(): any[];
    static get(packId: string): any;
    static getLayout(packId: string, layoutId: string): any;
  }
}

declare module '@templates/migration.js' {
  export function migrateOnRead(data: any): any;
  export function migrateSceneV1ToV2(scene: any): any;
}
