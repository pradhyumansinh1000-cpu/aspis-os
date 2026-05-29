"""
app/core/providers/__init__.py — Provider Registration Module

Registers and initializes the singleton instances for abstract AI, Embedding, and OCR providers.
"""

from app.core.providers.ai_provider import AIProvider, OpenRouterAIProvider
from app.core.providers.embed_provider import EmbeddingProvider, NemotronEmbeddingProvider
from app.core.providers.ocr_provider import OCRProvider, PaddleTesseractOCRProvider

# Initialize singleton provider instances
_ai_provider = OpenRouterAIProvider()
_embed_provider = NemotronEmbeddingProvider()
_ocr_provider = PaddleTesseractOCRProvider()

def get_ai_provider() -> AIProvider:
    """Return the active AI completion provider (e.g. OpenRouter Llama 3.3)."""
    return _ai_provider

def get_embedding_provider() -> EmbeddingProvider:
    """Return the active embedding provider (e.g. NVIDIA Nemotron)."""
    return _embed_provider

def get_ocr_provider() -> OCRProvider:
    """Return the active OCR document parser (PaddleOCR + Tesseract)."""
    return _ocr_provider
