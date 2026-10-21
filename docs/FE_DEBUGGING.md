# Hướng Dẫn Chẩn Đoán & Sửa Lỗi Frontend (FE Debugging Playbook)

Tài liệu này hướng dẫn quy trình khoanh vùng và xử lý lỗi trong kiến trúc Next.js 15 + Zustand + GSAP của **AI Lecture Studio**.

---

## 1. Luồng Dữ Liệu 4 Bước (The 4-Layer Diagnostic Funnel)

Khi gặp bất kỳ lỗi hiển thị hoặc lỗi hành vi nào trên giao diện, hãy đi qua 4 tầng theo đúng thứ tự:

```
[1. Store Action] ➔ [2. Studio Reducer] ➔ [3. renderSlide Template] ➔ [4. Canvas GSAP Effect]
```

### Bước 1: Store Action (`web/src/store/useStudioStore.ts`)
- **Kiểm tra:** Action đã được `dispatch()` hay chưa?
- **Cách xem:**
  - Nhấn phím `D` hoặc thêm `?debug=1` vào URL để mở **DebugDrawer**.
  - Xem tab **Action Log** để kiểm tra action type, payload và timestamp.
  - Xem tab **History Stack** để biết trạng thái undo/redo stack.

### Bước 2: Studio Reducer (`studio/reducer.js`)
- **Kiểm tra:** State `scene` sau khi reducer xử lý có đúng với mong đợi không?
- **Cách xem:**
  - Xem tab **Scene JSON** trong DebugDrawer.
  - Kiểm tra xem slide đang chọn có bị thiếu trường (`slotValues`, `durationSeconds`, `media`, `voice`) không.

### Bước 3: Template Generator (`templates/index.js` -> `renderSlide`)
- **Kiểm tra:** Chuỗi HTML sinh ra từ `renderSlide(slide, 0, 0)` có đúng cấu trúc DOM không?
- **Cách xem:**
  - Mở DevTools Elements inspect `#slide-live-canvas .clip`.
  - Kiểm tra các selector có thuộc tính `contenteditable` hoặc class `.slide-title`, `.card-body` tương ứng.

### Bước 4: Canvas GSAP Effect (`web/src/hooks/useSlideTimeline.ts`)
- **Kiểm tra:** GSAP timeline có khởi tạo thành công không? Có bị memory leak hoặc xung đột animation không?
- **Cách xem:**
  - Kiểm tra Console log xem GSAP có ném warning về target không tìm thấy không (`GSAP target .xyz not found`).
  - Kiểm tra xem `gsap.context` có được dọn dẹp sạch sẽ khi chuyển slide không.

---

## 2. 5 Tình Huống Lỗi Thực Tế & Cách Xử Lý (5 Worked Examples)

### Tình huống 1: Slide Bị Trắng Tinh (Blank Slide)
- **Triệu chứng:** Khi chuyển đến một slide nhất định hoặc sau khi AI sinh nội dung, khung canvas không hiển thị gì cả hoặc báo lỗi đỏ.
- **Vị trí lỗi:** Tầng 2 (Reducer) hoặc Tầng 3 (Template).
- **Nguyên nhân phổ biến:**
  1. `templateId` của slide không tồn tại trong `TEMPLATES` registry.
  2. `layoutVariant` được chỉ định nhưng template không có variant đó.
  3. `slotValues` bị `undefined` hoặc `null` dẫn đến truy cập thuộc tính trên undefined trong template string.
- **Cách khoanh vùng:**
  1. Mở DebugDrawer (`D`) -> Tab **Scene JSON** -> tìm đến slide lỗi.
  2. Đọc trường `templateId` và `layoutVariant`.
  3. Kiểm tra file template tương ứng trong `templates/basic/`.
- **Cách khắc phục:**
  - Đảm bảo `sceneReducer` luôn fallback về `layoutVariant: 'default'` và khởi tạo `slotValues: {}` nếu slide được tạo mới.

---

### Tình huống 2: Ảnh Bị Lỗi 404 / Không Tải Được
- **Triệu chứng:** Khung hình ảnh hoặc avatar trên slide hiện icon ảnh vỡ hoặc log console báo lỗi `GET 404 (Not Found)`.
- **Vị trí lỗi:** Tầng 1 (API Proxy) hoặc Tầng 2 (Đường dẫn Media).
- **Nguyên nhân phổ biến:**
  - AI sinh đường dẫn tương đối (ví dụ `storage/projects/xyz/images/img1.png`) nhưng Next.js chạy trên cổng `:3001` không tìm thấy file nếu thiếu proxy rewrite `/storage/:path*` về Backend `:8000`.
- **Cách khoanh vùng:**
  1. Mở tab **API Logs** trong DebugDrawer.
  2. Kiểm tra xem URL yêu cầu có đi qua `NEXT_PUBLIC_API_BASE` không.
  3. Kiểm tra `web/next.config.mjs` có rewrite rule cho `/storage/:path*` chưa.
- **Cách khắc phục:**
  - Giữ rewrite proxy trong `web/next.config.mjs`:
    ```js
    {
      source: '/storage/:path*',
      destination: `${backendUrl}/storage/:path*`,
    }
    ```

---

