"""
app/ai/llm_client.py — Refactored AI Gateway Client

Delegates all chat generation and JSON formatting logic to the configured AIProvider.
Ensures clean provider replacement without impacting existing business code.
"""

from typing import Any
import structlog
from app.core.providers import get_ai_provider

logger = structlog.get_logger()

class LlamaClient:
    """
    Inference Client wrapper routing calls to abstract AIProvider.
    """

    def __init__(self):
        self.provider = get_ai_provider()

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Route generation to abstract provider."""
        return await self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Route JSON generation to abstract provider."""
        return await self.provider.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature
        )

    async def health_check(self) -> bool:
        """Verify endpoint connectivity."""
        try:
            # Send small validation check
            res = await self.generate("ping", max_tokens=5)
            return "content" in res
        except Exception:
            return False


# Singleton wrapper
_llama_client: LlamaClient | None = None

def get_llama_client() -> LlamaClient:
    """Return singleton proxy client."""
    global _llama_client
    if _llama_client is None:
        _llama_client = LlamaClient()
    return _llama_client
