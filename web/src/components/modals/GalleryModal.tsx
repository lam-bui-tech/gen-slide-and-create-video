'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function GalleryModal() {
  const isGalleryOpen = useStudioStore((s) => s.isGalleryOpen);
  const galleryIntent = useStudioStore((s) => s.galleryIntent);
  const closeGalleryModal = useStudioStore((s) => s.closeGalleryModal);
  const selectedGalleryPackId = useStudioStore((s) => s.selectedGalleryPackId);
  const setSelectedGalleryPackId = useStudioStore((s) => s.setSelectedGalleryPackId);
  const availablePacks = useStudioStore((s) => s.availablePacks);
  const dispatch = useStudioStore((s) => s.dispatch);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');

  if (!isGalleryOpen) return null;

  const packs = availablePacks.length > 0 ? availablePacks : [
    {
      id: 'basic',
      packId: 'basic',
      name: 'Bộ Mẫu Cơ Bản (Academic Ocean)',
      description: 'Bộ mẫu chuẩn giảng dạy đại học, tông màu xanh biển học thuật.',
      tags: ['toan-tin', 'hoc-thuat-nghiem-tuc', 'khoa-hoc-tu-nhien'],
      layouts: Array(10).fill({}),
    },
    {
      id: 'modern-dark',
      packId: 'modern-dark',
      name: 'Hiện Đại Tối Giản (Modern Minimal)',
      description: 'Tông đen/xám cao cấp, thích hợp cho kỹ thuật và lập trình.',
      tags: ['toan-tin', 'hien-dai-toi-gian'],
      layouts: Array(8).fill({}),
    },
    {
      id: 'warm-pedagogy',
      packId: 'warm-pedagogy',
      name: 'Sư Phạm Trẻ Trung (Warm Editorial)',
      description: 'Tông màu ấm áp, kích thích tương tác cho học sinh và sinh viên.',
      tags: ['xa-hoi-nhan-van', 'sinh-dong-tre-trung'],
      layouts: Array(10).fill({}),
    },
  ];

  const filteredPacks = packs.filter((p: any) => {
    const pId = p.id || p.packId || '';
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !pId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (subjectFilter && !p.tags?.includes(subjectFilter)) {
      return false;
    }
    if (styleFilter && !p.tags?.includes(styleFilter)) {
      return false;
    }
    return true;
  });

  const handleConfirm = () => {
    if (galleryIntent === 'switch-pack') {
      dispatch(
        {
          type: 'SWITCH_TEMPLATE_PACK',
          payload: { packId: selectedGalleryPackId },
        },
        'Chuyển đổi bộ mẫu'
      );
    }
    closeGalleryModal();
  };

  return (
    <div
      className="modal-overlay open"
      id="gallery-step-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-modal-title"
    >
      <div
        className="modal-box"
        style={{
          width: '880px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '14px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2
              id="gallery-modal-title"
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span>🎨</span> Kho Bộ Mẫu Giảng Dạy (Template Gallery)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '4px', marginBottom: 0 }}>
              {galleryIntent === 'switch-pack'
                ? 'Đổi bộ mẫu (Template Pack) cho bài giảng hiện tại.'
                : 'Bước 1: Chọn bộ mẫu thiết kế chuẩn sư phạm trước khi nạp tài liệu.'}
            </p>
          </div>
          <button
            id="btn-close-gallery-modal"
            className="btn btn-secondary btn-icon"
            aria-label="Đóng thư viện mẫu"
            style={{ fontSize: '16px' }}
            onClick={closeGalleryModal}
          >
            ✕
          </button>
        </div>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            id="gallery-search-input"
            placeholder="🔍 Tìm kiếm bộ mẫu..."
            aria-label="Tìm kiếm bộ mẫu template"
            className="prop-input"
            style={{ flex: 1, minWidth: '220px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            id="gallery-filter-subject"
            aria-label="Lọc theo môn học"
            className="prop-select"
            style={{ width: '160px' }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">Tất cả môn học</option>
            <option value="toan-tin">Toán - Tin</option>
            <option value="khoa-hoc-tu-nhien">Khoa học tự nhiên</option>
            <option value="xa-hoi-nhan-van">Khoa học Xã hội</option>
            <option value="kinh-te-quan-tri">Kinh tế - Quản trị</option>
            <option value="tong-hop">Tổng hợp</option>
          </select>
          <select
            id="gallery-filter-style"
            aria-label="Lọc theo phong cách"
            className="prop-select"
            style={{ width: '170px' }}
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
          >
            <option value="">Tất cả phong cách</option>
            <option value="hoc-thuat-nghiem-tuc">Học thuật nghiêm túc</option>
            <option value="hien-dai-toi-gian">Hiện đại tối giản</option>
            <option value="sinh-dong-tre-trung">Sinh động trẻ trung</option>
          </select>
        </div>

        {/* Pack Grid */}
        <div
          id="gallery-pack-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
            overflowY: 'auto',
            padding: '4px',
            maxHeight: '50vh',
          }}
        >
          {filteredPacks.map((pack: any, index: number) => {
            const packId = pack.id || pack.packId || `pack-${index}`;
            const isSelected = packId === selectedGalleryPackId;
            return (
              <div
                key={packId}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Chọn bộ mẫu ${pack.name}`}
                onClick={() => setSelectedGalleryPackId(packId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedGalleryPackId(packId);
                  }
                }}
                style={{
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: isSelected ? '#F0F9FF' : '#FFFFFF',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                    {pack.name}
                  </span>
                  {isSelected && <span style={{ color: 'var(--primary)', fontWeight: 800 }}>✓</span>}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '12px' }}>
                  {pack.description}
                </p>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  Mã gói: <code>{packId}</code> · {pack.layouts?.length || 10} layouts
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
            marginTop: '16px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-sub)' }} id="gallery-status-hint">
            Đang chọn: <strong>{selectedGalleryPackId}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" id="btn-gallery-cancel" onClick={closeGalleryModal}>
              Đóng
            </button>
            <button
              className="btn btn-primary"
              id="btn-gallery-confirm"
              onClick={handleConfirm}
              style={{ fontWeight: 700 }}
            >
              Tiếp Tục Với Bộ Mẫu Đã Chọn ➜
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
