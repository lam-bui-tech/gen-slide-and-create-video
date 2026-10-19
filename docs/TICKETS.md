# AI Lecture Studio — Work Breakdown Tickets (Tracer Bullets)

> **Sprint 0 Frozen Contracts**: [schemas/](file:///c:/Users/OS/Downloads/project/my-presentation/schemas), [fixtures/](file:///c:/Users/OS/Downloads/project/my-presentation/fixtures), [docs/API.md](file:///c:/Users/OS/Downloads/project/my-presentation/docs/API.md).  
> **Rule**: Hai người làm việc song song trong worktree riêng. Chỉ giao tiếp qua shared contracts và mock fixtures.

---

## Dependency Graph (Sơ đồ phụ thuộc)

```mermaid
graph TD
    subgraph Sprint0["Sprint 0: Hợp đồng chung (DONE)"]
        S0["Schemas + Fixtures + API.md"]
    end

    subgraph TrackA["Track A: Pipeline & Export (Người A)"]
        A1["01-A1: Ingestion Service<br/>(PPTX, PDF, DOCX, MD)"]
        A2["02-A2: Clarification Flow<br/>& LLM Provider"]
        A3["03-A3: Outline Generator<br/>& Approval API"]
        A4["04-A4: VieNeu-TTS Engine<br/>& Audio-First Sync"]
        A5["05-A5: Multi-Format Export<br/>(MP4, PDF, Editable PPTX)"]

        S0 --> A1 --> A2 --> A3
        S0 --> A4 --> A5
    end

    subgraph TrackB["Track B: Engine & Studio (Người B)"]
        B1["06-B1: 10 HyperFrames Templates<br/>& Design Tokens"]
        B2["07-B2: Outline -> Scene -> HTML<br/>Mapper Engine"]
        B3["08-B3: Studio WYSIWYG<br/>Direct Canvas Editing"]
        B4["09-B4: Layout Variant Switcher<br/>& Animation Picker"]
        B5["10-B5: Studio Voice UI<br/>& Audio Timeline"]

        S0 --> B1 --> B2
        B1 --> B3 --> B4
        B3 --> B5
    end

    subgraph Gates["Điểm tích hợp (Integration Gates)"]
        G2["Gate G2: A3 Outline thật ↔ B2 Mapper"]
        G3["Gate G3: B3 Studio ↔ A Backend APIs"]
        G4["Gate G4: A4 Audio Sync ↔ B5 Voice UI"]
        G5["Gate G5: A5 Render MP4/PDF từ Scene của Studio"]

        A3 -.-> G2
        B2 -.-> G2
        B3 -.-> G3
        A4 -.-> G4
        B5 -.-> G4
        A5 -.-> G5
    end
```

---

## Chi Tiết Các Tracer-Bullet Tickets

| ID | Thẻ | Tiêu đề | Phụ thuộc (Blocked by) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `[A]` | Multi-format Document Ingestion Service | Không (Schema frozen) | `completed` |
| **02** | `[A]` | Clarification Interview & LLM Provider Setup | `01-A1` (Done) | `completed` |
| **03** | `[A]` | Pedagogical Outline Generator & Approval API | `02-A2` (Done) | `completed` |
| **04** | `[A]` | VieNeu-TTS Synthesis & Audio-First Sync Engine | Không (Done) | `completed` |
| **05** | `[A]` | Multi-format Export Jobs (MP4, PDF, PPTX) | `04-A4` (Done) | `completed` |
| **06** | `[B]` | Design Tokens & 10 HyperFrames Templates | Không (dùng `fixtures/scene.sample.json`) | `ready-for-agent` |
| **07** | `[B]` | Outline to Scene & HyperFrames Mapper | `06-B1` (dùng `fixtures/outline.sample.json`) | `pending` |
| **08** | `[B]` | Studio Canvas Direct Editing & Autosave | `06-B1` | `pending` |
| **09** | `[B]` | Layout Variant Switcher & Animation Picker | `08-B3` | `pending` |
| **10** | `[B]` | Studio Voice UI & Audio-Driven Timeline | `08-B3` | `pending` |
