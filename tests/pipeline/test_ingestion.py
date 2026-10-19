"""
tests/pipeline/test_ingestion.py
Unit and Integration Tests for Document Ingestion Service (PPTX, PDF, DOCX, Markdown)
Following strict TDD practice.
"""

import os
import shutil
import pytest
import jsonschema

from schemas.models import DocumentContext, FileType
from scripts.document_ingestion import (
    DocumentIngestionService,
    UnsupportedFormatError,
    FileTooLargeError,
    ParseFailureError,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURES_DIR = os.path.join(BASE_DIR, "fixtures")
TEST_STORAGE_DIR = os.path.join(BASE_DIR, "storage", "test_projects")


@pytest.fixture(scope="module")
def schema():
    import json
    schema_path = os.path.join(BASE_DIR, "schemas", "document_context.json")
    with open(schema_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(autouse=True)
def cleanup_test_storage():
    os.makedirs(TEST_STORAGE_DIR, exist_ok=True)
    yield
    if os.path.exists(TEST_STORAGE_DIR):
        shutil.rmtree(TEST_STORAGE_DIR, ignore_errors=True)


def test_ingest_pptx(schema):
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    pptx_path = os.path.join(FIXTURES_DIR, "sample.pptx")
    project_id = "proj-test-pptx"

    result = service.ingest_document(pptx_path, project_id=project_id)

    assert isinstance(result, DocumentContext)
    assert result.fileType == FileType.PPTX
    assert len(result.sections) > 0
    assert result.title != ""

    # Validate against JSON schema
    jsonschema.validate(instance=result.model_dump(), schema=schema)


def test_ingest_markdown(schema):
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    md_path = os.path.join(FIXTURES_DIR, "sample.md")
    project_id = "proj-test-md"

    result = service.ingest_document(md_path, project_id=project_id)

    assert isinstance(result, DocumentContext)
    assert result.fileType == FileType.MD
    assert len(result.sections) >= 2
    assert "Triết học" in result.title

    # Check table extraction in section 0
    sec0 = result.sections[0]
    assert len(sec0.bullets) >= 3
    assert len(sec0.tables) >= 1
    assert "Trường phái" in sec0.tables[0].headers

    # Validate against JSON schema
    jsonschema.validate(instance=result.model_dump(), schema=schema)


def test_ingest_docx(schema):
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    docx_path = os.path.join(FIXTURES_DIR, "sample.docx")
    project_id = "proj-test-docx"

    result = service.ingest_document(docx_path, project_id=project_id)

    assert isinstance(result, DocumentContext)
    assert result.fileType == FileType.DOCX
    assert len(result.sections) >= 1
    assert any(len(sec.tables) >= 1 for sec in result.sections)

    # Validate against JSON schema
    jsonschema.validate(instance=result.model_dump(), schema=schema)


def test_ingest_pdf(schema):
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    pdf_path = os.path.join(FIXTURES_DIR, "sample.pdf")
    project_id = "proj-test-pdf"

    result = service.ingest_document(pdf_path, project_id=project_id)

    assert isinstance(result, DocumentContext)
    assert result.fileType == FileType.PDF
    assert len(result.sections) >= 2
    assert "triet hoc" in result.title.lower() or "triết học" in result.title.lower()

    # Validate against JSON schema
    jsonschema.validate(instance=result.model_dump(), schema=schema)


def test_unsupported_format_error():
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    invalid_file = os.path.join(TEST_STORAGE_DIR, "test.exe")
    with open(invalid_file, "w") as f:
        f.write("fake binary")

    with pytest.raises(UnsupportedFormatError) as exc_info:
        service.ingest_document(invalid_file, project_id="proj-err")
    assert "Unsupported file format" in str(exc_info.value)


def test_file_too_large_error():
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR, max_file_size_mb=1)
    large_file = os.path.join(TEST_STORAGE_DIR, "large.md")
    # Write > 1MB
    with open(large_file, "wb") as f:
        f.write(b"0" * (1024 * 1024 + 100))

    with pytest.raises(FileTooLargeError) as exc_info:
        service.ingest_document(large_file, project_id="proj-large")
    assert "exceeds" in str(exc_info.value).lower()


def test_corrupted_file_error():
    service = DocumentIngestionService(storage_base=TEST_STORAGE_DIR)
    corrupted_docx = os.path.join(TEST_STORAGE_DIR, "corrupt.docx")
    with open(corrupted_docx, "wb") as f:
        f.write(b"not a real docx zip archive")

    with pytest.raises(ParseFailureError):
        service.ingest_document(corrupted_docx, project_id="proj-corrupt")
