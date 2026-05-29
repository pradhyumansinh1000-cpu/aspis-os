"""
app/ai/ocr_pipeline.py — Refactored Question Paper OCR Pipeline

Integrates with the abstract OCRProvider interface to extract text from images,
maintaining the file handling, page extraction, and PDF splitting framework.
"""

import hashlib
import io
import time
from typing import Any
import structlog
from PIL import Image
from app.core.providers import get_ocr_provider
from app.core.exceptions import FileProcessingError

logger = structlog.get_logger()

class OCRPipeline:
    """
    OCR pipeline routing page extractions to abstract OCRProvider.
    Designed for async execution in Celery workers.
    """

    def __init__(self):
        self.provider = get_ocr_provider()

    def compute_file_hash(self, file_bytes: bytes) -> str:
        """SHA-256 hash for deduplication."""
        return hashlib.sha256(file_bytes).hexdigest()

    def pdf_to_images(self, pdf_bytes: bytes) -> list[Image.Image]:
        """Convert PDF pages to PIL images at 300 DPI."""
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(
                pdf_bytes,
                dpi=300,
                fmt="PNG",
                thread_count=2,
            )
            logger.info(f"PDF converted to {len(images)} page images")
            return images
        except Exception as e:
            raise FileProcessingError(f"Failed to convert PDF to images: {e}")

    def extract_text_from_image(self, image: Image.Image) -> tuple[str, float]:
        """Delegate text extraction to the active OCR provider."""
        result = self.provider.extract_text(image)
        return result["text"], result["confidence"]

    def process_file(self, file_bytes: bytes, mime_type: str) -> dict[str, Any]:
        """
        Processes PDF/Image files, extracts text page-by-page, and returns results.
        """
        content_hash = self.compute_file_hash(file_bytes)
        start = time.perf_counter()

        if mime_type == "application/pdf":
            images = self.pdf_to_images(file_bytes)
        elif mime_type.startswith("image/"):
            images = [Image.open(io.BytesIO(file_bytes))]
        else:
            raise FileProcessingError(f"Unsupported file type: {mime_type}")

        all_texts = []
        all_confidences = []

        for i, image in enumerate(images):
            logger.info(f"OCR processing page {i + 1}/{len(images)}")
            text, confidence = self.extract_text_from_image(image)
            all_texts.append(f"--- PAGE {i + 1} ---\n{text}")
            all_confidences.append(confidence)

        raw_text = "\n\n".join(all_texts)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        duration_ms = int((time.perf_counter() - start) * 1000)

        logger.info(
            "OCR pipeline process complete",
            pages=len(images),
            confidence=round(avg_confidence, 3),
            duration_ms=duration_ms,
        )

        return {
            "raw_text": raw_text,
            "page_count": len(images),
            "confidence": avg_confidence,
            "content_hash": content_hash,
            "processing_time_ms": duration_ms,
        }


# Singleton wrapper
_ocr_pipeline: OCRPipeline | None = None

def get_ocr_pipeline() -> OCRPipeline:
    """Return singleton OCR pipeline."""
    global _ocr_pipeline
    if _ocr_pipeline is None:
        _ocr_pipeline = OCRPipeline()
    return _ocr_pipeline
