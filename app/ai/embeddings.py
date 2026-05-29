"""
app/ai/embeddings.py — Refactored Embedding Client

Delegates text vectorization, document batching, and similarity math to the configured EmbeddingProvider.
"""

from typing import List, Tuple, Dict
import structlog
from app.core.providers import get_embedding_provider

logger = structlog.get_logger()

class NemotronEmbedClient:
    """
    Embedding Client wrapper routing vector operations to abstract EmbeddingProvider.
    """

    def __init__(self):
        self.provider = get_embedding_provider()

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Batch embed list of texts."""
        return await self.provider.embed_texts(texts)

    async def embed_text(self, text: str) -> List[float]:
        """Embed a single text string."""
        return await self.provider.embed_text(text)

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        from app.core.providers.embed_provider import EmbeddingProvider
        return EmbeddingProvider.cosine_similarity(vec_a, vec_b)

    async def find_best_matching_topic(
        self,
        question_text: str,
        topics: List[Dict],
    ) -> Tuple[str, float]:
        """
        Find the best matching topic using embedding similarity comparisons.
        """
        if not topics:
            return ("", 0.0)

        topic_texts = [
            f"{t['name']}: {t.get('description', '')}" for t in topics
        ]
        all_texts = [question_text] + topic_texts
        all_embeddings = await self.embed_texts(all_texts)

        question_embedding = all_embeddings[0]
        topic_embeddings = all_embeddings[1:]

        best_similarity = -1.0
        best_topic_id = ""

        for topic, topic_embedding in zip(topics, topic_embeddings):
            similarity = self.cosine_similarity(question_embedding, topic_embedding)
            if similarity > best_similarity:
                best_similarity = similarity
                best_topic_id = str(topic["id"])

        logger.debug(
            "Topic matched",
            topic_id=best_topic_id,
            similarity=round(best_similarity, 4),
        )
        return (best_topic_id, best_similarity)


# Singleton wrapper
_embed_client: NemotronEmbedClient | None = None

def get_embed_client() -> NemotronEmbedClient:
    """Return singleton embedding provider wrapper."""
    global _embed_client
    if _embed_client is None:
        _embed_client = NemotronEmbedClient()
    return _embed_client
