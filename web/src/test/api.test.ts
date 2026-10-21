import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '@/lib/api';

describe('API Client Unit Tests (web/src/lib/api.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws ApiError immediately when projectId is missing', async () => {
    await expect(api.getScene('')).rejects.toThrow(ApiError);
    await expect(api.getScene('   ')).rejects.toThrow(/Thiếu projectId/);
    await expect(api.saveScene('', {} as any)).rejects.toThrow(/Thiếu projectId/);
    await expect(api.uploadDocument('', {} as any)).rejects.toThrow(/Thiếu projectId/);
    await expect(api.getClarification('')).rejects.toThrow(/Thiếu projectId/);
    await expect(api.generateOutline('')).rejects.toThrow(/Thiếu projectId/);
    await expect(api.startExport('', 'mp4')).rejects.toThrow(/Thiếu projectId/);
  });

  it('calls getPacks via GET /packs', async () => {
    const mockPacks = [{ id: 'basic', name: 'Basic Academic', layouts: [] }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockPacks,
    } as any);

    const packs = await api.getPacks();
    expect(global.fetch).toHaveBeenCalledWith('/packs', expect.anything());
    expect(packs).toEqual(mockPacks);
  });

  it('calls createProject via POST /projects with title and packId', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({ projectId: 'proj-123', title: 'Test Project' }),
    } as any);

    const res = await api.createProject('Test Project', 'basic');
    expect(global.fetch).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Project', packId: 'basic' }),
    });
    expect(res.projectId).toBe('proj-123');
  });

  it('handles API errors gracefully and parses error details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'application/json' },
      json: async () => ({ detail: 'Project not found' }),
    } as any);

    await expect(api.getScene('nonexistent-proj')).rejects.toThrow(ApiError);
    try {
      await api.getScene('nonexistent-proj');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toContain('Project not found');
    }
  });

  it('calls synthesizeAudio via POST /projects/{id}/slides/{slideId}/audio', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        slideId: 'slide-01',
        audioUrl: '/storage/audio.wav',
        durationSeconds: 4.5,
      }),
    } as any);

    const res = await api.synthesizeAudio('proj-1', 'slide-01', 'Lời đọc mẫu', 'BanMai', 'vieneu');
    expect(global.fetch).toHaveBeenCalledWith(
      '/projects/proj-1/slides/slide-01/audio',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narration: 'Lời đọc mẫu', voiceId: 'BanMai', provider: 'vieneu' }),
      })
    );
    expect(res.durationSeconds).toBe(4.5);
  });
});
