'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function PropsPanelFrame({
  children,
  builderInspector,
}: {
  children?: React.ReactNode;
  builderInspector?: React.ReactNode;
}) {
  const mode = useStudioStore((s) => s.mode);

  return (
    <aside className="props-panel" aria-label="Bảng thuộc tính và tinh chỉnh slide">
      {mode === 'builder' ? (
        <div id="builder-inspector-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {builderInspector}
        </div>
      ) : (
        <div id="slide-normal-props-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      )}
    </aside>
  );
}
