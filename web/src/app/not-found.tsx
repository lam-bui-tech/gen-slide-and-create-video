import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h2>404 — Không Tìm Thấy Trang</h2>
      <p style={{ color: '#475569', marginTop: '8px' }}>Trang bạn tìm kiếm không tồn tại.</p>
      <Link href="/" style={{ marginTop: '16px', color: '#0284C7', textDecoration: 'underline' }}>
        Quay về trang chủ Gallery
      </Link>
    </div>
  );
}
