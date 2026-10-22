import os

html_content = r'''<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Khái luận về Triết học và Triết học Mác - Lênin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
/* ==========================================================================
   VIEWPORT BASE CSS (Fixed 1920x1080 Stage & Scaling)
   ========================================================================== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #060913;
  font-family: 'Be Vietnam Pro', sans-serif;
  color: #F4F1DE;
  -webkit-font-smoothing: antialiased;
}

.viewport-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 30%, #111C38 0%, #060913 70%);
}

.stage {
  position: absolute;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.7);
  border: 1px solid rgba(197, 160, 89, 0.25);
  background: #0B132B;
}

.slide {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  padding: 80px 100px;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateY(20px);
}

.slide.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

/* ==========================================================================
   CLASSIC ACADEMIC NAVY & GOLD THEME TOKENS
   ========================================================================== */
:root {
  --acad-navy: #0B132B;
  --acad-slate: #1C2541;
  --acad-blue: #3A506B;
  --acad-gold: #C5A059;
  --acad-gold-light: #E2C073;
  --acad-parchment: #F4F1DE;
  --acad-text-sub: #A0AAB2;
  --acad-border: rgba(197, 160, 89, 0.3);
  --acad-card-bg: rgba(28, 37, 65, 0.75);
}

/* Typography Helpers */
h1, h2, h3, .serif-title {
  font-family: 'Playfair Display', serif;
}

.gold-text {
  color: var(--acad-gold);
}

.parchment-text {
  color: var(--acad-parchment);
}

/* Slide Header & Footer */
.slide-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--acad-border);
  padding-bottom: 24px;
  margin-bottom: 48px;
  flex-shrink: 0;
}

.slide-category {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--acad-gold);
  margin-bottom: 8px;
  display: inline-block;
}

.slide-title-text {
  font-size: 42px;
  font-weight: 700;
  color: var(--acad-parchment);
  line-height: 1.2;
}

.slide-badge-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 600;
  color: var(--acad-gold);
  background: rgba(197, 160, 89, 0.1);
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid var(--acad-border);
}

.slide-footer {
  position: absolute;
  bottom: 50px;
  left: 100px;
  right: 100px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  color: var(--acad-text-sub);
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 20px;
  flex-shrink: 0;
}

/* Content Layouts & Dialectic Cards */
.slide-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow: hidden;
}

.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  align-content: start;
}

.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  align-content: start;
}

.grid-4col {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  align-content: start;
}

.acad-card {
  background: var(--acad-card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--acad-border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.acad-card:hover {
  border-color: var(--acad-gold);
  transform: translateY(-4px);
}

.acad-card h3 {
  font-size: 24px;
  color: var(--acad-gold-light);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.acad-card p, .acad-card li {
  font-size: 18px;
  line-height: 1.6;
  color: #E0E1DD;
}

.bullet-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bullet-list li {
  position: relative;
  padding-left: 28px;
  font-size: 20px;
  line-height: 1.6;
  color: #E0E1DD;
}

.bullet-list li::before {
  content: "◆";
  position: absolute;
  left: 0;
  color: var(--acad-gold);
  font-size: 14px;
  top: 4px;
}

/* Special Title Slide */
.title-slide-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100%;
  padding: 0 150px;
  position: relative;
}

.title-slide-container::before {
  content: "";
  position: absolute;
  inset: 40px;
  border: 1px solid var(--acad-border);
  border-radius: 20px;
  pointer-events: none;
}

.title-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--acad-gold);
  background: rgba(197, 160, 89, 0.15);
  padding: 10px 28px;
  border-radius: 50px;
  margin-bottom: 36px;
  border: 1px solid var(--acad-border);
}

.title-main {
  font-size: 68px;
  font-weight: 700;
  color: var(--acad-parchment);
  line-height: 1.15;
  margin-bottom: 24px;
}

.title-sub {
  font-size: 26px;
  color: var(--acad-text-sub);
  max-width: 1000px;
  line-height: 1.5;
}

/* Navigation UI */
.deck-nav {
  position: fixed;
  bottom: 20px;
  right: 30px;
  display: flex;
  gap: 12px;
  z-index: 1000;
}

.nav-btn {
  background: var(--acad-slate);
  border: 1px solid var(--acad-gold);
  color: var(--acad-gold);
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--acad-gold);
  color: var(--acad-navy);
}

.progress-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255,255,255,0.1);
  z-index: 1000;
}

.progress-bar-fill {
  height: 100%;
  background: var(--acad-gold);
  width: 0%;
  transition: width 0.3s ease;
}

/* Edit Mode Banner */
.edit-banner {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #C5A059;
  color: #0B132B;
  padding: 6px 20px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
  display: none;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
    </style>
</head>
<body>
    <div class="progress-bar-container">
        <div class="progress-bar-fill" id="progressBar"></div>
    </div>
    <div class="edit-banner" id="editBanner">CHẾ ĐỘ CHỈNH SỬA BẬT (Nhấn Ctrl+S để lưu)</div>

    <div class="viewport-wrapper">
        <div class="stage" id="presentationStage">
'''

