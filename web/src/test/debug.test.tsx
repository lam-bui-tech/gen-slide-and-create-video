import React, { useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/debug/ErrorBoundary';
import { useStudioStore } from '@/store/useStudioStore';
import { sanitizeEndpoint, recentApiLogs, api } from '@/lib/api';

// Faulty component for ErrorBoundary testing
function FaultyChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulation of unexpected component crash');
  }
  return <div data-testid="child-content">Child content rendered normally</div>;
}

function TestContainer() {
  const [hasError, setHasError] = useState(true);

  return (
    <ErrorBoundary paneName="TestPane">
      <FaultyChild shouldThrow={hasError} />
      <button onClick={() => setHasError(false)} data-testid="fix-error-btn">
        Fix Error
      </button>
    </ErrorBoundary>
  );
}

describe('Phase F9: Debugging Infrastructure', () => {
  beforeEach(() => {
    recentApiLogs.length = 0;
    useStudioStore.setState({
      currentSlideIndex: 0,
      scene: {
        schemaVersion: 2,
        projectId: 'proj-debug-test',
        title: 'Project Debug Test',
        packId: 'basic',
        slides: [
          {
            slideId: 'slide-debug-01',
            templateId: 'title-slide',
            variantId: 'default',
            layoutVariant: 'default',
            title: 'Tiêu đề Debug',
            durationSeconds: 5,
            slotValues: {},
            media: [],
            elements: [],
            animations: [],
            voice: { narration: 'Kiểm thử', provider: 'vieneu', voiceId: 'BanMai', durationSeconds: 5 },
          },
        ],
        totalDurationSeconds: 5,
      },
    });
  });

  describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary paneName="NormalPane">
          <FaultyChild shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.queryByText(/Lỗi hiển thị thành phần/i)).not.toBeInTheDocument();
    });

    it('catches render error, displays pane name, slide ID, and error message', () => {
      // Suppress console.error in test output for simulated crash
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary paneName="CanvasPane">
          <FaultyChild shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Lỗi hiển thị thành phần/i)).toBeInTheDocument();
      expect(screen.getByText('CanvasPane')).toBeInTheDocument();
      expect(screen.getByText('slide-debug-01')).toBeInTheDocument();
      expect(screen.getByText(/Simulation of unexpected component crash/i)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('provides copy diagnostics button and writes to clipboard', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <ErrorBoundary paneName="InspectorPane">
          <FaultyChild shouldThrow={true} />
        </ErrorBoundary>
      );

      const copyBtn = screen.getByRole('button', { name: /Sao Chép Chẩn Đoán/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedPayload = JSON.parse(writeTextMock.mock.calls[0][0]);
      expect(copiedPayload.pane).toBe('InspectorPane');
      expect(copiedPayload.slideId).toBe('slide-debug-01');
      expect(copiedPayload.projectId).toBe('proj-debug-test');
      expect(copiedPayload.errorMessage).toContain('Simulation of unexpected component crash');

      consoleErrorSpy.mockRestore();
    });

    it('resets error state when retry button is clicked', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<TestContainer />);
      expect(screen.getByText(/Lỗi hiển thị thành phần/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Thử Lại/i });
      fireEvent.click(retryBtn);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('API Request Logging & Sanitization', () => {
    it('sanitizes tokens and secrets from endpoints', () => {
      const clean1 = sanitizeEndpoint('/projects/123/documents?token=supersecret123&author=Alice');
      expect(clean1).toBe('/projects/123/documents?token=[REDACTED]&author=Alice');

      const clean2 = sanitizeEndpoint('/api/auth?api_key=sk-123456');
      expect(clean2).toBe('/api/auth?api_key=[REDACTED]');

      const clean3 = sanitizeEndpoint('/projects/normal/outline');
      expect(clean3).toBe('/projects/normal/outline');
    });

    it('records API logs and caps ring buffer at 20 items', async () => {
      // Mock fetch
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      // Fire 25 requests
      for (let i = 1; i <= 25; i++) {
        await api.getScene(`proj-${i}`);
      }

      expect(recentApiLogs.length).toBe(20);
      expect(recentApiLogs[0].endpoint).toContain('proj-25');
      expect(recentApiLogs[0].status).toBe(200);
      expect(recentApiLogs[0].payloadSize).toBe(0);

      fetchSpy.mockRestore();
    });

    it('records payload size for request bodies', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      await api.sendSlideChat('proj-test', 'slide-01', 'Thêm hình ảnh minh họa');

      expect(recentApiLogs.length).toBeGreaterThan(0);
      const latest = recentApiLogs[0];
      expect(latest.method).toBe('POST');
      expect(latest.payloadSize).toBeGreaterThan(10);

      fetchSpy.mockRestore();
    });
  });
});
