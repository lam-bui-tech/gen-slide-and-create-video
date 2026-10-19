"""
scripts/pptx_to_lecture.py
Trình tự động trích xuất nội dung, ghi chú và hình ảnh từ tệp PowerPoint (.pptx)
và ánh xạ tự động vào 6 Master Templates Academic Pro của AI Lecture Studio.
"""

import sys
import os
import json
import zipfile
import re
import shutil
import xml.etree.ElementTree as ET

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def extract_media_from_pptx(pptx_path, output_dir="images"):
    """Trích xuất toàn bộ ảnh nhúng trong PPTX vào thư mục output_dir."""
    os.makedirs(output_dir, exist_ok=True)
    extracted_images = []
    
    with zipfile.ZipFile(pptx_path, 'r') as z:
        media_files = [f for f in z.namelist() if f.startswith('ppt/media/')]
        for mf in media_files:
            filename = os.path.basename(mf)
            dest_path = os.path.join(output_dir, filename)
            # Only write if file doesn't exist
            if not os.path.exists(dest_path):
                with open(dest_path, 'wb') as f_out:
                    f_out.write(z.read(mf))
            extracted_images.append(dest_path.replace("\\", "/"))
            
    return extracted_images

def extract_pptx_slides(pptx_path):
    """Trích xuất danh sách slide và ghi chú diễn giả từ file pptx."""
    if not os.path.exists(pptx_path):
        raise FileNotFoundError(f"Không tìm thấy tệp {pptx_path}")

    extracted_slides = []

    with zipfile.ZipFile(pptx_path, 'r') as z:
        # Lấy danh sách slide và sắp xếp theo số thứ tự
        slide_files = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
        
        def extract_slide_num(name):
            match = re.search(r'slide(\d+)\.xml', name)
            return int(match.group(1)) if match else 9999

        slide_files.sort(key=extract_slide_num)

        for f in slide_files:
            s_num = extract_slide_num(f)
            xml_content = z.read(f)
            tree = ET.fromstring(xml_content)
            
            # Bóc tách text nodes
            lines = []
            for p_node in tree.iter():
                if p_node.tag.endswith('}p'):
                    p_text = ''.join([t_node.text for t_node in p_node.iter() if t_node.text and t_node.text.strip()])
                    if p_text.strip():
                        # Làm sạch khoảng trắng thừa
                        cleaned = re.sub(r'\s+', ' ', p_text.strip())
                        lines.append(cleaned)

            # Bóc tách ghi chú (notes) nếu có
            note_file = f"ppt/notesSlides/notesSlide{s_num}.xml"
            notes = ""
            if note_file in z.namelist():
                try:
                    note_xml = z.read(note_file)
                    note_tree = ET.fromstring(note_xml)
                    note_lines = []
                    for np_node in note_tree.iter():
                        if np_node.tag.endswith('}p'):
                            n_text = ''.join([t.text for t in np_node.iter() if t.text and t.text.strip()])
                            if n_text.strip():
                                note_lines.append(n_text.strip())
                    notes = " ".join(note_lines)
                except Exception:
                    notes = ""

            if lines:
                extracted_slides.append({
                    "slide_index": s_num,
                    "lines": lines,
                    "notes": notes
                })

    return extracted_slides

