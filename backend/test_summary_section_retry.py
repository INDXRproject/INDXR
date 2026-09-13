"""TAAK 5 (2026-09-13): stap-2 sectie-uitwerking slaat de same-model retry over bij een
finish_reason=max_tokens-truncatie (deterministische her-truncatie) en gaat direct naar de
Haiku-fallback. Andere faaloorzaken houden hun normale retry.
"""
import asyncio
from unittest.mock import patch

import pytest

import summary_pipeline as sp

pytestmark = pytest.mark.anyio

# Klein fragment (<150 woorden) → de _section_ok-ratiocheck wordt overgeslagen; alleen leeg/zin-einde telt.
TRANSCRIPT = [{"offset": 0.0, "duration": 5.0, "text": "one two three four five six seven eight nine ten"}]
SECTION = {"heading": "Topic", "description": "d", "start_time": 0, "end_time": 60}

TRUNCATED = "This section begins to explain the topic but the text is cut off mid"  # geen zin-einde
GOOD = "HEADING: Topic\n\nThis is a complete elaboration that ends properly."       # eindigt op '.'


def _make_gateway(calls):
    async def _fake(client, api_key, payload):
        model = payload["model"]
        calls.append(model)
        if model == sp.SECTION_MODEL:
            return {"content": TRUNCATED, "finish_reason": "max_tokens", "model": model}
        return {"content": GOOD, "finish_reason": "end_turn", "model": model}
    return _fake


async def test_max_tokens_skips_same_model_retry_and_uses_fallback():
    calls = []
    with patch.object(sp, "_gateway_call", new=_make_gateway(calls)):
        result = await sp._run_section(None, "key", asyncio.Semaphore(1), SECTION, "overview", TRANSCRIPT)

    # De verspilde same-model retry is overgeslagen: precies 2 calls (initieel Gemini + Haiku-fallback),
    # niet 3.
    assert calls == [sp.SECTION_MODEL, sp.SECTION_FALLBACK], calls
    assert result["recovery"] == "fallback"
    assert result["content"].strip()  # schone uitwerking van de fallback


async def test_non_truncation_failure_keeps_retry():
    """Een niet-truncatie-fail (mid-sentence met finish_reason='stop') houdt de normale same-model retry."""
    calls = []

    async def _fake(client, api_key, payload):
        model = payload["model"]
        calls.append(model)
        if model == sp.SECTION_MODEL:
            # eindigt mid-sentence maar NIET door max_tokens → geen deterministische her-truncatie
            return {"content": TRUNCATED, "finish_reason": "stop", "model": model}
        return {"content": GOOD, "finish_reason": "end_turn", "model": model}

    with patch.object(sp, "_gateway_call", new=_fake):
        result = await sp._run_section(None, "key", asyncio.Semaphore(1), SECTION, "overview", TRANSCRIPT)

    # Geen skip → alle drie de pogingen: Gemini, Gemini-retry, dan Haiku-fallback.
    assert calls == [sp.SECTION_MODEL, sp.SECTION_MODEL, sp.SECTION_FALLBACK], calls
    assert result["recovery"] == "fallback"
