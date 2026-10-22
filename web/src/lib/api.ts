import type {
  LessonSceneJSON,
  LessonOutline,
  DocumentContext,
  TemplatePack,
} from '@schemas/types';

export class ApiError extends Error {
  status: number;
  endpoint: string;
  body?: unknown;

  constructor(status: number, endpoint: string, message: string, body?: unknown) {
    super(`[${status}] ${endpoint}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

let requestCounter = 0;

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  if (process.env.NODE_ENV === 'test') {
    return '';
  }
  if (typeof window !== 'undefined') {
    // Trình duyệt gọi trực tiếp FastAPI backend port 8000 để tránh nghẽn buffer/timeout proxy Next.js với tệp lớn
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:8000`;
  }
  return '';
}

export interface RequestLogEntry {
  id: number;
  method: string;
  endpoint: string;
  status: number;
  durationMs: number;
  payloadSize: number;
  timestamp: string;
  error?: string;
}

export const recentApiLogs: RequestLogEntry[] = [];

export function sanitizeEndpoint(url: string): string {
  return url.replace(/([?&](?:api_?key|token|secret|auth|password)=)[^&]+/gi, '$1[REDACTED]');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const reqId = ++requestCounter;
  const startTime = Date.now();
  const method = options.method || 'GET';
  const baseUrl = getApiBase();
  const url = `${baseUrl}${endpoint}`;
  const cleanEndpoint = sanitizeEndpoint(endpoint);

  let payloadSize = 0;
  if (typeof options.body === 'string') {
    payloadSize = options.body.length;
  } else if (options.body instanceof FormData) {
    payloadSize = 1024;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[API #${reqId}] ${method} ${cleanEndpoint}`);
  }

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    recentApiLogs.unshift({
      id: reqId,
      method,
      endpoint: cleanEndpoint,
      status: 0,
      durationMs,
      payloadSize,
      timestamp: new Date().toISOString(),
      error: errorMsg,
    });
    if (recentApiLogs.length > 20) recentApiLogs.pop();
    throw new ApiError(0, cleanEndpoint, `Network error: ${errorMsg}`);
  }

  const durationMs = Date.now() - startTime;

  if (!res.ok) {
    let errorBody: unknown;
    let message = res.statusText;
    try {
      errorBody = await res.json();
      if (typeof errorBody === 'object' && errorBody !== null) {
        const bodyObj = errorBody as Record<string, unknown>;
        if (typeof bodyObj.detail === 'string') {
          message = bodyObj.detail;
        } else if (typeof bodyObj.error === 'string') {
          message = bodyObj.error;
        } else if (typeof bodyObj.error === 'object' && bodyObj.error !== null) {
          const inner = bodyObj.error as Record<string, unknown>;
          if (typeof inner.message === 'string') message = inner.message;
        }
      }
    } catch {
      try {
        message = await res.text();
      } catch {
        // use default statusText
      }
    }

    recentApiLogs.unshift({
      id: reqId,
      method,
      endpoint: cleanEndpoint,
      status: res.status,
      durationMs,
      payloadSize,
      timestamp: new Date().toISOString(),
      error: message,
    });
    if (recentApiLogs.length > 20) recentApiLogs.pop();

    throw new ApiError(res.status, cleanEndpoint, message, errorBody);
  }

  recentApiLogs.unshift({
    id: reqId,
    method,
    endpoint: cleanEndpoint,
    status: res.status,
    durationMs,
    payloadSize,
    timestamp: new Date().toISOString(),
  });
  if (recentApiLogs.length > 20) recentApiLogs.pop();

  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

function ensureProjectId(projectId?: string | null, actionName = 'thao tác'): string {
  if (!projectId || projectId.trim() === '') {
    throw new ApiError(400, 'local', `Thiếu projectId: không thể thực hiện ${actionName}.`);
  }
  return projectId.trim();
}

// ==========================================
// API Operations
// ==========================================

export const api = {
  // 1. Template Packs
  getPacks: async (): Promise<TemplatePack[]> => {
    return request<TemplatePack[]>('/packs');
  },

  saveLayoutToPack: async (packId: string, layout: unknown): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/packs/${encodeURIComponent(packId)}/layouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout),
    });
  },

  // 2. Project Lifecycle
  createProject: async (title: string, packId = 'basic'): Promise<{ projectId: string; title: string }> => {
    return request<{ projectId: string; title: string }>('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, packId }),
    });
  },

  getScene: async (projectId: string): Promise<LessonSceneJSON> => {
    const id = ensureProjectId(projectId, 'đọc scene');
    return request<LessonSceneJSON>(`/projects/${encodeURIComponent(id)}/scene`);
  },

  saveScene: async (projectId: string, scene: LessonSceneJSON): Promise<{ status: string; savedAt?: string }> => {
    const id = ensureProjectId(projectId, 'lưu scene');
    return request<{ status: string; savedAt?: string }>(`/projects/${encodeURIComponent(id)}/scene`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scene),
    });
  },

  // 3. Document Ingestion & Clarification
  uploadDocument: async (projectId: string, file: File): Promise<DocumentContext> => {
    const id = ensureProjectId(projectId, 'tải tài liệu');
    const formData = new FormData();
    formData.append('file', file);
    return request<DocumentContext>(`/projects/${encodeURIComponent(id)}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  getClarification: async (projectId: string): Promise<{ questions: Array<{ id: string; question: string; suggestedAnswer?: string; options?: string[] }> }> => {
    const id = ensureProjectId(projectId, 'lấy câu hỏi clarification');
    return request<{ questions: Array<{ id: string; question: string; suggestedAnswer?: string; options?: string[] }> }>(
      `/projects/${encodeURIComponent(id)}/clarification`
    );
  },

  submitClarification: async (projectId: string, answers: Record<string, unknown>): Promise<{ status: string }> => {
    const id = ensureProjectId(projectId, 'gửi câu trả lời clarification');
    return request<{ status: string }>(`/projects/${encodeURIComponent(id)}/clarification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
  },

  // 4. Outline
  generateOutline: async (projectId: string): Promise<LessonOutline> => {
    const id = ensureProjectId(projectId, 'sinh dàn bài');
    return request<LessonOutline>(`/projects/${encodeURIComponent(id)}/outline`, {
      method: 'POST',
    });
  },

  approveOutline: async (projectId: string, outline: LessonOutline): Promise<{ status: string }> => {
    const id = ensureProjectId(projectId, 'phê duyệt dàn bài');
    return request<{ status: string }>(`/projects/${encodeURIComponent(id)}/outline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outline),
    });
  },

  generateSceneFromOutline: async (projectId: string): Promise<LessonSceneJSON> => {
    const id = ensureProjectId(projectId, 'tạo slide scene từ dàn bài');
    return request<LessonSceneJSON>(`/projects/${encodeURIComponent(id)}/scene`, {
      method: 'POST',
    });
  },

  // 5. Media & TTS
  getMediaRecommendations: async (projectId: string, slideId: string): Promise<Array<{ url: string; title?: string; type: string; source: string }>> => {
    const id = ensureProjectId(projectId, 'lấy gợi ý media');
    return request<Array<{ url: string; title?: string; type: string; source: string }>>(
      `/projects/${encodeURIComponent(id)}/media-recommendations/${encodeURIComponent(slideId)}`
    );
  },

  sendSlideChat: async (
    projectId: string,
    slideId: string,
    instruction: string
  ): Promise<{ slideId: string; patch: Record<string, unknown>; explanation?: string }> => {
    const id = ensureProjectId(projectId, 'gửi chỉ dẫn sửa slide');
    return request<{ slideId: string; patch: Record<string, unknown>; explanation?: string }>(
      `/projects/${encodeURIComponent(id)}/slides/${encodeURIComponent(slideId)}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      }
    );
  },

  slideChat: async (
    projectId: string,
    slideId: string,
    instruction: string
  ): Promise<{ slideId: string; patch: Record<string, unknown>; diff?: Record<string, any>; explanation?: string }> => {
    return api.sendSlideChat(projectId, slideId, instruction);
  },

  synthesizeAudio: async (
    projectId: string,
    slideId: string,
    narration: string,
    voiceId = 'BanMai',
    provider = 'vieneu'
  ): Promise<{
    slideId: string;
    audioUrl: string;
    durationSeconds: number;
    timelineShift?: { subsequentStartTimesUpdated: boolean };
  }> => {
    const id = ensureProjectId(projectId, 'tổng hợp âm thanh thuyết minh');
    return request<{
      slideId: string;
      audioUrl: string;
      durationSeconds: number;
      timelineShift?: { subsequentStartTimesUpdated: boolean };
    }>(`/projects/${encodeURIComponent(id)}/slides/${encodeURIComponent(slideId)}/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narration, voiceId, provider }),
    });
  },

  // 6. Export Jobs
  startExport: async (
    projectId: string,
    type: 'mp4' | 'pdf' | 'pptx'
  ): Promise<{ exportId: string; message?: string }> => {
    const id = ensureProjectId(projectId, `khởi tạo xuất ${type.toUpperCase()}`);
    return request<{ exportId: string; message?: string }>(`/projects/${encodeURIComponent(id)}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  },

  getExportStatus: async (
    exportId: string
  ): Promise<{
    exportId: string;
    type: string;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string | null;
    error?: string | null;
  }> => {
    return request<{
      exportId: string;
      type: string;
      status: 'pending' | 'rendering' | 'completed' | 'failed';
      progress: number;
      downloadUrl?: string | null;
      error?: string | null;
    }>(`/exports/${encodeURIComponent(exportId)}`);
  },
};
