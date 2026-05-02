"""
Canonical language code normalisation for all incoming codes (yt-dlp,
AssemblyAI, YouTube Data API). All codes go through normalize_language_code()
before DB writes or cache lookups.

Canonical format: ISO 639-1 lowercase two-letter (en, nl, ar, ...).
"""
import logging
from typing import Optional

import langcodes

logger = logging.getLogger("indxr-lang")

# Edge cases that langcodes does not map automatically
_MANUAL_OVERRIDES: dict[str, str] = {
    "ar-orig": "ar",  # YouTube "original Arabic audio track" suffix
    "en-orig": "en",
}


def normalize_language_code(raw: Optional[str]) -> Optional[str]:
    """
    Normalise a language code to ISO 639-1 lowercase two-letter.
    Returns None for empty, unparseable, or unknown input.

    Handles: 'en', 'en-US', 'en_us', 'EN', 'ar-orig', 'nl', 'zh-Hans', etc.
    """
    if not raw or not isinstance(raw, str):
        return None
    raw_clean = raw.strip().lower()
    if not raw_clean:
        return None
    if raw_clean in _MANUAL_OVERRIDES:
        return _MANUAL_OVERRIDES[raw_clean]
    try:
        lang = langcodes.Language.get(raw_clean)
        code = lang.language  # ISO 639-1 or ISO 639-3
        if not code:
            logger.warning(f"normalize_language_code: no language code from '{raw}'")
            return None
        if len(code) == 2:
            return code
        # ISO 639-3 (three-letter) — attempt conversion to ISO 639-1
        mapped = langcodes.Language.get(code).language
        if mapped and len(mapped) == 2:
            return mapped
        logger.warning(f"normalize_language_code: no two-letter mapping for '{raw}' (got '{code}')")
        return None
    except Exception as e:
        logger.warning(f"normalize_language_code: could not parse '{raw}' ({e})")
        return None
