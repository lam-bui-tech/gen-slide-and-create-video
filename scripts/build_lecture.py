import os
import sys
import json
import pathlib
import soundfile as sf
from vieneu import Vieneu

# Ensure utf-8 output in Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

LECTURE_DATA = {
    "title": "Chương 1: Khái luận về Triết học và Triết học Mác - Lênin",
    "subject": "Triết học Mác - Lênin",
    "voice": "Mỹ Duyên",
    "slides": [
        {
            "id": "slide1",
            "templateType": "hero",
            "tag": "CHƯƠNG 1",
            "title": "Khái Luận Về Triết Học & Triết Học Mác - Lênin",
            "subtitle": "Dành cho sinh viên các khối ngành không chuyên lý luận chính trị",
            "author": "Bộ môn Lý luận Chính trị",
            "narrationScript": "Chào mừng các bạn sinh viên đến với Chương 1: Khái luận về Triết học và Triết học Mác Lênin. Đây là học phần nền tảng giúp chúng ta trang bị thế giới quan và phương pháp luận khoa học để nhìn nhận, giải thích thế giới xung quanh một cách biện chứng."
        },
        {
            "id": "slide2",
            "templateType": "agenda",
            "tag": "MỞ ĐẦU",
            "title": "Mục Tiêu & Mạch Nội Dung Bài Học",
            "subtitle": "Giáo trình trang 11 – Đề cương chi tiết học phần",
            "objectives": [
                "Nắm vững những nét khái quát về triết học và vấn đề cơ bản của triết học.",
                "Hiểu rõ sự ra đời, các giai đoạn phát triển và thực chất cuộc cách mạng triết học của C. Mác và Ph. Ăngghen.",
                "Nhận diện vai trò của triết học Mác - Lênin trong thời đại ngày nay.",
                "Vận dụng sáng tạo thế giới quan và phương pháp luận duy vật biện chứng vào thực tiễn."
            ],
            "agenda": [
                {"num": "01", "name": "Triết học và vấn đề cơ bản"},
                {"num": "02", "name": "Triết học Mác - Lênin"},
                {"num": "03", "name": "Vai trò trong đời sống xã hội"}
            ],
            "narrationScript": "Trong bài học này, chúng ta tập trung vào ba mạch nội dung chính: thứ nhất là triết học và vấn đề cơ bản; thứ hai là sự hình thành triết học Mác Lênin; và thứ ba là vai trò thực tiễn của nó trong đời sống xã hội hiện đại."
        },
        {
            "id": "slide3",
            "templateType": "timeline",
            "tag": "PHẦN 1.1",
            "title": "Sự Ra Đời Của Triết Học",
            "subtitle": "Thế kỷ VIII đến thế kỷ VI trước Công nguyên",
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
        },
        {
            "id": "slide4",
            "templateType": "process",
            "tag": "NGUỒN GỐC TRIẾT HỌC",
            "title": "Nguồn Gốc Nhận Thức Của Triết Học",
            "subtitle": "Ba nấc thang phát triển của năng lực tư duy con người",
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
        },
        {
            "id": "slide5",
            "templateType": "comparison",
            "tag": "NGUỒN GỐC TRIẾT HỌC",
            "title": "Nguồn Gốc Xã Hội Của Triết Học",
            "subtitle": "Sự phân hóa xã hội và phân công lao động là bệ đỡ cho triết học",
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
        },
        {
            "id": "slide6",
            "templateType": "definition",
            "tag": "KHÁI NIỆM",
            "title": "Định Nghĩa Triết Học & Bốn Trụ Cột",
            "subtitle": "Hệ thống tri thức lý luận chung nhất của con người về thế giới",
            "coreQuote": "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới, về bản thân con người và vị trí của con người trong thế giới đó.",
            "pillars": [
                {"title": "Hình thái ý thức", "desc": "Là một hình thái ý thức xã hội đặc thù mang tính lý luận."},
                {"title": "Khách thể toàn diện", "desc": "Nghiên cứu thế giới trong tính chỉnh thể toàn vẹn, cả bên ngoài và bên trong con người."},
                {"title": "Quy luật phổ biến", "desc": "Tìm ra những quy luật chi phối sự vận động của tự nhiên, xã hội và tư duy."},
                {"title": "Công cụ lý tính", "desc": "Dựa trên tiêu chuẩn logic, lý tính và kinh nghiệm thực tiễn để khái quát lý luận."}
            ],
            "narrationScript": "Tóm lại, triết học chính là hệ thống tri thức lý luận chung nhất của con người về thế giới và vị trí của con người trong thế giới đó. Nó cung cấp cho chúng ta hệ thống quy luật phổ biến chi phối cả tự nhiên, xã hội và tư duy nhân loại."
        }
    ]
}

def synthesize_lecture_audio(data, force=False):
    print("Khởi tạo bộ tổng hợp âm thanh VieNeu-TTS v3 Turbo...")
    tts = Vieneu(mode="v3turbo")
    voice_name = data.get("voice", "Mỹ Duyên")
    
    os.makedirs("audio", exist_ok=True)
    durations = {}
    
    for idx, slide in enumerate(data["slides"]):
        slide_id = slide["id"]
        audio_file = f"audio/{slide_id}.wav"
        slide["audioFile"] = audio_file
        
        script = slide["narrationScript"]
        print(f"\n--- Đang xử lý {slide_id}: {slide['title']} ---")
        print(f"Giọng đọc: {voice_name}")
        print(f"Kịch bản: {script}")
        
        # Check if already generated
        if os.path.exists(audio_file) and not force:
            info = sf.info(audio_file)
            dur = round(info.duration, 2)
            print(f"Đã có tệp âm thanh sẵn: {audio_file} (Thời lượng: {dur}s)")
        else:
            print("Đang sinh âm thanh...")
            audio_data = tts.infer(text=script, voice=voice_name)
            sf.write(audio_file, audio_data, 48000)
            dur = round(len(audio_data) / 48000, 2)
            print(f"Hoàn thành sinh {audio_file} (Thời lượng: {dur}s)")
            
        durations[slide_id] = dur
        slide["duration"] = dur

    with open("audio/durations.json", "w", encoding="utf-8") as f:
        json.dump(durations, f, indent=2, ensure_ascii=False)
        
    with open("lecture.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print("\n[THÀNH CÔNG] Đã lưu durations.json và lecture.json!")
    return durations

if __name__ == "__main__":
    force_gen = "--force" in sys.argv
    synthesize_lecture_audio(LECTURE_DATA, force=force_gen)
