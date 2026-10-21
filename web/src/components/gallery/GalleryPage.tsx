'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GALLERY_PACKS,
  GalleryTemplatePack,
  SUBJECT_OPTIONS,
  STYLE_OPTIONS,
  EFFECT_OPTIONS,
  TAG_LABELS,
  filterGalleryPacks,
} from '@/lib/galleryPacks';
import '@/styles/gallery.css';

export function GalleryPage() {
  const router = useRouter();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);

  // Selected pack for details drawer
  const [selectedPack, setSelectedPack] = useState<GalleryTemplatePack | null>(null);

  // Filter packs
  const filteredPacks = useMemo(() => {
    return filterGalleryPacks(
      GALLERY_PACKS,
      searchTerm,
      selectedSubjects,
      selectedStyles,
      selectedEffects
    );
  }, [searchTerm, selectedSubjects, selectedStyles, selectedEffects]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPack) {
        setSelectedPack(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPack]);

  const toggleFilter = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => {
    setList((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSubjects([]);
    setSelectedStyles([]);
    setSelectedEffects([]);
  };

  const handleUseTemplate = (packId: string) => {
    router.push(`/studio?packId=${encodeURIComponent(packId)}`);
  };

  return (
    <div className="gallery-page-container">
      {/* Header */}
      <header className="gallery-header">
        <div className="gallery-brand-group">
          <div className="gallery-brand-icon">🎨</div>
          <div className="gallery-brand-title">
            <h1 className="nav-brand">AI Lecture Studio</h1>
            <p>Thư Viện Template Sư Phạm Chuẩn Mực & Đa Dạng Bố Cục</p>
          </div>
        </div>

        <div className="gallery-top-actions">
          <button
            className="btn-quick-basic"
            id="btn-quick-start"
            onClick={() => handleUseTemplate('basic')}
            title="Khởi tạo nhanh bài giảng với mẫu cơ bản"
          >
            ⚡ Mẫu Cơ Bản
          </button>
          <Link
            href="/studio"
            className="btn-open-studio"
            id="btn-goto-studio"
            title="Mở phòng thu bài giảng"
          >
            Vào Studio →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="gallery-layout">
        {/* Filter Sidebar */}
        <aside className="filter-sidebar">
          <div className="filter-head">
            <h2>Bộ Lọc Bố Cục</h2>
            <button
              className="btn-reset-filters"
              id="btn-reset-filters"
              type="button"
              onClick={handleResetFilters}
            >
              Đặt lại
            </button>
          </div>

          {/* Filter Group: Subject */}
          <div className="filter-group">
            <div className="filter-group-title">Môn Học (Subject)</div>
            <div className="filter-options" id="filter-subject">
              {SUBJECT_OPTIONS.map((opt) => (
                <label key={opt.value} className="filter-chip-label">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={selectedSubjects.includes(opt.value)}
                    onChange={() =>
                      toggleFilter(selectedSubjects, setSelectedSubjects, opt.value)
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Filter Group: Style */}
          <div className="filter-group">
            <div className="filter-group-title">Phong Cách (Style)</div>
            <div className="filter-options" id="filter-style">
              {STYLE_OPTIONS.map((opt) => (
                <label key={opt.value} className="filter-chip-label">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={selectedStyles.includes(opt.value)}
                    onChange={() =>
                      toggleFilter(selectedStyles, setSelectedStyles, opt.value)
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Filter Group: Effect */}
          <div className="filter-group">
            <div className="filter-group-title">Hiệu Ứng (Effect)</div>
            <div className="filter-options" id="filter-effect">
              {EFFECT_OPTIONS.map((opt) => (
                <label key={opt.value} className="filter-chip-label">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={selectedEffects.includes(opt.value)}
                    onChange={() =>
                      toggleFilter(selectedEffects, setSelectedEffects, opt.value)
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="content-area">
          {/* Toolbar */}
          <div className="gallery-toolbar-bar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="search"
                id="gallery-search-input"
                className="gallery-search-input"
                placeholder="Tìm theo tên pack, môn học, từ khóa..."
                aria-label="Tìm kiếm template pack"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="results-count" id="results-count">
              Đang hiển thị {filteredPacks.length} template pack
              {filteredPacks.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredPacks.length > 0 ? (
            <div className="gallery-cards-grid" id="gallery-cards-grid">
              {filteredPacks.map((pack) => {
                const bg = pack.tokens.colors.bgCanvas;
                const fg = pack.tokens.colors.textMain;
                const pri = pack.tokens.colors.primary;

                return (
                  <article
                    key={pack.id}
                    className="pack-card"
                    data-pack-id={pack.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Xem chi tiết ${pack.name}`}
                    onClick={() => setSelectedPack(pack)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPack(pack);
                      }
                    }}
                  >
                    <div
                      className="card-preview"
                      style={{
                        background: bg,
                        color: fg,
                        borderBottom: `2px solid ${pri}`,
                      }}
                    >
                      <div className="preview-canvas-mock">
                        <div>
                          <span
                            className="mock-badge"
                            style={{ background: pri, color: 'white' }}
                          >
                            {pack.id.toUpperCase()}
                          </span>
                          <div className="mock-title" style={{ color: fg }}>
                            {pack.name}
                          </div>
                        </div>
                        <div className="mock-meta" style={{ color: fg }}>
                          <span>✨ {pack.layouts.length} Bố cục</span>
                          <span>•</span>
                          <span>⚡ GSAP Sync</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="card-header-row">
                        <h3 className="pack-name">{pack.name}</h3>
                        <span className="pack-layouts-count">
                          {pack.layouts.length} Bố Cục
                        </span>
                      </div>
                      <p className="pack-desc">{pack.description}</p>

                      <div className="tag-chips">
                        {pack.tags.subject.map((s) => (
                          <span key={s} className="tag-chip subject">
                            {TAG_LABELS[s] || s}
                          </span>
                        ))}
                        {pack.tags.style.map((st) => (
                          <span key={st} className="tag-chip style">
                            {TAG_LABELS[st] || st}
                          </span>
                        ))}
                        {pack.tags.effect.map((ef) => (
                          <span key={ef} className="tag-chip effect">
                            {TAG_LABELS[ef] || ef}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        className="btn-view-details"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPack(pack);
                        }}
                      >
                        Chi tiết pack →
                      </button>
                      <button
                        className="btn-use-card"
                        type="button"
                        data-use-id={pack.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(pack.id);
                        }}
                      >
                        Dùng template
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="gallery-empty-state" id="gallery-empty-state">
              <div className="empty-icon">📂</div>
              <h3 className="empty-title">Không tìm thấy Template Pack phù hợp</h3>
              <p className="empty-desc">
                Thử nới lỏng các bộ lọc môn học/phong cách hoặc xóa từ khóa tìm kiếm để khám
                phá thêm các bộ template khác.
              </p>
              <button
                className="btn-open-studio"
                id="btn-empty-reset"
                onClick={handleResetFilters}
              >
                Xóa bộ lọc & Tải lại
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Detail Drawer */}
      <div
        className={`gallery-drawer-overlay ${selectedPack ? 'open' : ''}`}
        id="gallery-drawer-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedPack(null);
          }
        }}
      >
        {selectedPack && (
          <div className="gallery-drawer-content">
            <div className="drawer-header">
              <div className="drawer-title-group">
                <h3 id="drawer-title">{selectedPack.name}</h3>
                <p id="drawer-desc">{selectedPack.description}</p>
              </div>
              <button
                className="btn-close-drawer"
                id="btn-close-drawer"
                aria-label="Đóng chi tiết"
                onClick={() => setSelectedPack(null)}
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              <div>
                <div className="drawer-section-title">Bảng Màu & Tokens</div>
                <div className="tokens-preview-box">
                  <div className="color-swatches" id="drawer-swatches">
                    {Object.entries(selectedPack.tokens.colors).map(([key, val]) => (
                      <div key={key} className="color-swatch-item">
                        <span className="swatch-dot" style={{ background: val }} />
                        <span>
                          {key}: {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="drawer-section-title">
                  Danh Sách Bố Cục Sư Phạm (
                  <span id="drawer-layouts-count">{selectedPack.layouts.length}</span>)
                </div>
                <div className="layouts-list" id="drawer-layouts-list">
                  {selectedPack.layouts.map((l, idx) => (
                    <div key={l.id || idx} className="layout-item-card">
                      <div className="layout-info">
                        <h4>
                          {idx + 1}. {l.name}
                        </h4>
                        <p>
                          Mục đích: {l.purpose} • {l.variants || 1} biến thể
                        </p>
                      </div>
                      <span className="layout-badge">{l.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                className="btn-cancel"
                id="btn-cancel-drawer"
                onClick={() => setSelectedPack(null)}
              >
                Đóng
              </button>
              <button
                className="btn-confirm-use"
                id="btn-confirm-use"
                onClick={() => handleUseTemplate(selectedPack.id)}
              >
                Sử Dụng Template Này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
