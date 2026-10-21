'use client';

import React, { Component, type ReactNode } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

interface Props {
  paneName: string;
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.paneName}] Uncaught error:`, error, errorInfo);
  }

  handleCopyDiagnostics = async () => {
    const store = useStudioStore.getState();
    const currentSlide = store.scene?.slides?.[store.currentSlideIndex];
    const slideId = currentSlide?.slideId || 'N/A';

    const diagnostics = {
      timestamp: new Date().toISOString(),
      pane: this.props.paneName,
      slideId,
      errorName: this.state.error?.name || 'Error',
      errorMessage: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      projectId: store.scene?.projectId || 'N/A',
      currentSlideIndex: store.currentSlideIndex,
      totalSlides: store.scene?.slides?.length || 0,
      mode: store.mode,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch (err) {
      console.warn('[ErrorBoundary] Failed to copy diagnostics to clipboard:', err);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      const store = useStudioStore.getState();
      const currentSlide = store.scene?.slides?.[store.currentSlideIndex];
      const slideId = currentSlide?.slideId || 'N/A';

      return (
        <div
          className="error-boundary-fallback"
          style={{
            padding: '20px',
            margin: '12px',
            background: '#FFF1F2',
            border: '1px solid #FECDD3',
            borderRadius: '8px',
            color: '#9F1239',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              Lỗi hiển thị thành phần: <code>{this.props.paneName}</code>
            </h4>
          </div>

          <div style={{ fontSize: '12px', color: '#881337', marginBottom: '10px' }}>
            <strong>Slide ID:</strong> <code>{slideId}</code> (Index: {store.currentSlideIndex})
          </div>

          <div
            style={{
              padding: '10px',
              background: '#FFFFFF',
              border: '1px solid #FFE4E6',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#E11D48',
              whiteSpace: 'pre-wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              marginBottom: '14px',
            }}
          >
            {this.state.error.message}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              id="btn-copy-diagnostics"
              onClick={this.handleCopyDiagnostics}
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                background: '#FFFFFF',
                color: '#9F1239',
                borderColor: '#FECDD3',
                fontWeight: 600,
              }}
            >
              {this.state.copied ? '✅ Đã Sao Chép!' : '📋 Sao Chép Chẩn Đoán (Diagnostics)'}
            </button>
            <button
              className="btn btn-secondary"
              id="btn-reset-error-boundary"
              onClick={this.handleReset}
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                background: '#FFFFFF',
                color: '#334155',
                borderColor: '#CBD5E1',
              }}
            >
              🔄 Thử Lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
