# Beslissing 004: DeepSeek V3 voor AI Summarization

**Status:** Geaccepteerd  
**Datum:** 2025-03 (Phase G)  
**Gerelateerde code:** `backend/main.py:1103-1231`

---

## Context

INDXR.AI biedt AI-samenvatting van transcripten als premium feature (kost 1 credit). De backend stuurt de volledige transcript-tekst naar een LLM en vraagt om een JSON-response met `text` (samenvattingsparagraaf) en `action_points` (array van key takeaways).

De keuze van het LLM heeft directe impact op kosten per transactie en daarmee op winstgevendheid.

---

## Beslissing

**DeepSeek V3** (`deepseek-chat` model) aanroepen via de DeepSeek Chat Completions API.

Endpoint: `https://api.deepseek.com/chat/completions`  
Auth: `DEEPSEEK_API_KEY` env var  
Timeout: 120 seconden  
Response format: `{"type": "json_object"}` voor gestructureerde output

System prompt:
```
"You are a helpful assistant that summarizes transcripts. 
Output JSON with two keys: 'text' (a summary paragraph) and 
'action_points' (an array of strings representing key takeaways). 
Let the length be determined by the content."
```

---

## Rationale

**Kostenvergelijking (per 1M tokens, input/output):**

| Model | Input | Output | Geschikt? |
|-------|-------|--------|-----------|
| GPT-4o | ~$5 | ~$15 | Duur |
| GPT-4o mini | ~$0.15 | ~$0.60 | Redelijk |
| Claude Sonnet | ~$3 | ~$15 | Duur |
| **DeepSeek V3** | ~$0.27 | ~$1.10 | Goedkoop |
| DeepSeek Chat | ~$0.14 | ~$0.28 | Zeer goedkoop |

Voor samenvatting-taken (geen redeneren, geen code) is DeepSeek V3 kwalitatief vergelijkbaar met GPT-4o maar 10-50x goedkoper. 1 credit = 1 samenvatting; bij EUR 0.07 credit-waarde (1/15 van €1.99) moet de API-aanroep significant minder dan €0.07 kosten.

**JSON response mode:**
DeepSeek ondersteunt `response_format: json_object`, waardoor parsing robuust is en hallucinated text buiten JSON-structuur wordt voorkomen.

**Refund mechanisme:**
Bij elke failure (API down, parse error, timeout) wordt automatisch 1 credit teruggestort via `add_credits()`. Dit garandeert dat gebruikers nooit betalen voor een mislukte samenvatting.

---

## Consequenties

**Voordelen:**
- Significant lagere kosten vs. GPT-4 bij vergelijkbare kwaliteit voor summarization
- Snelle latency voor chat-modellen
- JSON mode maakt response parsing betrouwbaar

**Trade-offs:**
- Externe afhankelijkheid op DeepSeek (Chinees bedrijf; GDPR-overwegingen voor EU-gebruikers)
- Geen streaming (120s timeout voor lange transcripten)
- `deepseek-chat` model kan wijzigen; model ID is hardcoded

**Toekomstig:**
- `TODO: model selector` op regel 1173 — BYOK (Bring Your Own Key) feature gepland waarbij gebruikers eigen API keys kunnen invullen voor OpenAI/Anthropic/DeepSeek
