# 0009. Chuyển Đổi Frontend Từ Vanilla JS (index.html) Sang Next.js 15 + TypeScript + Zustand

**Trạng thái:** Đã chấp thuận (Accepted)  
**Ngày:** 2026-10-21  
**Tác giả:** Antigravity (AI Assistant) & Người B (Studio Frontend)  
**Tài liệu liên quan:** `fe-migration-nextjs-playbook.md`, `docs/FE_AS_IS.md`, `docs/FE_PARITY.md`, `docs/SPEC_V2.md`

---

## 1. Bối Cảnh

Frontend hiện tại của ứng dụng AI Lecture Studio được đặt trọn trong một file đơn `index.html` (4,420 dòng, ~182 KB):
- ~745 dòng CSS inline (`<style>`).
- ~655 dòng HTML cấu trúc body và các modal đặt sau script.
- ~2,867 dòng JavaScript module đóng gói toàn bộ logic trong một class `StudioApp` với 48 methods và ~775 dòng gán sự kiện trong `bindEvents()`.
- Truy cập trực tiếp 139 DOM ID qua `getElementById` và 25 vị trí gán `innerHTML`.
- 20 điểm gọi `fetch` rải rác với các biến `API_BASE` không đồng nhất và fallback giả (`'demo'`, `'sample'`).
- Không có kiểm thử tự động cho UI (chỉ có kiểm thử Python cho các JS module độc lập ở `tests/engine/`).

Mặc dù các module nghiệp vụ lõi (`studio/reducer.js`, `studio/flow.js`, `studio/builder.js`, `studio/quality.js`, `templates/index.js`, `templates/registry.js`, `templates/migration.js`) đã được mô-đun hóa sạch sẽ và có test Python bảo vệ, việc duy trì `index.html` gây khó khăn lớn cho việc bảo trì, debug và mở rộng tính năng.

---

## 2. Các Quyết Định Kiến Trúc

### 2.1 Lựa chọn Công nghệ: Next.js 15 (App Router) + TypeScript Strict + Zustand
- **Khung ứng dụng:** Next.js 15 (App Router). Toàn bộ giao diện Studio chạy dưới dạng **Client Components** (`'use client'`).
- **Ngôn ngữ:** TypeScript ở chế độ nghiêm ngặt (`strict: true`). Các file JS dùng chung (`studio/`, `templates/`) được hỗ trợ thông qua `allowJs: true` và file khai báo shim `.d.ts`.
- **Quản lý trạng thái:** **Zustand** được chọn vì cấu trúc nhẹ, dễ debug (tích hợp Redux DevTools), cho phép bọc trực tiếp `sceneReducer` hiện có mà không phải viết lại logic state machine.
- **GSAP:** Khóa cứng phiên bản `gsap@3.14.2` tương đồng chính xác với phiên bản CDN đang dùng trên `index.html`.

### 2.2 Chiến Lược Chuyển Đổi: Strangler Fig Pattern & Kế Hoạch Cổng Mạng
- Giữ nguyên `index.html` và `server.js` chạy ở cổng **3000** trong suốt quá trình chuyển đổi để làm bản quy chiếu đối soát.
- Ứng dụng Next.js mới được đặt trong thư mục `web/` và chạy độc lập ở cổng **3001** (`next dev -p 3001`).
- Chỉ thực hiện cutover (thay thế bản cũ) khi toàn bộ tiêu chí trong checklist parity và bộ test Playwright chạy xanh 100%.

### 2.3 Nguyên Tắc "Một Nguồn Sự Thật" (Single Source of Truth)
- Các thư mục `templates/`, `studio/`, `schemas/` được **giữ nguyên tại vị trí hiện tại** ở gốc repository.
- `web/` import trực tiếp các module này qua TypeScript path aliases (`@engine/*`, `@templates/*`, `@schemas/*`) và cấu hình `transpilePackages: ['../studio', '../templates']` trong `next.config.mjs`. Tuyệt đối không sao chép hoặc fork mã nguồn.
- Hàm `renderSlide()` tiếp tục sinh chuỗi HTML thuần (không chuyển sang JSX ở đợt này) để đảm bảo đồng nhất 100% giữa giao diện trực tiếp trên canvas và luồng xuất video HyperFrames MP4 (`sceneToHyperFramesHtml`).

