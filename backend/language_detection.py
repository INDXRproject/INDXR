"""Single source for forward-running language detection over transcript TEXT.

Both the AI path (transcription_pipeline.py) and the caption path (youtube_utils.py) detect the
language the SAME way from here: the same responsible language set and the same amount of text.
Change the set HERE, not in each path — the next change must not re-guess. See ADR-099.
"""
import re
from typing import Optional, Tuple

from lingua import Language, LanguageDetectorBuilder

from language_utils import normalize_language_code

# The responsible set = lingua's 75 languages MINUS constructed and low-resource long-tail languages
# that are (a) implausible for this product's content — the transcription provider has only ever
# produced ar/en/he/id/ru — and (b) false-positive attractors for transliterated / loan-word-heavy
# English. With the full 75-set an English lecture ("Asalamu Alaikum ... 23rd juz") was confidently
# mislabelled Tagalog. Keep the exclusions and their reason in THIS one place. See ADR-099.
EXCLUDED_LANGUAGES = frozenset({
    "ESPERANTO", "LATIN",                                   # constructed / dead
    "GANDA", "SHONA", "SOTHO", "SWAHILI", "TSONGA",         # low-resource, implausible here,
    "TSWANA", "XHOSA", "YORUBA", "ZULU", "SOMALI",          # and FP-prone on transliterated English
    "AFRIKAANS", "BASQUE", "WELSH", "IRISH", "MAORI", "TAGALOG",
})
SUPPORTED_LANGUAGES = tuple(l for l in Language.all() if l.name not in EXCLUDED_LANGUAGES)
_detector = LanguageDetectorBuilder.from_languages(*SUPPORTED_LANGUAGES).build()

# Same text budget everywhere: the first 300 segments capped at 6000 characters — far more than the
# old 20-segment sample, whose thinness was one reason detection failed.
SAMPLE_SEGMENTS = 300
SAMPLE_CHARS = 6000
MIN_SAMPLE_WORDS = 30


def sample_text(transcript) -> str:
    texts = [s.get("text", "") for s in (transcript or []) if isinstance(s, dict)]
    return re.sub(r"\s+", " ", " ".join(texts[:SAMPLE_SEGMENTS])).strip()[:SAMPLE_CHARS]


def detect_language(transcript) -> Optional[str]:
    """Detect the language of the transcript TEXT (ISO-639-1 lower-case), or None when there is not
    enough usable text to be meaningful. This reads what the user reads — unlike an audio detector."""
    sample = sample_text(transcript)
    if len(sample.split()) < MIN_SAMPLE_WORDS:
        return None
    vals = _detector.compute_language_confidence_values(sample)
    if not vals:
        return None
    return vals[0].language.iso_code_639_1.name.lower()


def reconcile_language(provider_language, transcript) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Reconcile an audio-based PROVIDER language with a TEXT detection over the transcript.

    Agree  -> that value.
    Disagree -> the TEXT wins. It is what the user reads and exports; the provider hears audio and
                can be fooled (it once labelled an English lecture full of foreign terms 'Hebrew').
    Text yields nothing usable -> the PROVIDER wins.

    Returns (chosen, provider_norm, text) so the caller can persist BOTH when they disagree, keeping
    the disagreement visible. See ADR-099.
    """
    provider = normalize_language_code(provider_language)
    text = detect_language(transcript)
    chosen = text or provider
    return chosen, provider, text
