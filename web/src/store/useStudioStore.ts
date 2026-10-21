import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { sceneReducer } from '@engine/reducer.js';
import { createDraftLayout } from '@engine/builder.js';
import type { LessonSceneJSON, LessonOutline, TemplatePack } from '@schemas/types';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let actionCounter = 0;

export interface ActionLogItem {
  id: number;
  name: string;
  type: string;
  timestamp: string;
}

export interface UploadProgressState {
  isOpen: boolean;
  step: string;
  percent: number;
  desc: string;
  icon: string;
}

export interface StudioState {
  // Scene & History
  scene: LessonSceneJSON | null;
  currentSlideIndex: number;
  history: LessonSceneJSON[];
  historyIndex: number;
  actionLog: ActionLogItem[];
  saveStatus: 'saved' | 'saving' | 'error';
  lastSavedAt: string | null;

  // UI state
  selectedGalleryPackId: string;
  galleryIntent: 'upload' | 'switch-pack';
  isGalleryOpen: boolean;
  availablePacks: TemplatePack[];

  uploadProgress: UploadProgressState;
  isClarificationOpen: boolean;
  clarificationQuestions: Array<{ id: string; question: string; suggestedAnswer?: string; options?: string[] }>;
  clarificationDocTitle: string;
  currentUploadProjectId: string | null;

  isOutlineReviewOpen: boolean;
  pendingOutline: LessonOutline | null;

  isPedagogyModalOpen: boolean;
  isHelpModalOpen: boolean;
  isImageModalOpen: boolean;
  activeImageTargetId: string | null;

  pendingChatPatch: Record<string, unknown> | null;
  isAudioJobRunning: boolean;
  isDebugDrawerOpen: boolean;

  // Builder state
  mode: 'slide' | 'builder';
  draftLayout: any | null;
  activeBuilderElementId: string | null;

  // Presentation state
  isPresentationActive: boolean;
  presentationIndex: number;
  presentationIsPlaying: boolean;

  // Export state
  activeExport: {
    exportId: string;
    type: string;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string | null;
    error?: string | null;
  } | null;

  // Actions
  setScene: (scene: LessonSceneJSON) => void;
  setSlideIndex: (idx: number) => void;
  dispatch: (action: { type: string; payload?: any }, label?: string) => void;
  undo: () => void;
  redo: () => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'error', savedAt?: string) => void;
  createNewEmptyProject: (packId?: string) => void;

  // UI Actions
  openGalleryModal: (intent?: 'upload' | 'switch-pack') => void;
  closeGalleryModal: () => void;
  setSelectedGalleryPackId: (packId: string) => void;
  setAvailablePacks: (packs: TemplatePack[]) => void;

  openImageModal: (targetId?: string | null) => void;
  closeImageModal: () => void;

  openPedagogyModal: () => void;
  closePedagogyModal: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;

  openClarificationModal: (
    questions: Array<{ id: string; question: string; suggestedAnswer?: string; options?: string[] }>,
    docTitle?: string,
    projectId?: string
  ) => void;
  closeClarificationModal: () => void;

  openOutlineReviewModal: (outline: LessonOutline) => void;
  closeOutlineReviewModal: () => void;
  setPendingOutline: (outline: LessonOutline | null) => void;

  setUploadProgress: (progress: Partial<UploadProgressState>) => void;
  setPendingChatPatch: (patch: Record<string, unknown> | null) => void;
  setIsAudioJobRunning: (running: boolean) => void;
  setDebugDrawerOpen: (open: boolean) => void;

  // Builder Actions
  toggleBuilderMode: (enable?: boolean) => void;
  setDraftLayout: (draft: any) => void;
  setActiveBuilderElementId: (id: string | null) => void;

  // Presentation Actions
  openPresentationMode: () => void;
  closePresentationMode: () => void;
  setPresentationIndex: (idx: number) => void;
  setPresentationPlaying: (playing: boolean) => void;

  // Export Actions
  setActiveExport: (
    job: {
      exportId: string;
      type: string;
      status: 'pending' | 'rendering' | 'completed' | 'failed';
      progress: number;
      downloadUrl?: string | null;
      error?: string | null;
    } | null
  ) => void;
}

