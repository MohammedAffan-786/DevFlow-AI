import json
import os
import re
from typing import Any

import httpx


class LLMProviderError(RuntimeError):
    """A provider request failed without exposing the configured API key."""


class LLMGateway:
    def __init__(self) -> None:
        self.api_key = os.getenv("OLAMA_API_KEY", "").strip()
        self.model = os.getenv("OLAMA_MODEL", "qwen3-coder:480b-cloud").strip()
        self.base_url = os.getenv("OLAMA_BASE_URL", "https://ollama.com").strip().rstrip("/")
        self.timeout = httpx.Timeout(90.0, connect=10.0)

    def is_available(self) -> bool:
        return bool(self.api_key and self.model and self.base_url)

    async def generate_completion(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 3000
    ) -> dict[str, Any]:
        if not self.is_available():
            raise LLMProviderError("Configure OLAMA_API_KEY, OLAMA_MODEL, and OLAMA_BASE_URL.")

        try:
            content = await self._ollama_completion(system_prompt, user_prompt, max_tokens)
        except LLMProviderError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise LLMProviderError("The configured Ollama request failed.") from exc

        parsed = self._parse_json(content)
        return {
            "status": "success",
            "provider": "ollama",
            "model": self.model,
            "content": content,
            "result": parsed,
            "findings": parsed.get("findings", []) if isinstance(parsed, dict) else [],
        }

    async def _ollama_completion(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "stream": False,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "options": {"num_predict": max_tokens},
            "format": "json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/chat", headers=headers, json=payload)
        if response.is_error:
            raise LLMProviderError(f"Ollama returned HTTP {response.status_code}.")

        data = response.json()
        if not isinstance(data, dict):
            raise LLMProviderError("Ollama returned an invalid response.")

        message = data.get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()

        response_text = data.get("response")
        if isinstance(response_text, str) and response_text.strip():
            return response_text.strip()

        raise LLMProviderError("Ollama returned no text output.")

    @staticmethod
    def _parse_json(content: str) -> Any:
        candidate = content.strip()
        if candidate.startswith("```"):
            candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", candidate, flags=re.IGNORECASE)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            return None
