/**
 * studio/flow.js
 * State machine managing Studio v2 top-level onboarding and workspace flow:
 * gallery -> pack-selected -> uploading -> clarifying -> studio.
 *
 * Owned by Person B (Engine/Studio).
 */

export function createFlowMachine(initialOptions = {}) {
  let state = {
    current: initialOptions.current || 'gallery',
    selectedPackId: initialOptions.selectedPackId || null,
    projectId: initialOptions.projectId || null,
    scene: initialOptions.scene || null,
    error: null,
    needsClarification: false,
    ...initialOptions
  };

  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('FlowMachine listener error:', err);
      }
    }
  }

  return {
    getState() {
      return { ...state };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    transition(action) {
      if (!action || !action.type) return state;

      switch (action.type) {
        case 'SELECT_PACK':
          state = {
            ...state,
            current: 'pack-selected',
            selectedPackId: action.packId,
            error: null
          };
          break;

        case 'START_UPLOAD':
          state = {
            ...state,
            current: 'uploading',
            error: null
          };
          break;

        case 'UPLOAD_SUCCESS':
          state = {
            ...state,
            current: action.needsClarification ? 'clarifying' : 'studio',
            projectId: action.projectId || state.projectId,
            needsClarification: Boolean(action.needsClarification),
            scene: action.scene || state.scene,
            error: null
          };
          break;

        case 'UPLOAD_ERROR':
          state = {
            ...state,
            current: state.selectedPackId ? 'pack-selected' : 'gallery',
            error: action.error || 'Upload failed'
          };
          break;

        case 'CLARIFY_SUBMIT':
        case 'SKIP_CLARIFY':
          state = {
            ...state,
            current: 'studio',
            scene: action.scene || state.scene,
            needsClarification: false,
            error: null
          };
          break;

        case 'OPEN_PROJECT':
          state = {
            ...state,
            current: 'studio',
            projectId: action.projectId || state.projectId,
            scene: action.scene || state.scene,
            error: null
          };
          break;

        case 'BACK_TO_GALLERY':
          state = {
            ...state,
            current: 'gallery',
            selectedPackId: null,
            error: null
          };
          break;

        case 'SWITCH_PACK':
          state = {
            ...state,
            selectedPackId: action.packId
          };
          break;

        default:
          console.warn(`[FlowMachine] Unhandled action: ${action.type}`);
          break;
      }

      notify();
      return state;
    }
  };
}
