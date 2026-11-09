import json
import os
import re
from typing import Any

import httpx


class LLMProviderError(RuntimeError):
    """A provider request failed without exposing the configured API key."""


class LLMGateway:
    def __init__(self) -> None:
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-6-astra").strip()
        self.anthropic_model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5").strip()
        self.timeout = httpx.Timeout(90.0, connect=10.0)

    def is_available(self) -> bool:
        if self.provider == "openai":
            return bool(self.openai_key)
        if self.provider == "anthropic":
            return bool(self.anthropic_key)
        return False

    async def generate_completion(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 3000
    ) -> dict[str, Any]:
        if not self.is_available():
            return {
                "status": "fallback",
                "provider": self.provider,
                "message": "No key is configured for the selected LLM_PROVIDER.",
                "content": "",
                "findings": [],
            }

        try:
            if self.provider == "openai":
                content = await self._openai_completion(system_prompt, user_prompt, max_tokens)
                model = self.openai_model
            elif self.provider == "anthropic":
                content = await self._anthropic_completion(system_prompt, user_prompt, max_tokens)
                model = self.anthropic_model
            else:
                raise LLMProviderError("LLM_PROVIDER must be either 'openai' or 'anthropic'.")
        except LLMProviderError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise LLMProviderError("The configured LLM provider request failed.") from exc

        parsed = self._parse_json(content)
        return {
            "status": "success",
            "provider": self.provider,
            "model": model,
            "content": content,
            "result": parsed,
            "findings": parsed.get("findings", []) if isinstance(parsed, dict) else [],
        }

    async def _openai_completion(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.openai_model,
            "instructions": system_prompt,
            "input": user_prompt,
            "max_output_tokens": max_tokens,
            "store": False,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)
        if response.is_error:
            raise LLMProviderError(f"OpenAI returned HTTP {response.status_code}.")

        data = response.json()
        output_text = data.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text.strip()

        text_parts: list[str] = []
        for item in data.get("output", []):
            for part in item.get("content", []):
                if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                    text_parts.append(part["text"])
        if not text_parts:
            raise LLMProviderError("OpenAI returned no text output.")
        return "\n".join(text_parts).strip()

    async def _anthropic_completion(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.anthropic_model,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
        if response.is_error:
            raise LLMProviderError(f"Anthropic returned HTTP {response.status_code}.")

        data = response.json()
        text_parts = [
            block["text"]
            for block in data.get("content", [])
            if block.get("type") == "text" and isinstance(block.get("text"), str)
        ]
        if not text_parts:
            raise LLMProviderError("Anthropic returned no text output.")
        return "\n".join(text_parts).strip()

    @staticmethod
    def _parse_json(content: str) -> Any:
        candidate = content.strip()
        if candidate.startswith("```"):
            candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", candidate, flags=re.IGNORECASE)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            return None
