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
        <Link
          href="/"
          className="gallery-brand-group"
          aria-label="AI Lecture Studio - Về trang chủ"
        >
          <div className="gallery-brand-icon" aria-hidden="true">🎨</div>
          <div className="gallery-brand-title">
            <h1 className="nav-brand">AI Lecture Studio</h1>
            <p>Thư Viện Template Sư Phạm Chuẩn Mực & Đa Dạng Bố Cục</p>
          </div>
        </Link>

        <div className="gallery-top-actions">
          <a
            href="#help-section"
            className="btn-help-link"
            id="btn-header-help"
            aria-label="Xem hướng dẫn và trợ giúp"
          >
            ❓ Trợ Giúp
          </a>
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
            <h3 className="filter-group-title">Môn Học (Subject)</h3>
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
            <h3 className="filter-group-title">Phong Cách (Style)</h3>
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
            <h3 className="filter-group-title">Hiệu Ứng (Effect)</h3>
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
            <div
              className="results-count"
              id="results-count"
              role="status"
              aria-live="polite"
            >
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
                    onClick={() => setSelectedPack(pack)}
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
                        aria-label={`Xem chi tiết pack ${pack.name}`}
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
                        aria-label={`Dùng template ${pack.name}`}
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

      {/* Footer (Help, FAQ & Documentation) */}
      <footer className="gallery-footer" id="help-section" aria-label="Thông tin hỗ trợ và tài liệu">
        <div className="gallery-footer-inner">
          <div className="footer-col footer-col-about">
            <Link href="/" className="footer-brand" aria-label="AI Lecture Studio">
              <span className="footer-brand-badge" aria-hidden="true">🎨</span>
              <span>AI Lecture Studio</span>
            </Link>
            <p className="footer-desc">
              Hệ thống phòng thu và biên tập video bài giảng sư phạm tự động hóa cao cấp.
              Hỗ trợ chuẩn bố cục trực quan, đồng bộ giọng đọc AI và timeline chuyển động chuẩn xác.
            </p>
          </div>

          <div className="footer-col">
            <h3>Tài Liệu & Hướng Dẫn</h3>
            <ul className="footer-links">
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(
                      'Tài liệu hướng dẫn:\n1. Chọn một Template Pack phù hợp với môn học.\n2. Bấm "Chi tiết pack" để xem danh sách bố cục hoặc "Dùng template" để vào phòng thu ngay.'
                    );
                  }}
                >
                  📖 Hướng Dẫn Soạn Bài
                </a>
              </li>
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(
                      'Quy trình làm video:\n1. Soạn nội dung & ghi chú slide\n2. Cấu hình âm thanh/voiceover AI\n3. Xem thử timeline và hoạt ảnh\n4. Xuất video MP4 qua Render Engine.'
                    );
                  }}
                >
                  ⚙️ Quy Trình Làm Video
                </a>
              </li>
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Thư viện layout: Hơn 50+ bố cục sư phạm tích hợp sẵn theo từng nhóm bộ môn chuyên sâu.');
                  }}
                >
                  📐 Thư Viện Bố Cục Sư Phạm
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Câu Hỏi Thường Gặp (FAQ)</h3>
            <ul className="footer-links">
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Hệ thống hỗ trợ xuất video MP4 Full HD 1080p và 4K chuẩn xác từng khung hình.');
                  }}
                >
                  ❓ Xuất Video Như Thế Nào?
                </a>
              </li>
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Bạn có thể tùy biến toàn bộ màu sắc, typography và hiệu ứng qua hệ thống Design Tokens.');
                  }}
                >
                  🎨 Tùy Chỉnh Bảng Màu
                </a>
              </li>
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Toàn bộ bài giảng và tệp tin của bạn được lưu an toàn trên máy cục bộ.');
                  }}
                >
                  🔒 Bảo Mật Dữ Liệu
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Hỗ Trợ & Liên Hệ</h3>
            <ul className="footer-links">
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  💬 Báo Lỗi & Góp Ý (GitHub)
                </a>
              </li>
              <li>
                <a
                  href="#help-section"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Email hỗ trợ kỹ thuật: support@ailecturestudio.local\nThời gian phản hồi: trong vòng 24 giờ.');
                  }}
                >
                  ✉️ Hỗ Trợ Kỹ Thuật
                </a>
              </li>
              <li>
                <Link href="/studio">
                  🚀 Mở Phòng Thu Studio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 AI Lecture Studio. Nền tảng soạn thảo bài giảng sư phạm hiện đại.</div>
        </div>
      </footer>

      {/* Detail Drawer */}
      <div
        className={`gallery-drawer-overlay ${selectedPack ? 'open' : ''}`}
        id="gallery-drawer-overlay"
        role={selectedPack ? 'dialog' : undefined}
        aria-modal={selectedPack ? 'true' : undefined}
        aria-labelledby={selectedPack ? 'drawer-title' : undefined}
        aria-hidden={!selectedPack}
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
