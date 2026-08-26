"""Forward-running language detection (ADR-099): the responsible set detects languages outside the
old 13, and the reconcile rule lets the transcript text overrule an audio misdetection."""
from language_detection import detect_language, reconcile_language, EXCLUDED_LANGUAGES, SUPPORTED_LANGUAGES

# Russian is OUTSIDE the old 13-language set — it used to be dropped to NULL. Real Russian text.
RUSSIAN = [{"text": (
    "Это видео об управлении глаголов без предлогов в немецком языке. Некоторые считают эту тему "
    "очень сложной, но на самом деле всё гораздо проще, если понять основные правила и запомнить "
    "несколько важных примеров из повседневной речи и письма."
)}]

# English lecture with foreign (Hebrew/Arabic) terms — the kind of audio the provider misreads.
ENGLISH_HEBREW = [{"text": (
    "And they're so evil. Why did Hashem let all these evil people be so rich and the good people "
    "are struggling so much to survive? I told her I speak about it almost in every one of my "
    "lectures over the years and years, and the answer is always the same."
)}]

# English with transliterated Arabic — the text the full 75-set mislabelled Tagalog.
ENGLISH_TRANSLITERATED = [{"text": (
    "Asalamu Alaikum Quran Weekly. Today inshAllah we're on the 23rd juz and Surat Sad, the 38th "
    "surah of the Quran. We're going to take a few lessons from the story of Dawud alayhi salam. "
    "Part of this conversation is that we in Islam have great respect for the Prophets."
)}]


def test_russian_outside_old_13_is_detected():
    assert detect_language(RUSSIAN) == "ru"


def test_responsible_set_excludes_tagalog_and_keeps_english():
    assert "TAGALOG" in EXCLUDED_LANGUAGES
    assert detect_language(ENGLISH_TRANSLITERATED) == "en"
    # broader than the old 13, narrower than all 75
    assert 13 < len(SUPPORTED_LANGUAGES) < 75


def test_too_short_text_returns_none():
    assert detect_language([{"text": "hello there friend"}]) is None
    assert detect_language([]) is None


def test_reconcile_agree_uses_the_value():
    chosen, provider, text = reconcile_language("ru", RUSSIAN)
    assert (chosen, provider, text) == ("ru", "ru", "ru")


def test_reconcile_disagree_text_wins_and_keeps_provider():
    # Provider (audio) heard Hebrew; the text is English → English wins, Hebrew is kept for the record.
    chosen, provider, text = reconcile_language("he", ENGLISH_HEBREW)
    assert chosen == "en"
    assert provider == "he"
    assert text == "en"


def test_reconcile_no_provider_uses_text():
    chosen, provider, text = reconcile_language(None, RUSSIAN)
    assert chosen == "ru" and provider is None and text == "ru"


def test_reconcile_no_usable_text_uses_provider():
    chosen, provider, text = reconcile_language("en", [{"text": "hi"}])
    assert chosen == "en" and provider == "en" and text is None


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok", name)