slides_data = [
    # Slide 1
    {
        "category": "Môn Triết học Mác - Lênin",
        "title": "CHƯƠNG 1: KHÁI LUẬN VỀ TRIẾT HỌC VÀ TRIẾT HỌC MÁC - LÊNIN",
        "num": "01",
        "type": "title",
        "subtitle": "Dành cho sinh viên không chuyên lý luận chính trị | Trường Đại học",
        "content": ["Nghiên cứu bản chất, nguồn gốc triết học", "Hệ thống tri thức nền tảng của chủ nghĩa duy vật biện chứng"]
    },
    # Slide 2
    {
        "category": "Mở đầu",
        "title": "Mục tiêu và Mạch Nội dung Chương 1",
        "num": "02",
        "type": "split",
        "left_title": "🎯 Mục tiêu học tập",
        "left_items": [
            "Nắm những nét khái quát về triết học và vấn đề cơ bản của triết học.",
            "Hiểu sự ra đời, các giai đoạn phát triển và thực chất cuộc cách mạng trong triết học do C. Mác và Ph. Ăngghen thực hiện.",
            "Nhận diện vai trò của triết học Mác - Lênin trong đời sống xã hội và thời đại ngày nay.",
            "Biết vận dụng thế giới quan và phương pháp luận duy vật biện chứng vào nhận thức, hoạt động thực tiễn."
        ],
        "right_title": "📚 Mạch Bài Giảng",
        "right_items": [
            "1. Triết học và vấn đề cơ bản của triết học",
            "2. Triết học Mác - Lênin và quá trình phát triển",
            "3. Vai trò của triết học Mác - Lênin trong đời sống xã hội"
        ]
    },
    # Slide 3
    {
        "category": "1. Triết học và vấn đề cơ bản",
        "title": "Sự ra đời của Triết học",
        "num": "03",
        "type": "cards_2",
        "c1_title": "🌟 Thời gian và Không gian",
        "c1_text": "Triết học xuất hiện gần như đồng thời ở phương Đông và phương Tây, khoảng thế kỷ VIII đến thế kỷ VI trước Công nguyên, gắn liền với các trung tâm văn minh lớn của nhân loại thời cổ đại.",
        "c2_title": "🧠 Nguồn gốc tư duy lý luận",
        "c2_text": "Triết học nảy sinh từ nhu cầu nhận thức và hoạt động thực tiễn của con người, khi con người bắt đầu khái quát những hiểu biết riêng lẻ thành các luận thuyết chung, có hệ thống."
    },
    # Slide 4
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Nguồn gốc nhận thức của Triết học",
        "num": "04",
        "type": "cards_3",
        "c1_title": "1. Kinh nghiệm ban đầu",
        "c1_text": "Hiểu biết cụ thể, riêng lẻ, mang tính cảm tính trực tiếp về các sự vật, hiện tượng trong đời sống.",
        "c2_title": "2. Tư duy khái quát",
        "c2_text": "Năng lực trừu tượng hóa, khái quát hóa, tìm ra mối liên hệ chung giữa các sự kiện rời rạc.",
        "c3_title": "3. Luận thuyết triết học",
        "c3_text": "Hệ thống khái niệm, phạm trù, quy luật giải thích toàn bộ thế giới một cách hệ thống."
    },
    # Slide 5
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Nguồn gốc xã hội của Triết học",
        "num": "05",
        "type": "split",
        "left_title": "🏛️ Điều kiện xã hội & Trí thức",
        "left_items": [
            "Sản xuất xã hội phát triển đến trình độ nhất định với phân công lao động xã hội.",
            "Xã hội xuất hiện giai cấp và nhà nước, phân chia lao động trí óc và lao động chân tay.",
            "Tầng lớp trí thức chuyên nghiệp xuất hiện, thúc đẩy năng lực hệ thống hóa tri thức."
        ],
        "right_title": "📜 Bản chất xã hội",
        "right_items": [
            "Các nhà thông thái đúc kết tri thức thành học thuyết và lý luận có hệ thống.",
            "Triết học luôn mang dấu ấn sâu sắc của thời đại và những lực lượng xã hội sản sinh ra nó.",
            "Phản ánh lợi ích và nhu cầu giải quyết các mâu thuẫn thời đại."
        ]
    },
    # Slide 6
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Khái niệm Triết học",
        "num": "06",
        "type": "cards_2",
        "c1_title": "💡 Định nghĩa chuẩn mực",
        "c1_text": "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới, về bản thân con người và vị trí của con người trong thế giới đó.",
        "c2_title": "⚙️ Các nội dung cốt lõi",
        "c2_text": "• Là một hình thái ý thức xã hội.\n• Khách thể: thế giới trong tính chỉnh thể toàn vẹn.\n• Mục đích: tìm quy luật phổ biến chi phối tự nhiên, xã hội, tư duy."
    },
    # Slide 7
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Đối tượng nghiên cứu của Triết học trong Lịch sử",
        "num": "07",
        "type": "split",
        "left_title": "⏳ Thời cổ đại (Triết học tự nhiên)",
        "left_items": [
            "Bao quát gần như toàn bộ tri thức nhân loại thời bấy giờ.",
            "Khoa học chuyên ngành chưa tách thành các lĩnh vực độc lập.",
            "Triết học được coi là 'khoa học của mọi khoa học'."
        ],
        "right_title": "🔬 Triết học hiện đại",
        "right_items": [
            "Đối tượng được xác định rõ ràng, khoa học hơn.",
            "Nghiên cứu những mối liên hệ phổ biến và quy luật chung nhất của tự nhiên, xã hội và tư duy.",
            "Phân định ranh giới rõ ràng với các khoa học cụ thể."
        ]
    },
    # Slide 8
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Triết học và Thế giới quan",
        "num": "08",
        "type": "cards_2",
        "c1_title": "🌍 Thế giới quan là gì?",
        "c1_text": "Hệ thống tri thức, quan điểm, tình cảm, niềm tin và lý tưởng xác định của con người về thế giới và vị trí của mình trong thế giới đó.",
        "c2_title": "⚓ Triết học - Hạt nhân lý luận",
        "c2_text": "Triết học chính là hạt nhân lý luận của thế giới quan, cung cấp hệ thống quan niệm nền tảng để định hướng nhận thức và hành động."
    },
    # Slide 9
    {
        "category": "1.1. Khái lược về triết học",
        "title": "Triết học - Hạt nhân lý luận của Thế giới quan",
        "num": "09",
        "type": "bullets",
        "items": [
            "Triết học là thế giới quan ở trình độ lý luận và tính khái quát cao nhất.",
            "Thế giới quan triết học định hướng cách con người nhìn nhận hiện thực, bản thân và các mối quan hệ xã hội.",
            "Thế giới quan duy vật biện chứng đòi hỏi xem xét sự vật trong mối liên hệ phổ biến, vận động và phát triển không ngừng.",
            "Bao gồm sự thống nhất hữu cơ giữa tri thức khoa học, niềm tin khoa học và lý tưởng cách mạng."
        ]
    },
    # Slide 10
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Vấn đề Cơ bản của Triết học",
        "num": "10",
        "type": "split",
        "left_title": "⚖️ Mối quan hệ giữa Vật chất và Ý thức",
        "left_items": [
            "Giữa tư duy và tồn tại, giữa cái vật chất và cái tinh thần.",
            "Đây là vấn đề nền tảng và là điểm xuất phát để giải quyết mọi vấn đề còn lại của triết học.",
            "Ph. Ăngghen: 'Vấn đề cơ bản lớn của mọi triết học là vấn đề quan hệ giữa tư duy với tồn tại'."
        ],
        "right_title": "🔍 Ví dụ thực tiễn",
        "right_items": [
            "Khi thiết bị di động hết pin, điều kiện vật chất thay đổi lập tức chi phối hoạt động nhận thức và tư duy của người dùng.",
            "Tồn tại quyết định tư duy trong mọi hoàn cảnh khách quan."
        ]
    },
    # Slide 11
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Hai Mặt của Vấn đề Cơ bản của Triết học",
        "num": "11",
        "type": "grid_2",
        "c1_title": "🏛️ Mặt thứ nhất (Bản thể luận)",
        "c1_text": "Vật chất hay ý thức có trước, cái nào sinh ra cái nào và cái nào quyết định cái nào?\n\nTrả lời câu hỏi này phân định rõ các trường phái triết học lớn: Chủ nghĩa duy vật và Chủ nghĩa duy tâm.",
        "c2_title": "👁️ Mặt thứ hai (Nhận thức luận)",
        "c2_text": "Con người có khả năng nhận thức được thế giới khách quan hay không?\n\nTrả lời câu hỏi này phân định Thuyết khả tri (có thể nhận thức) và Thuyết bất khả tri (không thể nhận thức bản chất)."
    },
    # Slide 12
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Chủ nghĩa Duy vật và Chủ nghĩa Duy tâm",
        "num": "12",
        "type": "grid_2",
        "c1_title": "🌍 Chủ nghĩa Duy vật",
        "c1_text": "Khẳng định rằng vật chất, giới tự nhiên có trước, ý thức có sau. Vật chất quyết định ý thức, ý thức chỉ là sự phản ánh thế giới khách quan vào bộ óc con người.",
        "c2_title": "☁️ Chủ nghĩa Duy tâm",
        "c2_text": "Khẳng định rằng ý thức, tinh thần có trước và quyết định giới tự nhiên. Sinh ra thế giới vật chất từ các thực thể tinh thần tuyệt đối hoặc cảm giác chủ quan."
    },
    # Slide 13
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Ba Hình thức Cơ bản của Chủ nghĩa Duy vật",
        "num": "13",
        "type": "grid_3",
        "c1_title": "🌱 1. Duy vật chất phác",
        "c1_text": "Đồng nhất vật chất với một hay một số chất cụ thể của tự nhiên (nước, lửa, đất...); còn trực quan, ngây thơ nhưng mang tính duy vật phát.",
        "c2_title": "⚙️ 2. Duy vật siêu hình",
        "c2_text": "Nhìn thế giới như một cỗ máy khổng lồ, các bộ phận tồn tại biệt lập và đứng im; không thấy tính biện chứng của sự phát triển.",
        "c3_title": "🔬 3. Duy vật biện chứng",
        "c3_text": "Do C. Mác và Ph. Ăngghen sáng lập, V.I. Lênin phát triển; khắc phục hạn chế siêu hình, thống nhất duy vật với phép biện chứng."
    },
    # Slide 14
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Các Dạng của Chủ nghĩa Duy tâm",
        "num": "14",
        "type": "grid_2",
        "c1_title": "👤 Chủ nghĩa Duy tâm chủ quan",
        "c1_text": "Thừa nhận tính thứ nhất của ý thức cá nhân, cảm giác của con người; phủ nhận sự tồn tại khách quan của hiện thực bên ngoài, coi sự vật là phức hợp cảm giác.",
        "c2_title": "🌐 Chủ nghĩa Duy tâm khách quan",
        "c2_text": "Thừa nhận tính thứ nhất của ý thức, nhưng coi đó là 'tinh thần khách quan', 'ý niệm tuyệt đối' có trước và tồn tại độc lập với con người (Platon, Hegel)."
    },
    # Slide 15
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Nhất nguyên luận và Nhị nguyên luận",
        "num": "15",
        "type": "grid_2",
        "c1_title": "⚛️ Nhất nguyên luận",
        "c1_text": "Chỉ thừa nhận một bản nguyên duy nhất của thế giới: hoặc là vật chất (chủ nghĩa duy vật) hoặc là tinh thần (chủ nghĩa duy tâm). Giải thích thế giới từ một gốc.",
        "c2_title": "⚖️ Nhị nguyên luận",
        "c2_text": "Thừa nhận cả vật chất và tinh thần là hai bản nguyên cùng tồn tại song song, ngang hàng nhau, cùng quyết định nguồn gốc và sự vận động của thế giới (Descartes)."
    },
    # Slide 16
    {
        "category": "1.2. Vấn đề cơ bản của triết học",
        "title": "Thuyết Khả tri và Thuyết Bất khả tri",
        "num": "16",
        "type": "grid_2",
        "c1_title": "🔬 Thuyết Khả tri (Gnosticism)",
        "c1_text": "Khẳng định về nguyên tắc con người hoàn toàn có khả năng nhận thức được bản chất của thế giới khách quan. Nhận thức của con người ngày càng phù hợp với hiện thực.",
        "c2_title": "❓ Thuyết Bất khả tri (Agnosticism)",
        "c2_text": "Phủ nhận khả năng nhận thức bản chất của đối tượng; cho rằng con người chỉ nắm được hiện tượng bên ngoài, hữu hạn, không thể vươn tới bản chất cùng đích."
    },
    # Slide 17
    {
        "category": "1.3. Biện chứng và siêu hình",
        "title": "Phương pháp Siêu hình",
        "num": "17",
        "type": "bullets",
        "items": [
            "Nhận thức sự vật trong trạng thái cô lập, tách rời các mối liên hệ phổ biến và tuyệt đối hóa ranh giới giữa các sự vật.",
            "Nhấn mạnh trạng thái tĩnh tại của đối tượng; nếu có biến đổi thì chỉ là sự tăng giảm thuần túy về lượng, chưa thấy nhảy vọt về chất.",
            "Nguyên nhân của mọi sự biến đổi thường bị đẩy ra bên ngoài sự vật (do lực lượng siêu tự nhiên hoặc tác động bên ngoài).",
            "Có giá trị trong phạm vi cơ học cổ điển, nhưng tỏ ra bất lực khi giải quyết các hệ thống vận động phức tạp, phát triển."
        ]
    },
    # Slide 18
    {
        "category": "1.3. Biện chứng và siêu hình",
        "title": "Phương pháp Biện chứng",
        "num": "18",
        "type": "grid_3",
        "c1_title": "🔗 Mối liên hệ",
        "c1_text": "Các sự vật, hiện tượng luôn tác động qua lại, ràng buộc, quy định và chuyển hóa lẫn nhau trong một chỉnh thể.",
        "c2_title": "🌊 Vận động & Phát triển",
        "c2_text": "Sự vật không ngừng biến đổi, phát triển từ thấp đến cao, từ đơn giản đến phức tạp thông qua đấu tranh giữa các mặt đối lập.",
        "c3_title": "🎯 Bản chất phương pháp",
        "c3_text": "Phản ánh đúng hiện thực khách quan đúng như nó vốn có, là công cụ vĩ đại để nhận thức và cải tạo thế giới."
    },
    # Slide 19
    {
        "category": "1.3. Biện chứng và siêu hình",
        "title": "Ba Hình thức Lịch sử của Phép Biện chứng",
        "num": "19",
        "type": "grid_3",
        "c1_title": "🏛️ 1. Biện chứng tự phát",
        "c1_text": "Thời cổ đại (Hy Lạp, Trung Hoa, Ấn Độ): Thấy thế giới vận động, sinh thành trực quan nhưng chưa có cơ sở khoa học chứng minh.",
        "c2_title": "💭 2. Biện chứng duy tâm",
        "c2_text": "Đạt đỉnh cao trong triết học cổ điển Đức (Kant, Hegel): Biện chứng của ý niệm tuyệt đối, bắt đầu và kết thúc ở tinh thần.",
        "c3_title": "⚒️ 3. Biện chứng duy vật",
        "c3_text": "C. Mác và Ph. Ăngghen kế thừa hạt nhân hợp lý, thống nhất hữu cơ phép biện chứng với chủ nghĩa duy vật."
    },
    # Slide 20
    {
        "category": "2.1. Sự ra đời và phát triển",
        "title": "Điều kiện Kinh tế - Xã hội của Sự ra đời Triết học Mác",
        "num": "20",
        "type": "split",
        "left_title": "🏭 Sự phát triển phương thức sản xuất TBCN",
        "left_items": [
            "Cách mạng công nghiệp phát triển mạnh mẽ, lực lượng sản xuất mang tính xã hội hóa cao.",
            "Mâu thuẫn cơ bản của chủ nghĩa tư bản lộ rõ giữa lực lượng sản xuất xã hội hóa và quan hệ sản xuất tư nhân tư bản chủ nghĩa.",
            "Khủng hoảng kinh tế chu kỳ xuất hiện thường xuyên hơn."
        ],
        "right_title": "✊ Phong trào đấu tranh giai cấp",
        "right_items": [
            "Giai cấp vô sản ra đời và lớn mạnh, trở thành lực lượng chính trị độc lập.",
            "Các cuộc khởi nghĩa lớn (Lyons, Xilêsi, Chartist) chứng minh giai cấp vô sản cần một vũ khí lý luận sắc bén để giải phóng.",
            "Thực tiễn cách mạng là cơ sở trực tiếp và quan trọng nhất."
        ]
    },
    # Slide 21
    {
        "category": "2.1. Sự ra đời và phát triển",
        "title": "Nguồn gốc Lý luận của Triết học Mác",
        "num": "21",
        "type": "grid_3",
        "c1_title": "🧠 Triết học cổ điển Đức",
        "c1_text": "Kế thừa phép biện chứng của Hegel (hạt nhân hợp lý) và chủ nghĩa duy vật nhân bản của Feuerbach để xây dựng chủ nghĩa duy vật biện chứng.",
        "c2_title": "💷 KTCT cổ điển Anh",
        "c2_text": "Kế thừa học thuyết giá trị thặng dư của Adam Smith và David Ricardo làm cơ sở kinh tế cho quan điểm duy vật lịch sử.",
        "c3_title": "🚩 CNXH không tưởng Pháp",
        "c3_text": "Kế thừa tư tưởng phê phán xã hội tư bản của Saint-Simon và Fourier để phát triển thành chủ nghĩa xã hội khoa học."
    },
    # Slide 22
    {
        "category": "2.1. Sự ra đời và phát triển",
        "title": "Tiền đề Khoa học Tự nhiên",
        "num": "22",
        "type": "grid_3",
        "c1_title": "⚡ Định luật bảo toàn năng lượng",
        "c1_text": "Chừng minh sự chuyển hóa lẫn nhau giữa các dạng vận động khác nhau của thế giới vật chất, bác bỏ quan điểm siêu hình rời rạc.",
        "c2_title": "🧬 Thuyết tế bào",
        "c2_text": "Khẳng định tính thống nhất về mặt cấu tạo sinh học của toàn bộ thế giới thực vật và động vật.",
        "c3_title": "🐒 Thuyết tiến hóa của Darwin",
        "c3_text": "Làm rõ tính lịch sử, sự phát triển từ thấp đến cao của thế giới hữu cơ, bác bỏ quan điểm sáng thế luận."
    },
    # Slide 23
    {
        "category": "2.1. Sự ra đời và phát triển",
        "title": "Nhân tố Chủ quan: C. Mác và Ph. Ăngghen",
        "num": "23",
        "type": "bullets",
        "items": [
            "Đội ngũ thiên tài với năng lực tư duy lý luận uyên bác, ý chí cách mạng sắt đá và tầm nhìn thời đại.",
            "Sớm gắn hoạt động lý luận khoa học với thực tiễn đấu tranh của phong trào công nhân quốc tế.",
            "Chuyển dứt khoát từ lập trường dân chủ cách mạng sang lập trường giai cấp công nhân và chủ nghĩa cộng sản.",
            "Sự kết hợp vĩ đại giữa tình bạn chiến đấu và trí tuệ kiệt xuất tạo nên bước ngoặt lịch sử nhân loại."
        ]
    },
    # Slide 24
    {
        "category": "2.2. Các thời kỳ chủ yếu",
        "title": "Giai đoạn Hình thành Tư tưởng Triết học (1841 - 1844)",
        "num": "24",
        "type": "grid_4",
        "c1_title": "🎓 1841",
        "c1_text": "Mác nhận bằng tiến sĩ triết học, nghiên cứu sâu sắc triết học Hegel và Feuerbach.",
        "c2_title": "✍️ 1842",
        "c2_text": "Làm biên tập viên Báo Sông Ranh, gắn tư tưởng dân chủ với lợi ích quần chúng lao động.",
        "c3_title": "⚖️ 1843",
        "c3_text": "Phê phán triết học pháp quyền của Hegel, chuyển dần sang lập trường duy vật.",
        "c4_title": "🚩 1844",
        "c4_text": "Tại Paris, chính thức chuyển hẳn sang chủ nghĩa duy vật và chủ nghĩa cộng sản."
    },
    # Slide 25
    {
        "category": "2.2. Các thời kỳ chủ yếu",
        "title": "Giai đoạn Đề xuất các Nguyên lý Nền tảng (1844 - 1848)",
        "num": "25",
        "type": "grid_2",
        "c1_title": "📜 Các tác phẩm kinh điển",
        "c1_text": "• Bản thảo kinh tế - triết học (1844): Phân tích lao động tha hóa.\n• Luận cương về Feuerbach (1845): Vai trò của thực tiễn.\n• Hệ tư tưởng Đức (1845-1846): Đặt nền móng duy vật lịch sử.",
        "c2_title": "🚩 Tuyên ngôn của Đảng Cộng sản",
        "c2_text": "Đánh dấu sự chín muồi hoàn toàn của chủ nghĩa Mác, trình bày thế giới quan mới, sự thống nhất hữu cơ giữa triết học, kinh tế chính trị và chủ nghĩa xã hội khoa học."
    },
    # Slide 26
    {
        "category": "2.2. Các thời kỳ chủ yếu",
        "title": "Giai đoạn Phát triển Toàn diện (1848 - 1895)",
        "num": "26",
        "type": "bullets",
        "items": [
            "Tiếp tục tổng kết thực tiễn phong trào cách mạng và sự phát triển khoa học tự nhiên.",
            "Hoàn thành bộ 'Tư bản' - kiệt tác kinh tế chính trị học và là kho tàng triết học sâu sắc.",
            "Ph. Ăngghen viết các tác phẩm vĩ đại: 'Biện chứng của tự nhiên', 'Chống Đuyrinh', 'Nguồn gốc của gia đình...' để bảo vệ và truyền bá học thuyết.",
            "Lãnh đạo phong trào công nhân quốc tế qua các Quốc tế I và II."
        ]
    },
    # Slide 27
    {
        "category": "2.3. Ý nghĩa cuộc cách mạng",
        "title": "Thực chất Cuộc Cách mạng trong Triết học",
        "num": "27",
        "type": "grid_3",
        "c1_title": "🌍 Khắc phục duy vật cũ",
        "c1_text": "Vượt qua tính chất trực quan, máy móc, siêu hình của chủ nghĩa duy vật trước Mác, gắn liền với thực tiễn xã hội.",
        "c2_title": "✨ Khắc phục duy tâm",
        "c2_text": "Giải phóng phép biện chứng khỏi lớp vỏ thần bí, duy tâm của triết học Hegel, đưa phép biện chứng đứng trên nền tảng duy vật.",
        "c3_title": "🛠️ Thống nhất lý luận - thực tiễn",
        "c3_text": "Tuyên bố sứ mệnh lịch sử của triết học không chỉ là giải thích thế giới mà còn là cải tạo thế giới."
    },
    # Slide 28
    {
        "category": "2.3. Ý nghĩa cuộc cách mạng",
        "title": "Sáng tạo ra Chủ nghĩa Duy vật Lịch sử",
        "num": "28",
        "type": "split",
        "left_title": "📜 Bước ngoặt vĩ đại",
        "left_items": [
            "Vận dụng chủ nghĩa duy vật biện chứng vào việc nghiên cứu đời sống xã hội và lịch sử loài người.",
            "Khẳng định sản xuất vật chất là nền tảng của đời sống xã hội.",
            "Xác định quần chúng nhân dân là chủ thể chân chính sáng tạo ra lịch sử."
        ],
        "right_title": "⚙️ Ý nghĩa phương pháp luận",
        "right_items": [
            "Giúp giải thích các hiện tượng xã hội từ cơ sở kinh tế - vật chất thay vì ý muốn chủ quan.",
            "Cung cấp phương pháp luận khoa học để phân tích các hình thái kinh tế - xã hội."
        ]
    },
    # Slide 29
    {
        "category": "2.4. Giai đoạn Lênin",
        "title": "Hoàn cảnh Lịch sử V.I. Lênin Phát triển Triết học Mác",
        "num": "29",
        "type": "bullets",
        "items": [
            "Chủ nghĩa tư bản chuyển sang giai đoạn đế quốc chủ nghĩa, trung tâm cách mạng thế giới chuyển dịch sang nước Nga.",
            "Những phát minh vĩ đại của vật lý học cuối thế kỷ XIX đầu thế kỷ XX làm đảo lộn quan niệm siêu hình cũ về vật chất.",
            "Các trào lưu duy tâm, xét lại và cơ hội tấn công mãnh liệt vào nền tảng triết học Mác.",
            "Đặt ra yêu cầu cấp thiết phải bảo vệ, bổ sung và phát triển toàn diện chủ nghĩa Mác trong thời đại mới."
        ]
    },
    # Slide 30
    {
        "category": "2.4. Giai đoạn Lênin",
        "title": "Đóng góp Toàn diện của V.I. Lênin (1893 - 1917)",
        "num": "30",
        "type": "grid_3",
        "c1_title": "🛡️ Bảo vệ chủ nghĩa duy vật",
        "c1_text": "Tác phẩm 'Chủ nghĩa duy vật và chủ nghĩa kinh nghiệm phê phán' (1908) định nghĩa kinh điển về vật chất và bảo vệ nền tảng triết học.",
        "c2_title": "🌊 Phát triển phép biện chứng",
        "c2_text": "Tác phẩm 'Bút ký triết học' (1914-1916) làm sâu sắc thêm bản chất của phép biện chứng, thống nhất phép biện chứng, logic và nhận thức luận.",
        "c3_title": "🚩 Phân tích chủ nghĩa đế quốc",
        "c3_text": "Làm rõ bản chất tột cùng của chủ nghĩa tư bản và quy luật phát triển không đều trong thời đại mới."
    },
    # Slide 31
    {
        "category": "2.4. Giai đoạn Lênin",
        "title": "Giai đoạn 1917 - 1924 và từ 1924 đến nay",
        "num": "31",
        "type": "grid_2",
        "c1_title": "🇷🇺 Giai đoạn 1917 - 1924",
        "c1_text": "• Tổng kết sâu sắc kinh nghiệm Cách mạng Tháng Mười.\n• Phát triển lý luận về xây dựng chủ nghĩa xã hội, nhà nước chuyên chính vô sản.\n• Vai trò lãnh đạo của Đảng Cộng sản.",
        "c2_title": "🌐 Từ 1924 đến nay",
        "c2_text": "• Các đảng cộng sản và nhà nước xã hội chủ nghĩa tiếp tục bổ sung, phát triển.\n• Gắn lý luận với thực tiễn xây dựng xã hội mới và thời đại công nghệ số."
    },
    # Slide 32
    {
        "category": "2.4. Giai đoạn Lênin",
        "title": "Sự Vận dụng và Phát triển ở Việt Nam",
        "num": "32",
        "type": "bullets",
        "items": [
            "Chủ tịch Hồ Chí Minh và Đảng ta vận dụng sáng tạo chủ nghĩa Mác - Lênin vào điều kiện cụ thể của cách mạng Việt Nam.",
            "Tư duy biện chứng thể hiện rõ trong đường lối chiến tranh nhân dân, kết hợp dân tộc với chủ nghĩa xã hội.",
            "Trong thời kỳ đổi mới, tư duy lý luận tiếp tục được phát triển qua thực tiễn xây dựng nền kinh tế thị trường định hướng XHCN.",
            "Kiên định nền tảng tư tưởng, đồng thời chống giáo điều, bảo thủ, chủ quan, duy ý chí."
        ]
    },
    # Slide 33
    {
        "category": "2.5. Đối tượng và chức năng",
        "title": "Triết học và các Khoa học Cụ thể",
        "num": "33",
        "type": "split",
        "left_title": "🔬 Khoa học cụ thể",
        "left_items": [
            "Nghiên cứu những quy luật trong từng lĩnh vực riêng biệt của thế giới (toán, vật lý, sinh học, kinh tế...).",
            "Cung cấp tri thức chuyên ngành cụ thể.",
            "Cơ sở thực tiễn phong phú cho khái quát triết học."
        ],
        "right_title": "🏛️ Triết học Mác - Lênin",
        "right_items": [
            "Nghiên cứu những quy luật chung nhất của tự nhiên, xã hội và tư duy.",
            "Cung cấp thế giới quan và phương pháp luận chung.",
            "Mối quan hệ giữa triết học và khoa học cụ thể là quan hệ giữa cái chung và cái riêng."
        ]
    },
    # Slide 34
    {
        "category": "2.5. Đối tượng và chức năng",
        "title": "Khái niệm Triết học Mác - Lênin",
        "num": "34",
        "type": "cards_2",
        "c1_title": "📖 Định nghĩa chuẩn",
        "c1_text": "Triết học Mác - Lênin là hệ thống quan điểm duy vật biện chứng về tự nhiên, xã hội và tư duy; là thế giới quan và phương pháp luận khoa học, cách mạng trong nhận thức và cải tạo thế giới.",
        "c2_title": "⚙️ Bản chất thống nhất",
        "c2_text": "• Thống nhất giữa chủ nghĩa duy vật và phép biện chứng.\n• Thống nhất giữa duy vật biện chứng và duy vật lịch sử.\n• Thống nhất giữa tính khoa học và tính cách mạng."
    },
    # Slide 35
    {
        "category": "2.5. Đối tượng và chức năng",
        "title": "Đối tượng của Triết học Mác - Lênin",
        "num": "35",
        "type": "bullets",
        "items": [
            "Giải quyết mối quan hệ giữa vật chất và ý thức trên lập trường duy vật biện chứng.",
            "Nghiên cứu những quy luật vận động, phát triển chung nhất của tự nhiên, xã hội và tư duy loài người.",
            "Phân định rõ ràng đối tượng của triết học với các khoa học cụ thể theo nguyên tắc cái chung - cái riêng.",
            "Cung cấp lăng kính khoa học để khái quát tri thức từ các lĩnh vực chuyên ngành."
        ]
    },
    # Slide 36
    {
        "category": "2.5. Đối tượng và chức năng",
        "title": "Chức năng Thế giới quan Duy vật Biện chứng",
        "num": "36",
        "type": "grid_3",
        "c1_title": "👁️ Nhận thức đúng hiện thực",
        "c1_text": "Cung cấp hệ thống quan điểm khoa học để nhìn nhận thế giới đúng như nó vốn có, tránh các quan điểm mù quáng, duy tâm.",
        "c2_title": "🧭 Định hướng hành động",
        "c2_text": "Giúp con người xác định thái độ sống tích cực, lập trường kiên định và phương hướng hành động đúng đắn.",
        "c3_title": "⚔️ Đấu tranh tư tưởng",
        "c3_text": "Là vũ khí lý luận sắc bén để phê phán các quan điểm phản khoa học, duy tâm, tôn giáo cực đoan."
    },
    # Slide 37
    {
        "category": "2.5. Đối tượng và chức năng",
        "title": "Chức năng Phương pháp luận Duy vật Biện chứng",
        "num": "37",
        "type": "bullets",
        "items": [
            "Trang bị hệ thống các nguyên tắc phương pháp luận chung nhất cho nhận thức và hoạt động thực tiễn.",
            "Cung cấp các công cụ sắc bén (các nguyên lý, quy luật, phạm trù) để phân tích và giải quyết vấn đề.",
            "Giúp tránh bệnh chủ quan, duy ý chí, phương pháp tư duy siêu hình, cứng nhắc.",
            "Lưu ý: Phương pháp luận triết học không phải là 'đơn thuốc vạn năng', cần kết hợp chặt chẽ với tri thức chuyên ngành."
        ]
    },
    # Slide 38
    {
        "category": "3. Vai trò trong đời sống xã hội",
        "title": "Vai trò trong Nhận thức và Hoạt động Thực tiễn",
        "num": "38",
        "type": "grid_3",
        "c1_title": "🎯 Xác định điểm xuất phát",
        "c1_text": "Giúp chủ thể đứng trên lập trường khoa học vững chắc, không mò mẫm hay dựa vào cảm tính.",
        "c2_title": "📈 Thấy rõ phương hướng",
        "c2_text": "Nhận ra xu hướng vận động, các mối liên hệ nhân quả và triển vọng phát triển của sự vật.",
        "c3_title": "🛠️ Gắn lý luận với thực tiễn",
        "c3_text": "Đưa các nguyên lý chung vào giải quyết các bài toán cụ thể của đời sống xã hội."
    },
    # Slide 39
    {
        "category": "3. Vai trò trong đời sống xã hội",
        "title": "Vai trò trong Sự nghiệp Đổi mới ở Việt Nam",
        "num": "39",
        "type": "bullets",
        "items": [
            "Xuất phát từ lập trường duy vật biện chứng để đánh giá đúng đắn thực trạng và điều kiện khách quan của đất nước.",
            "Kết hợp nhuần nhuyễn giữa đổi mới kinh tế với đổi mới chính trị, phát huy tối đa nội lực và hội nhập quốc tế.",
            "Thường xuyên tổng kết thực tiễn đổi mới để không ngừng bổ sung, phát triển tư duy lý luận của Đảng.",
            "Kiên định nền tảng tư tưởng Mác - Lênin, đồng thời kiên quyết khắc phục bệnh giáo điều, chủ quan, duy ý chí."
        ]
    },
    # Slide 40
    {
        "category": "Ôn tập",
        "title": "Tổng kết Chương 1: Triết học Mác - Lênin",
        "num": "40",
        "type": "bullets",
        "items": [
            "Triết học ra đời từ nguồn gốc nhận thức và xã hội, là hạt nhân lý luận của thế giới quan.",
            "Vấn đề cơ bản của triết học giải quyết quan hệ giữa vật chất và ý thức, khả năng nhận thức thế giới.",
            "Triết học Mác - Lênin là sự thống nhất hữu cơ giữa chủ nghĩa duy vật và phép biện chứng.",
            "Lênin bảo vệ và phát triển toàn diện chủ nghĩa Mác trong thời đại mới.",
            "Hai chức năng cốt lõi: Thế giới quan duy vật biện chứng và phương pháp luận duy vật biện chứng."
        ]
    }
]