### Tình huống 3: Thời Lượng Âm Thanh Bị Lệch / Stale Audio Duration
- **Triệu chứng:** Đã bấm "Tạo lại giọng đọc" (Regenerate Voice), file audio mới dài hơn hoặc ngắn hơn, nhưng thanh Timeline hoặc Trình Chiếu vẫn kết thúc sớm/muộn so với tiếng nói.
- **Vị trí lỗi:** Tầng 2 (Reducer Action `UPDATE_SLIDE_VOICE` hoặc `UPDATE_SLIDE_DURATION`).
- **Nguyên nhân phổ biến:**
  - Khi API tổng hợp TTS trả về `durationSeconds: 7.5`, frontend chỉ cập nhật `slide.voice.audioUrl` mà quên cập nhật `slide.durationSeconds = durationSeconds + 1.0` (buffer) và `recomputeTotalDuration()`.
- **Cách khoanh vùng:**
  1. Mở DebugDrawer -> Tab **Action Log** -> tìm action `UPDATE_SLIDE_VOICE`.
  2. Mở Tab **Scene JSON** -> so sánh `slide.voice.durationSeconds` với `slide.durationSeconds`.
- **Cách khắc phục:**
  - Trong `VoicePanel.tsx`, khi gọi `api.synthesizeAudio`, luôn dispatch cập nhật đồng thời cả `voice` và `durationSeconds`.

---

### Tình huống 4: Mất Dấu Nháy Chuột Khi Gõ Văn Bản (Lost Caret)
- **Triệu chứng:** Người dùng gõ một ký tự vào ô `contenteditable` trên canvas, dấu nháy chuột ngay lập tức nhảy về đầu dòng hoặc mất focus hoàn toàn.
- **Vị trí lỗi:** Tầng 4 (React Re-render Canvas Effect).
- **Nguyên nhân phổ biến:**
  - Mỗi khi user gõ phím, `UPDATE_SLIDE` được dispatch lên store làm thay đổi `scene`, khiến React re-render lại component `<SlideCanvas />` và ghi đè lại toàn bộ `innerHTML` của canvas, phá hủy con trỏ chuột của trình duyệt.
- **Cách khoanh vùng:**
  - Kiểm tra `web/src/components/canvas/SlideCanvas.tsx` xem có so sánh `computeContentHash()` trước khi ghi đè `innerHTML` hay không.
- **Cách khắc phục:**
  - Giữ nguyên tắc caret-preservation trong `SlideCanvas.tsx`:
    - Chỉ gán `innerHTML = html` khi hash nội dung của slide thực sự thay đổi từ bên ngoài (chuyển slide, đổi template, apply AI patch).
    - Khi người dùng đang nhập liệu trực tiếp (`activeElement` là một contenteditable bên trong canvas), không ghi đè DOM của element đó.
    - Chỉ dispatch commit dữ liệu lên store khi xảy ra sự kiện `blur`.

---

### Tình huống 5: Trùng Lặp Animation / Timeline Chạy Nhanh Gấp Đôi (Duplicate GSAP Timeline)
- **Triệu chứng:** Trong môi trường phát triển (`npm run dev`), các hiệu ứng xuất hiện giật cục hoặc chạy đè lên nhau, thời gian chạy nhanh gấp đôi.
- **Vị trí lỗi:** Tầng 4 (GSAP Context Cleanup).
- **Nguyên nhân phổ biến:**
  - React 18/19 StrictMode chạy `useEffect` 2 lần khi mount trong chế độ Dev. Nếu không dọn dẹp GSAP timeline cũ, timeline thứ hai sẽ đè lên cùng các phần tử DOM.
- **Cách khoanh vùng:**
  - Kiểm tra `web/src/hooks/useSlideTimeline.ts` xem có sử dụng `gsap.context()` và gọi `ctx.revert()` trong cleanup function không.
- **Cách khắc phục:**
  ```ts
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Build timeline
    }, containerRef);

    return () => {
      ctx.revert(); // Dọn dẹp hoàn toàn mọi tween, inline styles và listener
    };
  }, [slideIndex, slideId]);
  ```

---

## 3. Công Cụ Hỗ Trợ Chẩn Đoán (Diagnostic Tools)

1. **ErrorBoundary Panes:**
   - Mỗi phân vùng màn hình (SlideNavigator, SlideCanvas, PropsPanel, ModalHost, PresentationMode) đều được bọc trong một `ErrorBoundary` độc lập.
   - Khi một phân vùng bị crash, các phân vùng khác vẫn hoạt động bình thường.
   - Nút **"📋 Sao Chép Chẩn Đoán"** sẽ copy toàn bộ stack trace, slide ID, index và cấu hình máy vào Clipboard để gửi cho đội ngũ phát triển.

2. **Debug Drawer (`D` hoặc `?debug=1`):**
   - Chứa toàn bộ trạng thái sống: Scene JSON, History Stack (Undo/Redo), 50 Actions gần nhất và 20 API requests gần nhất với thời gian phản hồi (ms) và dung lượng payload (bytes).

3. **VS Code Debugger:**
   - Mở tab Run & Debug trong VS Code và chọn cấu hình:
     - `Next.js: debug full stack` (Debug cả server lẫn client Chrome cùng lúc).
     - `Next.js: debug client-side` (Attach Chrome debugger vào cổng `:3001`).
