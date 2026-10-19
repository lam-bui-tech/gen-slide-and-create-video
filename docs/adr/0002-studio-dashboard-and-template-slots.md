# 0002. Studio Dashboard and Master Template Slots

## Context
Người dùng không chuyên kỹ thuật (non-tech) cần một phương thức trực quan để tải tài liệu lên, xem trước slide, tinh chỉnh từ ngữ và kịch bản giảng bài mà không cần chạm vào mã nguồn phức tạp hay lo sợ làm vỡ bố cục trình bày.

## Decision
1. **Studio Dashboard hai cột**:
   - Cột trái: Bộ điều khiển biên tập, chọn mẫu bố cục, chỉnh sửa tiêu đề/nội dung và kịch bản sư phạm của AI, tích hợp nút nghe thử và tái tạo âm thanh.
   - Cột phải: Khung hiển thị trực tiếp (Live Canvas) tỉ lệ 16:9 với phong cách Academic Navy & Cyan, tích hợp thanh phát âm thanh đồng bộ thời lượng thực.
2. **Bộ 5 Khuôn mẫu Bố cục chuẩn (Master Template Slots)**:
   - `hero`: Bìa chương và thông tin học phần.
   - `agenda`: Mục tiêu chuẩn đầu ra và mạch bài học.
   - `timeline`: Tiến trình lịch sử và các giai đoạn chuyển hóa.
   - `process`: Ba nấc thang phát triển tư duy / nhận thức.
   - `comparison`: Đối sánh hai mặt điều kiện xã hội và tiền đề trí thức.
   - `definition`: Định nghĩa cốt lõi và 4 trụ cột luận điểm.
3. **Mô hình Dữ liệu tập trung (`lecture.json`)**: Mọi tương tác của người dùng trên giao diện web đều được đồng bộ hóa hai chiều với `lecture.json` và `audio/durations.json`.
