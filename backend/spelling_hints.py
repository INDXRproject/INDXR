"""
Spelling-hints parsing (AssemblyAI keyterms_prompt) — single-source limits + normalisation.

Mirrors limits.py: plain constants, no app/FastAPI imports, so it can be unit-tested in isolation.
The TS mirror lives in packages/shared/src/lib/spellingHints.ts (frontend validation uses the exact
same numbers so a user never sees a client-accepted list that the backend then rejects).
"""
from typing import List, Optional, Union

# AssemblyAI accepts up to 1000 terms on Universal-3.5 Pro / 200 on Universal-2, max 6 words/term.
# We cap well below both ceilings — AssemblyAI's own guidance warns long lists work AGAINST
# accuracy (a term can overwrite a correctly-heard word; near-homophones collide), so "small and
# specific per recording" is the product design, not just a UI nicety.
MAX_KEYTERMS = 50
MAX_WORDS_PER_TERM = 6


def parse_keyterms(raw: Optional[Union[str, List[str]]]) -> List[str]:
    """
    Normalise a spelling-hints input into a clean term list.

    Accepts a comma-joined string (form fields: VideoTab/AudioTab/quick-quote) or a list of
    strings (JSON bodies: playlist extract). Trims whitespace, drops empties, dedupes
    case-insensitively (first-seen casing wins), and silently drops any single term with more
    than MAX_WORDS_PER_TERM words (AssemblyAI would reject it; happens upstream in the UI too, so
    this is defense-in-depth, not the primary validation surface).

    Raises ValueError if more than MAX_KEYTERMS terms remain after parsing — the UI already
    prevents this, a caller hitting it means a request bypassed that check.
    """
    if not raw:
        return []

    if isinstance(raw, str):
        candidates = raw.split(',')
    else:
        candidates = raw

    seen_lower = set()
    terms: List[str] = []
    for candidate in candidates:
        term = (candidate or '').strip()
        if not term:
            continue
        if len(term.split()) > MAX_WORDS_PER_TERM:
            continue
        key = term.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        terms.append(term)

    if len(terms) > MAX_KEYTERMS:
        raise ValueError(f"Too many spelling hints ({len(terms)}); maximum is {MAX_KEYTERMS}.")

    return terms
