"""
scripts/document_ingestion.py
Multi-format Document Ingestion Service for AI Lecture Studio
Extracts structured text, bullets, tables, embedded images, and speaker notes
from PPTX, PDF, DOCX, and Markdown files into DocumentContext.json conforming to schemas/.
"""

import os
import re
import json
import zipfile
import shutil
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

from schemas.models import (
    DocumentContext,
    DocumentSection,
    DocumentTable,
    ExtractedImage,
    FileType,
)


class IngestionError(Exception):
    """Base exception for ingestion errors."""
    pass


class UnsupportedFormatError(IngestionError):
    """Raised when file extension is not supported."""
    pass


class FileTooLargeError(IngestionError):
    """Raised when file size exceeds maximum threshold."""
    pass


class ParseFailureError(IngestionError):
    """Raised when document parsing fails or file is corrupted."""
    pass


class DocumentIngestionService:
    def __init__(self, storage_base: str = "storage/projects", max_file_size_mb: int = 50):
        self.storage_base = storage_base
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024

    def ingest_document(self, file_path: str, project_id: str) -> DocumentContext:
        """
        Main entry point: validates file and parses into DocumentContext.
        Saves extracted images and document_context.json into storage/projects/{project_id}/.
        """
        if not os.path.exists(file_path):
            raise ParseFailureError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size > self.max_file_size_bytes:
            raise FileTooLargeError(
                f"File size ({file_size / (1024*1024):.2f}MB) exceeds maximum limit of {self.max_file_size_bytes / (1024*1024):.0f}MB"
            )

        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        supported_exts = {
            "pptx": FileType.PPTX,
            "pdf": FileType.PDF,
            "docx": FileType.DOCX,
            "md": FileType.MD,
        }

        if ext not in supported_exts:
            raise UnsupportedFormatError(
                f"Unsupported file format: .{ext}. Supported formats are: pptx, pdf, docx, md."
            )

        file_type = supported_exts[ext]
        project_dir = os.path.join(self.storage_base, project_id)
        images_dir = os.path.join(project_dir, "images")
        os.makedirs(images_dir, exist_ok=True)

        try:
            if file_type == FileType.PPTX:
                doc_context = self._parse_pptx(file_path, project_id, images_dir)
            elif file_type == FileType.MD:
                doc_context = self._parse_markdown(file_path, project_id, images_dir)
            elif file_type == FileType.DOCX:
                doc_context = self._parse_docx(file_path, project_id, images_dir)
            elif file_type == FileType.PDF:
                doc_context = self._parse_pdf(file_path, project_id, images_dir)
            else:
                raise UnsupportedFormatError(f"No parser implemented for {ext}")
        except IngestionError:
            raise
        except Exception as e:
            raise ParseFailureError(f"Failed to parse {ext.upper()} document '{file_path}': {str(e)}") from e

        # Persist DocumentContext.json in project storage
        output_json_path = os.path.join(project_dir, "document_context.json")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(doc_context.model_dump(), f, ensure_ascii=False, indent=2)

        return doc_context

    # ==========================================
    # 1. PPTX Parser
    # ==========================================
    def _parse_pptx(self, file_path: str, project_id: str, images_dir: str) -> DocumentContext:
        extracted_images: List[ExtractedImage] = []
        sections: List[DocumentSection] = []

        try:
            with zipfile.ZipFile(file_path, "r") as z:
                # 1. Extract embedded images
                media_files = [f for f in z.namelist() if f.startswith("ppt/media/")]
                img_counter = 1
                for mf in media_files:
                    filename = os.path.basename(mf)
                    dest_path = os.path.join(images_dir, filename)
                    with open(dest_path, "wb") as f_out:
                        f_out.write(z.read(mf))

                    rel_path = f"storage/projects/{project_id}/images/{filename}"
                    img_id = f"img-{img_counter:02d}"
                    img_format = os.path.splitext(filename)[1].lower().lstrip(".")
                    extracted_images.append(
                        ExtractedImage(
                            id=img_id,
                            filePath=rel_path,
                            originalName=filename,
                            format=img_format if img_format in ["png", "jpg", "jpeg", "webp", "svg"] else "png"
                        )
                    )
                    img_counter += 1

                # 2. Extract slides
                slide_files = [f for f in z.namelist() if f.startswith("ppt/slides/slide") and f.endswith(".xml")]

                def extract_num(name):
                    m = re.search(r"slide(\d+)\.xml", name)
                    return int(m.group(1)) if m else 9999

                slide_files.sort(key=extract_num)
                title = "Bài giảng PPTX"

                for order, sf in enumerate(slide_files):
                    s_num = extract_num(sf)
                    xml_content = z.read(sf)
                    tree = ET.fromstring(xml_content)

                    lines = []
                    for p_node in tree.iter():
                        if p_node.tag.endswith("}p"):
                            p_text = "".join([t.text for t in p_node.iter() if t.text and t.text.strip()])
                            if p_text.strip():
                                lines.append(re.sub(r"\s+", " ", p_text.strip()))

                    # Extract notes
                    note_file = f"ppt/notesSlides/notesSlide{s_num}.xml"
                    notes = ""
                    if note_file in z.namelist():
                        try:
                            note_tree = ET.fromstring(z.read(note_file))
                            note_lines = []
                            for np_node in note_tree.iter():
                                if np_node.tag.endswith("}p"):
                                    n_text = "".join([t.text for t in np_node.iter() if t.text and t.text.strip()])
                                    if n_text.strip():
                                        note_lines.append(n_text.strip())
                            notes = " ".join(note_lines)
                        except Exception:
                            notes = ""

                    sec_title = lines[0] if lines else f"Slide {s_num}"
                    bullets = lines[1:] if len(lines) > 1 else []
                    if order == 0 and lines:
                        title = lines[0]

                    # Assign image ids
                    sec_img_ids = [img.id for img in extracted_images[:2]] if order == 0 else []

                    sections.append(
                        DocumentSection(
                            sectionId=f"sec-{order+1:02d}",
                            title=sec_title,
                            contentOrder=order,
                            bullets=bullets,
                            tables=[],
                            speakerNotes=notes if notes else None,
                            imageIds=sec_img_ids,
                        )
                    )

            return DocumentContext(
                title=title,
                sourceFileName=os.path.basename(file_path),
                fileType=FileType.PPTX,
                sections=sections,
                extractedImages=extracted_images,
                metadata={"totalSlidesOriginal": len(sections)}
            )
        except zipfile.BadZipFile as e:
            raise ParseFailureError(f"Invalid or corrupted PPTX file: {e}") from e

    # ==========================================
    # 2. Markdown Parser
    # ==========================================
    def _parse_markdown(self, file_path: str, project_id: str, images_dir: str) -> DocumentContext:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")
        title = "Tài liệu bài giảng Markdown"
        author = None
        sections: List[DocumentSection] = []

        current_sec_title = ""
        current_bullets: List[str] = []
        current_tables: List[DocumentTable] = []
        current_notes = []
        in_table = False
        table_headers: List[str] = []
        table_rows: List[List[str]] = []
        content_order = 0

        def flush_section():
            nonlocal current_sec_title, current_bullets, current_tables, current_notes, content_order
            if current_sec_title or current_bullets:
                speaker_notes_str = " ".join(current_notes).strip() if current_notes else None
                sections.append(
                    DocumentSection(
                        sectionId=f"sec-{content_order+1:02d}",
                        title=current_sec_title if current_sec_title else f"Phần {content_order+1}",
                        contentOrder=content_order,
                        bullets=list(current_bullets),
                        tables=list(current_tables),
                        speakerNotes=speaker_notes_str,
                    )
                )
                content_order += 1
                current_bullets = []
                current_tables = []
                current_notes = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                if in_table:
                    if table_headers:
                        current_tables.append(DocumentTable(headers=table_headers, rows=table_rows))
                    in_table = False
                    table_headers = []
                    table_rows = []
                continue

            # Main Title (# Title)
            if line_str.startswith("# ") and not line_str.startswith("## "):
                title = line_str[2:].strip()
                continue

            # Author detection
            if line_str.lower().startswith("tác giả:") or line_str.lower().startswith("author:"):
                author = line_str.split(":", 1)[1].strip()
                continue

            # Section Header (## Section)
            if line_str.startswith("## ") or line_str.startswith("### "):
                if in_table and table_headers:
                    current_tables.append(DocumentTable(headers=table_headers, rows=table_rows))
                    in_table = False
                    table_headers = []
                    table_rows = []

                flush_section()
                current_sec_title = re.sub(r"^#+\s*", "", line_str)
                continue

            # Markdown Table detection
            if line_str.startswith("|") and line_str.endswith("|"):
                cells = [c.strip() for c in line_str.split("|")[1:-1]]
                if all(re.match(r"^:?-+:?$", c) for c in cells):
                    # Separator line
                    continue
                if not in_table:
                    in_table = True
                    table_headers = cells
                    table_rows = []
                else:
                    table_rows.append(cells)
                continue
            else:
                if in_table:
                    if table_headers:
                        current_tables.append(DocumentTable(headers=table_headers, rows=table_rows))
                    in_table = False
                    table_headers = []
                    table_rows = []

            # Speaker Notes detection
            note_match = re.match(r"^(?:Ghi chú|Note|Speaker note)s?:\s*(.*)", line_str, re.IGNORECASE)
            if note_match:
                current_notes.append(note_match.group(1))
                continue

            # Bullets or Paragraphs
            if re.match(r"^[-*•]\s+", line_str):
                bullet_text = re.sub(r"^[-*•]\s+", "", line_str)
                current_bullets.append(bullet_text)
            else:
                current_bullets.append(line_str)

        # Flush final section
        if in_table and table_headers:
            current_tables.append(DocumentTable(headers=table_headers, rows=table_rows))
        flush_section()

        return DocumentContext(
            title=title,
            author=author,
            sourceFileName=os.path.basename(file_path),
            fileType=FileType.MD,
            sections=sections,
            extractedImages=[],
            metadata={"lineCount": len(lines)}
        )

    # ==========================================
    # 3. DOCX Parser
    # ==========================================
    def _parse_docx(self, file_path: str, project_id: str, images_dir: str) -> DocumentContext:
        try:
            import docx
            from docx.text.paragraph import Paragraph
            from docx.table import Table
            doc = docx.Document(file_path)
        except Exception as e:
            raise ParseFailureError(f"Corrupted or invalid DOCX document: {e}") from e

        title = "Tài liệu bài giảng DOCX"
        sections: List[DocumentSection] = []
        current_sec_title = ""
        current_bullets: List[str] = []
        current_tables: List[DocumentTable] = []
        current_notes = []
        content_order = 0

        def flush_section():
            nonlocal current_sec_title, current_bullets, current_tables, current_notes, content_order
            if current_sec_title or current_bullets or current_tables:
                speaker_notes_str = " ".join(current_notes).strip() if current_notes else None
                sections.append(
                    DocumentSection(
                        sectionId=f"sec-{content_order+1:02d}",
                        title=current_sec_title if current_sec_title else f"Phần {content_order+1}",
                        contentOrder=content_order,
                        bullets=list(current_bullets),
                        tables=list(current_tables),
                        speakerNotes=speaker_notes_str,
                    )
                )
                content_order += 1
                current_bullets = []
                current_tables = []
                current_notes = []

        # Iterate body children in sequential order
        for child in doc.element.body:
            tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if tag == "p":
                p = Paragraph(child, doc)
                text = p.text.strip()
                if not text:
                    continue

                style_name = p.style.name.lower() if p.style else ""
                if "title" in style_name:
                    title = text
                    continue
                elif "heading 1" in style_name or "heading 2" in style_name:
                    flush_section()
                    current_sec_title = text
                    continue

                note_match = re.match(r"^(?:Ghi chú|Note|Speaker note)s?:\s*(.*)", text, re.IGNORECASE)
                if note_match:
                    current_notes.append(note_match.group(1))
                else:
                    current_bullets.append(text)
            elif tag == "tbl":
                tbl = Table(child, doc)
                if tbl.rows:
                    headers = [cell.text.strip() for cell in tbl.rows[0].cells]
                    rows = []
                    for row in tbl.rows[1:]:
                        rows.append([cell.text.strip() for cell in row.cells])
                    current_tables.append(DocumentTable(headers=headers, rows=rows))

        flush_section()

        return DocumentContext(
            title=title,
            sourceFileName=os.path.basename(file_path),
            fileType=FileType.DOCX,
            sections=sections,
            extractedImages=[],
            metadata={"paragraphCount": len(doc.paragraphs), "tableCount": len(doc.tables)}
        )

    # ==========================================
    # 4. PDF Parser
    # ==========================================
    def _parse_pdf(self, file_path: str, project_id: str, images_dir: str) -> DocumentContext:
        try:
            import pymupdf
            doc = pymupdf.open(file_path)
        except Exception as e:
            raise ParseFailureError(f"Corrupted or invalid PDF document: {e}") from e

        title = "Tài liệu bài giảng PDF"
        sections: List[DocumentSection] = []

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text("text").strip()
            if not text:
                continue

            lines = [line.strip() for line in text.split("\n") if line.strip()]
            sec_title = lines[0] if lines else f"Trang {page_idx+1}"
            bullets = []
            notes = []

            for line in lines[1:]:
                note_match = re.match(r"^(?:Ghi chú|Note|Speaker note)s?:\s*(.*)", line, re.IGNORECASE)
                if note_match:
                    notes.append(note_match.group(1))
                else:
                    bullets.append(re.sub(r"^[-*•]\s*", "", line))

            if page_idx == 0 and lines:
                title = lines[0]

            sections.append(
                DocumentSection(
                    sectionId=f"sec-{page_idx+1:02d}",
                    title=sec_title,
                    contentOrder=page_idx,
                    bullets=bullets,
                    tables=[],
                    speakerNotes=" ".join(notes) if notes else None,
                )
            )

        return DocumentContext(
            title=title,
            sourceFileName=os.path.basename(file_path),
            fileType=FileType.PDF,
            sections=sections,
            extractedImages=[],
            metadata={"pageCount": len(doc)}
        )
