# 0004. Backend Dual HTTP Architecture, SQLite Storage, and Local-First Auth Scope

## Context
Dự án AI Lecture Studio cần tích hợp hai môi trường công nghệ: Python (cho Document Ingestion MarkItDown/python-pptx, LLM Gemini/Ollama, và mô hình PyTorch VieNeu-TTS v3 Turbo) và Node.js (cho HyperFrames Engine, CLI render, và Web Studio Server). Đồng thời cần xác định giải pháp lưu trữ trạng thái bài giảng và phạm vi bảo mật cho bản MVP.

## Decision
1. **Kiến trúc Dual HTTP Service**:
   - **Python FastAPI Service** (cổng mặc định `8000`): Chịu trách nhiệm bóc tách tài liệu (`/documents/parse`), điều phối LLM (`/pedagogy/*`), và chạy mô hình `VieNeu-TTS-v3-Turbo` thường trú trong RAM/VRAM để sinh giọng nói nhanh tức thì mà không bị overhead nạp mô hình.
   - **Node.js Gateway & Studio Server** (`server.js`, cổng `3000`): Đóng vai trò máy chủ trung tâm phục vụ Web UI, proxy các API request sang Python FastAPI, quản lý tiến trình HyperFrames CLI (`npx hyperframes render`), và đóng gói file xuất.
   - Giao tiếp giữa Node và Python qua HTTP REST JSON cục bộ (`http://127.0.0.1:8000`).

2. **Cơ chế lưu trữ SQLite + File System**:
   - **SQLite** (`storage/lecture_studio.db`): Quản lý metadata của dự án (`projects`: id, title, current_step, timestamps) và hàng đợi tiến trình bất đồng bộ (`jobs`: id, type [tts|render|export], status, progress, error).
   - **Local File System** (`storage/projects/{id}/`): Lưu trữ toàn bộ dữ liệu nội dung dạng JSON Schema (`document_context.json`, `lesson_outline.json`, `scene.json`), các file tài liệu gốc upload, file âm thanh sinh ra (`audio/`), và sản phẩm xuất bản (`exports/`).

3. **Phạm vi Xác thực (No Auth / Local-First)**:
   - Bản MVP được thiết kế theo hướng Local-first / Single-tenant tool cho giảng viên sử dụng trên máy trạm hoặc mạng nội bộ.
   - Không áp dụng hệ thống xác thực đăng nhập người dùng (JWT/OAuth). Khóa `GEMINI_API_KEY` được đọc từ biến môi trường `.env` hoặc cấu hình qua modal giao diện Studio.
