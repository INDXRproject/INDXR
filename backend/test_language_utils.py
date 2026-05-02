"""Unit tests for language_utils.normalize_language_code."""
import pytest
from language_utils import normalize_language_code


@pytest.mark.parametrize("raw, expected", [
    ("en",       "en"),
    ("en-US",    "en"),
    ("en_us",    "en"),
    ("EN",       "en"),
    ("ar-orig",  "ar"),
    ("en-orig",  "en"),
    ("nl",       "nl"),
    ("zh-Hans",  "zh"),
    ("de",       "de"),
    ("fr-FR",    "fr"),
    # Edge cases that should return None
    ("",         None),
    (None,       None),
    ("invalid-junk-xyz", None),
])
def test_normalize(raw, expected):
    assert normalize_language_code(raw) == expected
