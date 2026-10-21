'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { recentApiLogs } from '@/lib/api';

export function DebugDrawer() {
  const isDebugDrawerOpen = useStudioStore((s) => s.isDebugDrawerOpen);
  const setDebugDrawerOpen = useStudioStore((s) => s.setDebugDrawerOpen);
  const scene = useStudioStore((s) => s.scene);
  const history = useStudioStore((s) => s.history);
  const historyIndex = useStudioStore((s) => s.historyIndex);
  const actionLog = useStudioStore((s) => s.actionLog);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);

  const [activeTab, setActiveTab] = useState<'scene' | 'history' | 'actions' | 'api'>('scene');
  const [copied, setCopied] = useState(false);

  // Check ?debug=1 in URL or toggle via 'd' key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1') {
        setDebugDrawerOpen(true);
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const isInput = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        );

        if (!isInput && e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setDebugDrawerOpen(!useStudioStore.getState().isDebugDrawerOpen);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [setDebugDrawerOpen]);

  if (!isDebugDrawerOpen) {
    return (
      <button
        id="btn-open-debug-drawer"
        onClick={() => setDebugDrawerOpen(true)}
        title="Mở Debug Drawer (Phím D)"
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          zIndex: 90000,
          background: '#0F172A',
          color: '#38BDF8',
          border: '1px solid #334155',
          borderRadius: '20px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          opacity: 0.8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        🐞 Debug
      </button>
    );
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <aside
      id="debug-drawer"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '540px',
        maxWidth: '90vw',
        height: '420px',
        background: '#0F172A',
        color: '#F8FAFC',
        borderTopLeftRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '-4px -4px 24px rgba(0,0,0,0.5)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid #334155',
          background: '#1E293B',
          borderTopLeftRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>🐞</span>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#38BDF8' }}>Studio Debugger</span>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Phím D để ẩn/hiện)</span>
        </div>
        <button
          id="btn-close-debug-drawer"
          onClick={() => setDebugDrawerOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#0B1120',
          borderBottom: '1px solid #334155',
          padding: '0 8px',
        }}
      >
        <button
          onClick={() => setActiveTab('scene')}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'scene' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'scene' ? '#38BDF8' : '#94A3B8',
            fontWeight: activeTab === 'scene' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Scene JSON
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'history' ? '#38BDF8' : '#94A3B8',
            fontWeight: activeTab === 'history' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          History Stack ({historyIndex + 1}/{history.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'actions' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'actions' ? '#38BDF8' : '#94A3B8',
            fontWeight: activeTab === 'actions' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Action Log ({actionLog.length})
        </button>
        <button
          onClick={() => setActiveTab('api')}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'api' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'api' ? '#38BDF8' : '#94A3B8',
            fontWeight: activeTab === 'api' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          API Logs ({recentApiLogs.length}/20)
        </button>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontSize: '12px' }}>
        {activeTab === 'scene' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8' }}>
                Slide hiện tại: <strong>{currentSlideIndex + 1} / {scene?.slides?.length || 0}</strong> (ID: {scene?.slides?.[currentSlideIndex]?.slideId || 'N/A'})
              </span>
              <button
                className="btn btn-secondary"
                id="btn-debug-copy-scene"
                onClick={handleCopyJson}
                style={{ fontSize: '11px', padding: '3px 8px', color: 'white', background: '#1E293B' }}
              >
                {copied ? '✅ Đã Sao Chép!' : '📋 Sao Chép JSON'}
              </button>
            </div>
            <pre
              style={{
                background: '#020617',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #1E293B',
                fontFamily: 'monospace',
                fontSize: '11px',
                overflowX: 'auto',
                color: '#38BDF8',
              }}
            >
              {JSON.stringify(scene, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '10px', color: '#94A3B8' }}>
              Trạng thái Undo/Redo: Vị trí hiện tại: <strong>{historyIndex}</strong> trong tổng số <strong>{history.length}</strong> bước lưu trữ.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {history.map((snap, idx) => {
                const isCurrent = idx === historyIndex;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: isCurrent ? '#0369A1' : '#1E293B',
                      border: `1px solid ${isCurrent ? '#38BDF8' : '#334155'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {isCurrent ? '👉 ' : ''}Bước {idx}: <strong>{snap.title}</strong> ({snap.slides?.length || 0} slides)
                    </span>
                    <span style={{ fontSize: '10px', color: isCurrent ? '#BAE6FD' : '#94A3B8' }}>
                      {isCurrent ? 'HIỆN TẠI' : idx < historyIndex ? 'UNDO' : 'REDO'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {actionLog.length === 0 ? (
              <div style={{ color: '#94A3B8', textAlign: 'center', padding: '20px' }}>Chưa có hành động nào được ghi nhận.</div>
            ) : (
              actionLog.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38BDF8', fontWeight: 700, fontSize: '10px' }}>#{act.id}</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{act.name}</span>
                    <code style={{ color: '#94A3B8', fontSize: '11px', background: '#0F172A', padding: '1px 4px', borderRadius: '3px' }}>
                      {act.type}
                    </code>
                  </div>
                  <span style={{ color: '#94A3B8', fontSize: '10px' }}>
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentApiLogs.length === 0 ? (
              <div style={{ color: '#64748B', textAlign: 'center', padding: '20px' }}>Chưa có yêu cầu API nào.</div>
            ) : (
              recentApiLogs.map((log) => {
                const isErr = log.status >= 400 || log.status === 0;
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: isErr ? '#450A0A' : '#1E293B',
                      border: `1px solid ${isErr ? '#991B1B' : '#334155'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '10px' }}>#{log.id}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '10px',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: log.method === 'GET' ? '#065F46' : '#1E40AF',
                            color: 'white',
                          }}
                        >
                          {log.method}
                        </span>
                        <span style={{ fontFamily: 'monospace', color: '#F8FAFC' }}>{log.endpoint}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: isErr ? '#F87171' : '#34D399',
                          }}
                        >
                          {log.status === 0 ? 'NET_ERR' : log.status}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: '10px' }}>{log.durationMs}ms</span>
                        <span style={{ color: '#64748B', fontSize: '10px' }}>{log.payloadSize}B</span>
                      </div>
                    </div>
                    {log.error && (
                      <div style={{ color: '#FCA5A5', fontSize: '11px', fontFamily: 'monospace' }}>
                        ⚠️ {log.error}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
