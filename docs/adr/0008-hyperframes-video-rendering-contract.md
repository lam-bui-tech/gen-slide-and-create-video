# ADR 0008: HyperFrames Embedded Video Rendering Contract

## Status
Accepted

## Context
AI Lecture Studio v2 cần hỗ trợ chèn video cục bộ vào slide bài giảng (ví dụ video thí nghiệm, video tình huống sư phạm, hoặc video minh họa thao tác phần mềm). Cần xác định rõ cơ chế nhúng, render ra MP4, trích xuất poster frame cho PDF/PPTX, và quy tắc đồng bộ âm lượng/thời lượng timeline (P6.1, P6.2, P6.3).

## Decision
1. **Định dạng video hỗ trợ**:
   - Chấp nhận `.mp4` và `.webm` tải lên cục bộ từ giáo viên.
   - Lưu trữ tại `storage/projects/{project_id}/videos/{filename}`.
   - Phục vụ tĩnh kèm hỗ trợ HTTP Range requests (`206 Partial Content`) để hỗ trợ tua và streaming trên Studio Canvas.

2. **Quy tắc Data Attributes cho HyperFrames HTML**:
   - Sử dụng thẻ HTML5 `<video>` với các thuộc tính:
     - `data-start`: Thời gian bắt đầu slide.
     - `data-duration`: Thời lượng phát video.
     - `data-media-start`: Điểm cắt đầu (trim start offset tính bằng giây).
     - `data-volume`: Âm lượng video (ducking `0.2` - `0.3` khi phát dưới narration, `1.0` khi không có narration).
     - `data-has-audio="true"`: Khi video có âm thanh cần giữ; hoặc `muted` khi tắt tiếng hoàn toàn.
     - `class="clip"`: Bắt buộc để nhận quy tắc layout của HyperFrames.

3. **Cơ chế Render MP4**:
   - Sử dụng `npx hyperframes render --video-frame-format auto`.
   - Đối với tài liệu quay màn hình UI, dùng `--video-frame-format png`.

4. **Poster Frame cho PDF và PPTX**:
   - Backend trích xuất tự động frame tại `t=trimStart` (hoặc `1.0s`) bằng FFmpeg và lưu vào `storage/projects/{id}/images/poster_{video_id}.png`.
   - Export service sử dụng `posterUrl` này làm hình ảnh đại diện khi xuất tài liệu in PDF và slide PowerPoint.

5. **Quy tắc Timeline Sync (Audio-First)**:
   - Thời lượng slide khi có video:
     `slide.durationSeconds = max(narration_duration + 0.8, trimmed_clip_length, 3.0)`

## Consequences
- Tận dụng tối đa khả năng native của HyperFrames CLI, không cần viết lại video compositor phức tạp.
- Xuất khẩu MP4, PDF, PPTX đồng bộ mượt mà không gây lỗi blank media.