for s in slides_data:
    html_content += f'''
        <!-- SLIDE {s["num"]} -->
        <div class="slide {'active' if s['num'] == '01' else ''}" data-slide="{s['num']}">
            <div class="slide-header">
                <div>
                    <span class="slide-category">{s["category"]}</span>
                    <h2 class="slide-title-text">{s["title"]}</h2>
                </div>
                <div class="slide-badge-num">{s["num"]}</div>
            </div>
            <div class="slide-content-area">
'''
    if s["type"] == "title":
        html_content += f'''
                <div class="title-slide-container">
                    <div class="title-badge">{s["category"]}</div>
                    <h1 class="title-main gold-text">{s["title"].replace("CHƯƠNG 1: ", "")}</h1>
                    <p class="title-sub">{s["subtitle"]}</p>
                </div>
'''
    elif s["type"] == "split":
        html_content += f'''
                <div class="grid-2col">
                    <div class="acad-card">
                        <h3>{s["left_title"]}</h3>
                        <ul class="bullet-list">
'''
        for item in s["left_items"]:
            html_content += f'                            <li>{item}</li>\n'
        html_content += f'''
                        </ul>
                    </div>
                    <div class="acad-card">
                        <h3>{s["right_title"]}</h3>
                        <ul class="bullet-list">
'''
        for item in s["right_items"]:
            html_content += f'                            <li>{item}</li>\n'
        html_content += f'''
                        </ul>
                    </div>
                </div>
'''
    elif s["type"] == "cards_2":
        html_content += f'''
                <div class="grid-2col">
                    <div class="acad-card">
                        <h3>{s["c1_title"]}</h3>
                        <p>{s["c1_text"].replace(chr(10), "<br>")}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c2_title"]}</h3>
                        <p>{s["c2_text"].replace(chr(10), "<br>")}</p>
                    </div>
                </div>
'''
    elif s["type"] == "cards_3":
        html_content += f'''
                <div class="grid-3col">
                    <div class="acad-card">
                        <h3>{s["c1_title"]}</h3>
                        <p>{s["c1_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c2_title"]}</h3>
                        <p>{s["c2_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c3_title"]}</h3>
                        <p>{s["c3_text"]}</p>
                    </div>
                </div>
'''
    elif s["type"] == "grid_2":
        html_content += f'''
                <div class="grid-2col">
                    <div class="acad-card">
                        <h3>{s["c1_title"]}</h3>
                        <p>{s["c1_text"].replace(chr(10), "<br>")}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c2_title"]}</h3>
                        <p>{s["c2_text"].replace(chr(10), "<br>")}</p>
                    </div>
                </div>
'''
    elif s["type"] == "grid_3":
        html_content += f'''
                <div class="grid-3col">
                    <div class="acad-card">
                        <h3>{s["c1_title"]}</h3>
                        <p>{s["c1_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c2_title"]}</h3>
                        <p>{s["c2_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c3_title"]}</h3>
                        <p>{s["c3_text"]}</p>
                    </div>
                </div>
'''
    elif s["type"] == "grid_4":
        html_content += f'''
                <div class="grid-4col">
                    <div class="acad-card">
                        <h3>{s["c1_title"]}</h3>
                        <p>{s["c1_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c2_title"]}</h3>
                        <p>{s["c2_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c3_title"]}</h3>
                        <p>{s["c3_text"]}</p>
                    </div>
                    <div class="acad-card">
                        <h3>{s["c4_title"]}</h3>
                        <p>{s["c4_text"]}</p>
                    </div>
                </div>
'''
    elif s["type"] == "bullets":
        html_content += f'''
                <div class="acad-card" style="padding: 40px 50px;">
                    <ul class="bullet-list">
'''
        for item in s["items"]:
            html_content += f'                        <li>{item}</li>\n'
        html_content += f'''
                    </ul>
                </div>
'''

    html_content += f'''
            </div>
            <div class="slide-footer">
                <span>Triết học Mác - Lênin | Học viện / Đại học</span>
                <span>Slide {s["num"]} / 40</span>
            </div>
        </div>
'''