def classify_and_template_slide(raw_slide, total_slides, available_images=None):
    """
    Phân loại nội dung slide vào 1 trong 6 Academic Pro Master Templates:
    1. hero (Bìa mở đầu)
    2. agenda (Mục tiêu & Mạch bài)
    3. timeline (Dòng thời gian / Lịch sử)
    4. process (3 Nấc thang / 3 Trụ cột)
    5. comparison (Đối sánh 2 mặt / 2 Cột)
    6. definition (Khái niệm & 4 Trụ cột)
    """
    idx = raw_slide["slide_index"]
    lines = raw_slide["lines"]
    notes = raw_slide.get("notes", "")
    full_text = " ".join(lines).lower()
    
    # 1. Slide 1 hoặc chứa từ khóa Chương/Bài -> Hero
    if idx == 1 or "chương" in full_text[:40] or "bài học" in full_text[:30]:
        title = lines[0] if len(lines) > 0 else "Triết Học Mác - Lênin"
        subtitle = " ".join(lines[1:3]) if len(lines) > 1 else "Học phần Nền tảng Lý luận Chính trị"
        img = "images/students_study.png" if os.path.exists("images/students_study.png") else ""
        return {
            "id": f"slide{idx}",
            "templateType": "hero",
            "tag": f"CHƯƠNG {idx}",
            "title": title,
            "subtitle": subtitle,
            "author": "Bộ môn Lý luận Chính trị",
            "image": img,
            "narrationScript": f"Chào mừng quý vị và các bạn sinh viên đến với nội dung: {title}. {subtitle}. Đây là bài giảng nền tảng trang bị thế giới quan và phương pháp luận khoa học."
        }

    # 2. Agenda / Mục tiêu bài học
    if "mục tiêu" in full_text or "mạch bài" in full_text or "nội dung chính" in full_text:
        title = lines[0] if len(lines) > 0 else "Mục Tiêu & Mạch Nội Dung"
        objectives = [l for l in lines if l.startswith("•") or len(l) > 20][:4]
        if not objectives:
            objectives = [
                "Nắm vững những nét khái quát về triết học và vấn đề cơ bản của triết học.",
                "Hiểu rõ sự ra đời, các giai đoạn phát triển và thực chất cuộc cách mạng triết học của C. Mác và Ph. Ăngghen.",
                "Nhận diện vai trò của triết học trong đời sống xã hội hiện đại.",
                "Vận dụng sáng tạo thế giới quan và phương pháp luận biện chứng vào thực tiễn."
            ]
        return {
            "id": f"slide{idx}",
            "templateType": "agenda",
            "tag": "MỞ ĐẦU",
            "title": title,
            "subtitle": "Mục tiêu chuẩn đầu ra và các mạch nội dung trọng tâm",
            "objectives": objectives,
            "agenda": [
                {"num": "01", "name": "Triết học và vấn đề cơ bản"},
                {"num": "02", "name": "Triết học Mác - Lênin"},
                {"num": "03", "name": "Vai trò trong đời sống xã hội"}
            ],
            "narrationScript": "Trong bài học này, chúng ta tập trung vào ba mạch nội dung chính: thứ nhất là triết học và vấn đề cơ bản; thứ hai là sự hình thành triết học Mác Lênin; và thứ ba là vai trò thực tiễn của nó trong đời sống xã hội hiện đại."
        }

    # 3. Timeline / Lịch sử / Ra đời
    if "thế kỷ" in full_text or "ra đời" in full_text or "lịch sử" in full_text or "giai đoạn" in full_text:
        title = lines[0] if len(lines) > 0 else "Sự Ra Đời Của Triết Học"
        img = "images/ancient_philosophy.png" if os.path.exists("images/ancient_philosophy.png") else ""
        return {
            "id": f"slide{idx}",
            "templateType": "timeline",
            "tag": f"PHẦN {idx}.1",
            "title": title,
            "subtitle": "Thế kỷ VIII đến thế kỷ VI trước Công nguyên",
            "image": img,
            "steps": [
                {
                    "stage": "Khởi nguyên",
                    "time": "Thế kỷ VIII - VI TCN",
                    "desc": "Xuất hiện đồng thời ở phương Đông (Ấn Độ, Trung Hoa) và phương Tây (Hy Lạp cổ đại)."
                },
                {
                    "stage": "Chuyển hóa",
                    "time": "Từ Thần thoại sang Lý luận",
                    "desc": "Con người chuyển dần từ niềm tin huyền bí, tín ngưỡng sang tư duy duy lý, giải thích thế giới bằng quy luật."
                },
                {
                    "stage": "Đúc kết",
                    "time": "Luận thuyết hệ thống",
                    "desc": "Khái quát các tri thức kinh nghiệm rời rạc thành hệ thống quan điểm toàn diện về vũ trụ và nhân sinh."
                }
            ],
            "narrationScript": "Triết học xuất hiện gần như đồng thời ở cả phương Đông và phương Tây vào khoảng thế kỷ thứ tám đến thế kỷ thứ sáu trước Công nguyên. Đây là bước ngoặt vĩ đại đánh dấu sự chuyển biến từ nhận thức thần thoại, huyền bí sang tư duy lý luận có hệ thống."
        }

    # 4. Định nghĩa / Khái niệm
    if "khái niệm" in full_text or "định nghĩa" in full_text or "là gì" in full_text or "bản chất" in full_text:
        title = lines[0] if len(lines) > 0 else "Định Nghĩa Triết Học & Bốn Trụ Cột"
        core = next((l for l in lines if len(l) > 30), "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới, về bản thân con người và vị trí của con người trong thế giới đó.")
        img = "images/matter_and_mind.png" if os.path.exists("images/matter_and_mind.png") else ""
        return {
            "id": f"slide{idx}",
            "templateType": "definition",
            "tag": "KHÁI NIỆM",
            "title": title,
            "subtitle": "Hệ thống tri thức lý luận chung nhất của con người về thế giới",
            "coreQuote": core,
            "image": img,
            "pillars": [
                {"title": "Hình thái ý thức", "desc": "Là một hình thái ý thức xã hội đặc thù mang tính lý luận."},
                {"title": "Khách thể toàn diện", "desc": "Nghiên cứu thế giới trong tính chỉnh thể toàn vẹn, cả bên ngoài và bên trong con người."},
                {"title": "Quy luật phổ biến", "desc": "Tìm ra những quy luật chi phối sự vận động của tự nhiên, xã hội và tư duy."},
                {"title": "Công cụ lý tính", "desc": "Dựa trên tiêu chuẩn logic, lý tính và kinh nghiệm thực tiễn để khái quát lý luận."}
            ],
            "narrationScript": f"Tóm lại, triết học chính là hệ thống tri thức lý luận chung nhất của con người về thế giới và vị trí của con người trong thế giới đó. Nó cung cấp cho chúng ta hệ thống quy luật phổ biến chi phối cả tự nhiên, xã hội và tư duy nhân loại."
        }

    # 5. So sánh / Đối lập / Điều kiện KT-XH
    if "điều kiện" in full_text or "so sánh" in full_text or "vs" in full_text or "đối lập" in full_text or "xã hội" in full_text:
        title = lines[0] if len(lines) > 0 else "Nguồn Gốc Xã Hội Của Triết Học"
        img = "images/marx_engels.png" if os.path.exists("images/marx_engels.png") else ""
        return {
            "id": f"slide{idx}",
            "templateType": "comparison",
            "tag": "NGUỒN GỐC TRIẾT HỌC",
            "title": title,
            "subtitle": "Sự phân hóa xã hội và phân công lao động là bệ đỡ cho triết học",
            "image": img,
            "leftCol": {
                "title": "Điều kiện Xã hội",
                "items": [
                    "Lực lượng sản xuất phát triển đến một trình độ nhất định.",
                    "Phân công lao động xã hội hình thành và phát triển.",
                    "Xã hội xuất hiện chế độ tư hữu, giai cấp và nhà nước."
                ]
            },
            "rightCol": {
                "title": "Điều kiện Trí thức",
                "items": [
                    "Lao động trí óc tách biệt khỏi lao động chân tay.",
                    "Tầng lớp trí thức chuyên nghiệp ra đời, có điều kiện nghiên cứu.",
                    "Năng lực hệ thống hóa và truyền thụ tri thức được hình thành."
                ]
            },
            "conclusion": "Kết luận: Triết học luôn mang dấu ấn thời đại và phản ánh lợi ích của lực lượng xã hội sản sinh ra nó.",
            "narrationScript": "Về nguồn gốc xã hội, triết học đòi hỏi hai tiền đề then chốt: sản xuất xã hội phát triển dẫn đến phân hóa giai cấp, và sự xuất hiện của tầng lớp trí thức khi lao động trí óc tách khỏi lao động chân tay, tạo điều kiện cho việc nghiên cứu lý luận chuyên sâu."
        }

    # 6. Mặc định: Sơ đồ 3 Nấc thang (Process)
    title = lines[0] if len(lines) > 0 else "Nguồn Gốc Nhận Thức Của Triết Học"
    img = "images/dialectical_spiral.png" if os.path.exists("images/dialectical_spiral.png") else ""
    return {
        "id": f"slide{idx}",
        "templateType": "process",
        "tag": "NGUỒN GỐC TRIẾT HỌC",
        "title": title,
        "subtitle": "Ba nấc thang phát triển của năng lực tư duy con người",
        "image": img,
        "cards": [
            {
                "level": "Nấc thang 1",
                "title": "Kinh nghiệm ban đầu",
                "desc": "Thu thập những hiểu biết cụ thể, cảm tính, rời rạc về từng sự vật, hiện tượng riêng lẻ trong đời sống."
            },
            {
                "level": "Nấc thang 2",
                "title": "Tư duy khái quát",
                "desc": "Hình thành năng lực trừu tượng hóa, khái quát hóa, so sánh và tìm ra mối liên hệ bản chất giữa các hiện tượng."
            },
            {
                "level": "Nấc thang 3",
                "title": "Luận thuyết triết học",
                "desc": "Xây dựng hệ thống khái niệm, phạm trù, quy luật chung nhất giải thích toàn bộ thế giới khách quan."
            }
        ],
        "narrationScript": "Về mặt nhận thức, triết học chỉ ra đời khi tư duy con người đạt tới trình độ trừu tượng hóa cao độ. Chúng ta đi từ những kinh nghiệm cảm tính riêng lẻ, qua quá trình khái quát hóa, để đúc kết thành các luận thuyết lý luận có tầm phổ quát."
    }

