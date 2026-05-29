"""
app/core/providers/embed_provider.py — Embedding Provider Abstraction Layer

Defines the abstract EmbeddingProvider interface and the concrete NemotronEmbeddingProvider.
"""

from abc import ABC, abstractmethod
from typing import List
import math
import httpx
import structlog
from app.config import settings
from app.core.exceptions import AIServiceError

logger = structlog.get_logger()

class EmbeddingProvider(ABC):
    """
    Abstract interface for generating vector embeddings.
    """
    
    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts in batch."""
        pass
        
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Embed a single string."""
        pass

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        magnitude_a = math.sqrt(sum(a ** 2 for a in vec_a))
        magnitude_b = math.sqrt(sum(b ** 2 for b in vec_b))
        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0
        return dot_product / (magnitude_a * magnitude_b)


class NemotronEmbeddingProvider(EmbeddingProvider):
    """
    NVIDIA Nemotron Embed VL 1B V2 provider implementation.
    """

    def __init__(self):
        self.base_url = settings.NEMOTRON_BASE_URL.rstrip("/")
        self.model = settings.NEMOTRON_MODEL
        self.api_key = settings.NVIDIA_API_KEY
        self.timeout = httpx.Timeout(45.0, connect=5.0)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # Split batch sizes to 32 to prevent OOM
        batch_size = 32
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await self._embed_batch(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def embed_text(self, text: str) -> List[float]:
        results = await self.embed_texts([text])
        if not results:
            raise AIServiceError("Nemotron", "Failed to generate embedding vector")
        return results[0]

    async def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        payload = {
            "model": self.model,
            "input": texts,
            "encoding_format": "float",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/embeddings",
                    json=payload,
                    headers=self._headers(),
                )
                response.raise_for_status()
        except Exception as e:
            logger.error("Nemotron embedding batch request failed", error=str(e))
            raise AIServiceError("Nemotron", f"Inference client error: {str(e)}")

        data = response.json()
        sorted_data = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in sorted_data]
