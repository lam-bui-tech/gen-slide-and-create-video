# 0003. Kinetic Academic Light Design System and Interactive Diagrams

## Context
Người dùng nhận xét bộ slide ban đầu còn bị cứng và đơn điệu. Tham khảo từ bài giảng Protein mẫu (`index.html`), người dùng yêu cầu bài giảng Triết học Mác - Lênin phải mang tính sinh động cao, có chuyển động nhịp nhàng, sơ đồ tư duy động kết nối trực quan và phân cấp thị giác rõ nét.

## Decision
1. **Phong cách thiết kế Kinetic Academic Light**:
   - Nền sáng nhẹ đa tầng `#F5FAFF` kết hợp lưới background grid `rgba(14, 165, 233, 0.06)` và hiệu ứng radial gradient.
   - Bảng màu *Classic Academic Ocean & Amber*: Xanh tri thức chủ đạo (`#0EA5E9`, `#0369A1`), vàng kim điểm nhấn trích dẫn (`#D97706`), xanh ngọc duy vật (`#10B981`) và đỏ hồng duy tâm (`#E11D48`).
   - Thẻ card trắng tinh tế `#FFFFFF` viền cyan mờ `#BAE6FD`, bóng đổ đa lớp tạo chiều sâu không gian.
2. **Sơ đồ tư duy động (Interactive Visual Diagrams)**:
   - Tích hợp sơ đồ kết nối các node tư duy (Sơ đồ 3 nấc thang nhận thức, Cân bằng đối xứng Duy vật - Duy tâm, Lộ trình lịch sử phát triển) với đường nối SVG phát sáng và chuyển động GSAP mượt mà.
3. **Đồng bộ hai chiều với HyperFrames Engine**:
   - Nâng cấp `index.html` theo chuẩn HyperFrames (timeline GSAP xác định, clip tags, thời lượng đồng bộ audio VieNeu `Mỹ Duyên` 95.52 giây) để sẵn sàng `npm run render` ra video MP4.
   - Cung cấp giao diện `studio.html` cho người non-tech tùy biến nội dung từng node sơ đồ trực quan mà không lo vỡ layout.