export const useStudioStore = create<StudioState>()(
  devtools(
    (set, get) => ({
      // Initial state
      scene: null,
      currentSlideIndex: 0,
      history: [],
      historyIndex: -1,
      actionLog: [],
      saveStatus: 'saved',
      lastSavedAt: null,

      selectedGalleryPackId: 'basic',
      galleryIntent: 'upload',
      isGalleryOpen: false,
      availablePacks: [],

      uploadProgress: {
        isOpen: false,
        step: 'Đang xử lý tài liệu',
        percent: 0,
        desc: 'Vui lòng chờ trong giây lát...',
        icon: '📤',
      },
      isClarificationOpen: false,
      clarificationQuestions: [],
      clarificationDocTitle: '',
      currentUploadProjectId: null,

      isOutlineReviewOpen: false,
      pendingOutline: null,

      isPedagogyModalOpen: false,
      isHelpModalOpen: false,
      isImageModalOpen: false,
      activeImageTargetId: null,

      pendingChatPatch: null,
      isAudioJobRunning: false,
      isDebugDrawerOpen: false,

      mode: 'slide',
      draftLayout: null,
      activeBuilderElementId: null,

      isPresentationActive: false,
      presentationIndex: 0,
      presentationIsPlaying: false,

      activeExport: null,

      // Core State Handlers
      setScene: (newScene) => {
        const cloned = deepClone(newScene);
        set({
          scene: cloned,
          currentSlideIndex: 0,
          history: [deepClone(cloned)],
          historyIndex: 0,
          saveStatus: 'saved',
        });
      },

      setSlideIndex: (idx) => {
        const { scene } = get();
        if (!scene || !scene.slides) return;
        if (idx >= 0 && idx < scene.slides.length) {
          set({ currentSlideIndex: idx });
        }
      },

      dispatch: (action, label = 'Thay đổi dữ liệu') => {
        const state = get();
        if (!state.scene) return;

        try {
          const nextScene = sceneReducer(state.scene, action);
          const clonedNext = deepClone(nextScene);

          // Truncate future redo history if we are in middle of stack
          const nextHistory = state.history.slice(0, state.historyIndex + 1);
          nextHistory.push(deepClone(clonedNext));
          if (nextHistory.length > 30) {
            nextHistory.shift();
          }

          const logItem: ActionLogItem = {
            id: ++actionCounter,
            name: label,
            type: action.type,
            timestamp: new Date().toISOString(),
          };

          const nextLog = [logItem, ...state.actionLog];
          if (nextLog.length > 50) nextLog.pop();

          // Keep currentSlideIndex in valid bounds if slide count changed
          let nextSlideIdx = state.currentSlideIndex;
          if (nextSlideIdx >= clonedNext.slides.length) {
            nextSlideIdx = Math.max(0, clonedNext.slides.length - 1);
          }

          set({
            scene: clonedNext,
            currentSlideIndex: nextSlideIdx,
            history: nextHistory,
            historyIndex: nextHistory.length - 1,
            actionLog: nextLog,
            saveStatus: 'saving',
          });
        } catch (err: unknown) {
          console.error(`[StudioStore] Reducer error for action "${action.type}":`, err);
        }
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const targetIndex = historyIndex - 1;
          const targetScene = deepClone(history[targetIndex]);
          set({
            scene: targetScene,
            historyIndex: targetIndex,
            currentSlideIndex: Math.min(get().currentSlideIndex, targetScene.slides.length - 1),
            saveStatus: 'saving',
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const targetIndex = historyIndex + 1;
          const targetScene = deepClone(history[targetIndex]);
          set({
            scene: targetScene,
            historyIndex: targetIndex,
            currentSlideIndex: Math.min(get().currentSlideIndex, targetScene.slides.length - 1),
            saveStatus: 'saving',
          });
        }
      },

      setSaveStatus: (status, savedAt) => {
        set({
          saveStatus: status,
          ...(savedAt ? { lastSavedAt: savedAt } : {}),
        });
      },

      createNewEmptyProject: (packId?: string) => {
        const chosenPack = packId || 'basic';
        const defaultScene: LessonSceneJSON = {
          schemaVersion: 2,
          projectId: `proj-${Date.now().toString().slice(-8)}`,
          title: 'Bài Giảng Mới',
          packId: chosenPack,
          slides: [
            {
              slideId: 'slide-01',
              layoutId: 'title-slide',
              templateId: 'title-slide',
              variantId: 'default',
              layoutVariant: 'default',
              title: 'Tiêu Đề Bài Giảng Mới',
              subtitle: 'Phụ đề giới thiệu bài giảng',
              slotValues: {},
              media: [],
              elements: [
                { id: 'txt-author', type: 'text', content: 'Giảng viên' },
              ],
              animations: [
                { target: '.slide-title, .title-hero-heading', preset: 'slide-in', delay: 0.2, duration: 0.8, easing: 'power2.out' },
              ],
              voice: {
                narration: 'Chào mừng các bạn đến với bài giảng hôm nay.',
                provider: 'vieneu',
                voiceId: 'BanMai',
                durationSeconds: 4.0,
              },
              durationSeconds: 5.0,
            },
          ],
          totalDurationSeconds: 5.0,
        };

        set({
          scene: defaultScene,
          currentSlideIndex: 0,
          history: [deepClone(defaultScene)],
          historyIndex: 0,
          saveStatus: 'saved',
          mode: 'slide',
          draftLayout: null,
          activeBuilderElementId: null,
        });
      },

      // Modal Actions
      openGalleryModal: (intent = 'upload') => {
        set({
          isGalleryOpen: true,
          galleryIntent: intent,
          selectedGalleryPackId: (get().scene as any)?.templatePackId || get().scene?.packId || 'basic',
        });
      },
      closeGalleryModal: () => set({ isGalleryOpen: false }),
      setSelectedGalleryPackId: (packId) => set({ selectedGalleryPackId: packId }),
      setAvailablePacks: (packs) => set({ availablePacks: packs }),

      openImageModal: (targetId = null) => {
        set({ isImageModalOpen: true, activeImageTargetId: targetId });
      },
      closeImageModal: () => {
        set({ isImageModalOpen: false, activeImageTargetId: null });
      },

      openPedagogyModal: () => set({ isPedagogyModalOpen: true }),
      closePedagogyModal: () => set({ isPedagogyModalOpen: false }),
      openHelpModal: () => set({ isHelpModalOpen: true }),
      closeHelpModal: () => set({ isHelpModalOpen: false }),

      openClarificationModal: (questions, docTitle = '', projectId = '') => {
        set({
          isClarificationOpen: true,
          clarificationQuestions: questions,
          clarificationDocTitle: docTitle,
          currentUploadProjectId: projectId || get().currentUploadProjectId,
        });
      },
      closeClarificationModal: () => set({ isClarificationOpen: false }),

      openOutlineReviewModal: (outline) => {
        set({ isOutlineReviewOpen: true, pendingOutline: deepClone(outline) });
      },
      closeOutlineReviewModal: () => set({ isOutlineReviewOpen: false }),
      setPendingOutline: (outline) => set({ pendingOutline: outline }),

      setUploadProgress: (update) => {
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, ...update },
        }));
      },
      setPendingChatPatch: (patch) => set({ pendingChatPatch: patch }),
      setIsAudioJobRunning: (running) => set({ isAudioJobRunning: running }),
      setDebugDrawerOpen: (open) => set({ isDebugDrawerOpen: open }),

      // Builder Actions
      toggleBuilderMode: (enable) => {
        const currentMode = get().mode;
        const targetMode = enable !== undefined ? (enable ? 'builder' : 'slide') : (currentMode === 'slide' ? 'builder' : 'slide');
        if (targetMode === 'builder') {
          const draft = createDraftLayout({ name: 'Layout Mới', packId: (get().scene as any)?.templatePackId || get().scene?.packId || 'basic' });
          set({ mode: 'builder', draftLayout: draft, activeBuilderElementId: null });
        } else {
          set({ mode: 'slide', draftLayout: null, activeBuilderElementId: null });
        }
      },
      setDraftLayout: (draft) => set({ draftLayout: draft }),
      setActiveBuilderElementId: (id) => set({ activeBuilderElementId: id }),

      // Presentation Actions
      openPresentationMode: () => {
        const { scene, currentSlideIndex } = get();
        if (!scene || !scene.slides || scene.slides.length === 0) return;
        set({
          isPresentationActive: true,
          presentationIndex: currentSlideIndex,
          presentationIsPlaying: true,
        });
      },
      closePresentationMode: () => {
        set({
          isPresentationActive: false,
          presentationIsPlaying: false,
          currentSlideIndex: get().presentationIndex,
        });
      },
      setPresentationIndex: (idx) => set({ presentationIndex: idx }),
      setPresentationPlaying: (playing) => set({ presentationIsPlaying: playing }),

      setActiveExport: (job) => set({ activeExport: job }),
    }),
    { name: 'StudioStore' }
  )
);

if (typeof window !== 'undefined') {
  (window as any).__studio_store = useStudioStore;
}
