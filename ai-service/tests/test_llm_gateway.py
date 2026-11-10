import json

import httpx
import pytest

from app.services.llm_gateway import LLMGateway, LLMProviderError


@pytest.mark.asyncio
async def test_generate_completion_sends_olama_credentials_and_parses_findings(monkeypatch):
    monkeypatch.setenv("OLAMA_API_KEY", "test-token")
    monkeypatch.setenv("OLAMA_BASE_URL", "https://ollama.test")
    monkeypatch.setenv("OLAMA_MODEL", "test-model")

    captured: dict[str, object] = {}

    def handle_request(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers["Authorization"]
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"message": {"content": '{"findings": []}'}})

    original_async_client = httpx.AsyncClient
    transport = httpx.MockTransport(handle_request)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original_async_client(transport=transport, **kwargs),
    )

    result = await LLMGateway().generate_completion("system", "review", max_tokens=123)

    assert captured["url"] == "https://ollama.test/api/chat"
    assert captured["authorization"] == "Bearer test-token"
    assert captured["payload"] == {
        "model": "test-model",
        "stream": False,
        "system": "system",
        "messages": [{"role": "user", "content": "review"}],
        "options": {"num_predict": 123},
        "format": "json",
    }
    assert result["provider"] == "ollama"
    assert result["model"] == "test-model"
    assert result["findings"] == []


@pytest.mark.asyncio
async def test_generate_completion_requires_olama_api_key(monkeypatch):
    monkeypatch.delenv("OLAMA_API_KEY", raising=False)

    with pytest.raises(LLMProviderError, match="OLAMA_API_KEY"):
        await LLMGateway().generate_completion("system", "review")
