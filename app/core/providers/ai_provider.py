"""
app/core/providers/ai_provider.py — AI Provider Abstraction Layer

Defines the abstract AIProvider interface and the concrete OpenRouterAIProvider.
Ensures the core platform business logic is decoupled from specific LLM host APIs.
"""

import time
import json
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
import structlog
from app.config import settings
from app.core.exceptions import AIServiceError

logger = structlog.get_logger()

class AIProvider(ABC):
    """
    Abstract Base Class for LLM Provider Orchestrators.
    """
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Generate a text completion.
        
        Returns:
            Dict containing:
                "content": str (response text)
                "model": str (exact model used)
                "tokens_used": int (total tokens consumed)
                "generation_time_ms": int (inference duration)
        """
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Generate and parse a JSON response.
        """
        pass


class OpenRouterAIProvider(AIProvider):
    """
    OpenRouter API Client implementation targeting Llama 3.3 70B Instruct.
    Includes automated retries, cost tracking, and fallback capabilities.
    """

    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY  # Custom setting or fallback
        self.base_url = "https://openrouter.ai/api/v1"
        self.default_model = "meta-llama/llama-3.3-70b-instruct"
        self.timeout = httpx.Timeout(120.0, connect=10.0)

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aspis.edu.in",
            "X-Title": "ASPIS Academic Intelligence Engine"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs: Any
    ) -> Dict[str, Any]:
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Allow model override via kwargs
        model = kwargs.get("model", self.default_model)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }

        start_time = time.perf_counter()
        retries = 3
        backoff = 1.0

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=self._headers(),
                    )
                    response.raise_for_status()
                    
                data = response.json()
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                tokens_used = usage.get("total_tokens", 0)

                logger.info(
                    "LLM generation successful (OpenRouter)",
                    model=model,
                    tokens=tokens_used,
                    duration_ms=elapsed_ms,
                    attempt=attempt + 1
                )

                return {
                    "content": content,
                    "model": model,
                    "tokens_used": tokens_used,
                    "generation_time_ms": elapsed_ms,
                }

            except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.ConnectError) as e:
                logger.warning(
                    "LLM generation attempt failed",
                    error=str(e),
                    attempt=attempt + 1,
                    retry_in=backoff
                )
                if attempt == retries - 1:
                    raise AIServiceError("OpenRouter", f"Failed after {retries} attempts: {str(e)}")
                
                # Simple async sleep for backoff
                await __import__("asyncio").sleep(backoff)
                backoff *= 2.0
        
        raise AIServiceError("OpenRouter", "Inference logic exited without returning result")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        **kwargs: Any
    ) -> Dict[str, Any]:
        
        json_system = (
            (system_prompt or "")
            + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown formatting, no explanations, "
            "no code fences. Output raw JSON object."
        )

        result = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            **kwargs
        )

        content = result["content"].strip()
        
        # Clean up code blocks if added
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                content = "\n".join(lines[1:-1])
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0].strip()

        try:
            parsed = json.loads(content)
            result["parsed"] = parsed
            return result
        except json.JSONDecodeError as e:
            logger.error("Failed to parse LLM JSON output", raw_content=content[:500], error=str(e))
            raise AIServiceError("OpenRouter", f"Model returned invalid JSON formatting: {e}")