### 2.4 Chiến Lược CSS & Giao Diện
- Di chuyển toàn bộ ~745 dòng CSS inline từ `index.html` cùng `templates/tokens.css` và `templates/templates.css` thành bộ CSS toàn cục `web/src/styles/studio.css` trong giai đoạn đầu để bảo toàn chính xác 100% kích thước pixel và layout.
- Sau khi đạt parity, các khối CSS này sẽ được tách dần thành CSS Modules theo từng component.
- Không đưa TailwindCSS hoặc các thư viện UI ngoài vào trong đợt chuyển đổi này nhằm triệt tiêu nguy cơ lệch layout.

### 2.5 Kiến Trúc Truy Cập API & Proxy
- Tạo file duy nhất `web/src/lib/api.ts` đóng gói toàn bộ 20 call sites thành các hàm có kiểu rõ ràng.
- Sử dụng cơ chế `rewrites` trong `next.config.mjs` để chuyển tiếp các tiền tố `/projects`, `/exports`, `/storage`, `/packs` sang FastAPI Backend (`http://localhost:8000`).
- Thiết lập `proxyTimeout: 300000` (5 phút) để đáp ứng các tác vụ bóc tách tài liệu LLM và tổng hợp giọng đọc TTS thời lượng dài.
- Xóa bỏ toàn bộ fallback giả mạo (`'demo'`, `'sample'`). Nếu thiếu `projectId`, API client phát sinh lỗi `ApiError` tường minh.

### 2.6 Khung Kiểm Thử (Test Stack) & Định Nghĩa Parity
- **Unit & Component Testing:** Vitest + React Testing Library cho store, reducers, custom hooks và components.
- **End-to-End Testing:** Playwright chạy kiểm thử tự động đối sánh giữa cổng :3000 (bản cũ) và cổng :3001 (bản mới).
- **Tiêu chuẩn Parity:** Toàn bộ 23 nhóm hành vi của Studio (theo `docs/FE_PARITY.md`) phải hoạt động giống hệt bản cũ: 10 layout hiển thị chuẩn xác từng pixel, chỉnh sửa inline text trên canvas không mất dấu nháy, đồng bộ âm thanh - timeline mượt mà, và các luồng xuất tệp MP4/PDF/PPTX hoàn tất thành công.

### 2.7 Số Phận của `server.js` Sau Cutover
- Sau khi Next.js đạt parity và được nghiệm thu, file `index.html` cũ sẽ được di chuyển vào `legacy/index.html` trong 1 phiên bản trước khi dọn dẹp.
- `server.js` có thể được tinh giản hoặc nghỉ hưu vì Next.js đã đảm nhiệm phục vụ giao diện tĩnh và định tuyến proxy sang FastAPI backend.

---

## 3. Hệ Quả & Rủi Ro Đã Nhận Diện

| Rủi ro | Giải pháp kỹ thuật |
|---|---|
| Mất dấu nháy (caret position) khi gõ trong `contenteditable` do React re-render | `SlideCanvas` chỉ nạp lại `innerHTML` khi ID hoặc layout slide thay đổi (dùng content hash). Thao tác gõ chỉ cập nhật DOM cục bộ và gửi action vào Zustand store khi `blur`. |
| GSAP timeline tạo lặp lại do React StrictMode chạy effect 2 lần trong dev | Bọc toàn bộ khởi tạo GSAP trong `gsap.context()` và dọn dẹp triệt để trong cleanup function. |
| XSS do chèn `innerHTML` | Đã kiểm định: toàn bộ chuỗi nội dung trong `renderSlide` được bọc qua hàm `escapeHtml()` chống chèn mã độc. |
| Server-Side Rendering (SSR) lỗi do truy cập `window`/`document` | Toàn bộ studio page là Client Component (`'use client'`); các module `studio/` và `templates/` đã được audit: 0 tham chiếu `window`/`document` ở import-time. |