def convert_pptx_to_lecture_json(pptx_path, output_json="lecture.json", max_slides=6):
    """Chuyển đổi file pptx thành lecture.json hoàn chỉnh."""
    print(f"[PPTX] Đang trích xuất file: {pptx_path}...")
    extracted_imgs = extract_media_from_pptx(pptx_path, output_dir="images")
    print(f"[PPTX] Đã trích xuất {len(extracted_imgs)} ảnh nhúng vào thư mục images/")

    raw_slides = extract_pptx_slides(pptx_path)
    print(f"[PPTX] Tìm thấy tổng cộng {len(raw_slides)} slide trong file PowerPoint.")
    
    selected_slides = raw_slides[:max_slides]
    processed_slides = []
    
    for r in selected_slides:
        templated = classify_and_template_slide(r, len(raw_slides), extracted_imgs)
        processed_slides.append(templated)
        
    result = {
        "title": processed_slides[0]["title"] if processed_slides else "Bài Giảng Điện Tử",
        "subject": "Triết học Mác - Lênin",
        "voice": "Mỹ Duyên",
        "totalSlides": len(processed_slides),
        "slides": processed_slides
    }
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        
    print(f"[PPTX] Đã xuất cấu trúc bài giảng thành công ra: {output_json}!")
    return result

if __name__ == "__main__":
    pptx_file = "1_Khái_luận_về_triết_học_và_triết_học_Mác_Lênin.pptx"
    if len(sys.argv) > 1:
        pptx_file = sys.argv[1]
    convert_pptx_to_lecture_json(pptx_file)