html_content += r'''
        </div>
    </div>

    <div class="deck-nav">
        <button class="nav-btn" id="prevBtn">‹ Trước</button>
        <button class="nav-btn" id="nextBtn">Tiếp ›</button>
    </div>

    <script>
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        let currentIndex = 0;
        const progressBar = document.getElementById('progressBar');
        const editBanner = document.getElementById('editBanner');

        function updateStageScale() {
            const stage = document.getElementById('presentationStage');
            const w = window.innerWidth;
            const h = window.innerHeight;
            const scale = Math.min(w / 1920, h / 1080);
            stage.style.transform = `scale(${scale}) translate(-50%, -50%)`;
            stage.style.left = '50%';
            stage.style.top = '50%';
            stage.style.position = 'absolute';
        }

        window.addEventListener('resize', updateStageScale);
        updateStageScale();

        function showSlide(index) {
            if (index < 0) index = 0;
            if (index >= totalSlides) index = totalSlides - 1;
            currentIndex = index;

            slides.forEach((slide, idx) => {
                if (idx === currentIndex) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            const progress = ((currentIndex + 1) / totalSlides) * 100;
            progressBar.style.width = `${progress}%`;
        }

        document.getElementById('nextBtn').addEventListener('click', () => showSlide(currentIndex + 1));
        document.getElementById('prevBtn').addEventListener('click', () => showSlide(currentIndex - 1));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                showSlide(currentIndex + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                showSlide(currentIndex - 1);
            }
        });

        // Inline Editing Support (Press E or hover top-left)
        let isEditing = false;
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'e' || e.key === 'E') && !isEditing && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                isEditing = true;
                document.querySelectorAll('.slide-title-text, .acad-card p, .acad-card h3, .bullet-list li').forEach(el => {
                    el.setAttribute('contenteditable', 'true');
                    el.style.outline = '1px dashed #C5A059';
                });
                editBanner.style.display = 'block';
                e.preventDefault();
            }
            if (e.ctrlKey && e.key === 's' && isEditing) {
                e.preventDefault();
                isEditing = false;
                document.querySelectorAll('[contenteditable]').forEach(el => {
                    el.removeAttribute('contenteditable');
                    el.style.outline = 'none';
                });
                editBanner.style.background = '#34D399';
                editBanner.textContent = 'Đã lưu thay đổi thành công!';
                setTimeout(() => {
                    editBanner.style.display = 'none';
                    editBanner.style.background = '#C5A059';
                    editBanner.textContent = 'CHẾ ĐỘ CHỈNH SỬA BẬT (Nhấn Ctrl+S để lưu)';
                }, 2000);
            }
        });

        showSlide(0);
    </script>
</body>
</html>
'''

output_path = r'c:\Users\OS\Downloads\project\my-presentation\triet_hoc_mac_lenin.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'Successfully generated presentation at {output_path}')
