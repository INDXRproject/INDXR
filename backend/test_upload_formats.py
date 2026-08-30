"""
Sync-check: de backend-gehandhaafde upload-allowlist (audio_utils.SUPPORTED_FORMATS) moet exact gelijk
zijn aan de gedeelde fixture test-fixtures/upload_formats.json (die ook de TS-spiegel
packages/shared/src/lib/uploadFormats.ts UPLOAD_EXTENSIONS checkt via uploadFormats.test.ts). De
backend is de handhaver: validate_audio_file weigert alles buiten SUPPORTED_FORMATS. Deze twee lijsten
delen geen taal (Python set vs TS array) → zonder deze guard lopen ze uiteen zodra één laag wijzigt.

Als SET vergeleken (volgorde irrelevant). Divergentie -> exit 1 met een leesbare melding.
Run: venv/bin/python3 test_upload_formats.py
"""
import json
import os
import sys

from audio_utils import SUPPORTED_FORMATS

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "upload_formats.json")


def main():
    fx = set(json.load(open(FIXTURE))["extensions"])
    backend = set(SUPPORTED_FORMATS)

    missing = fx - backend   # in fixture, not enforced by backend
    extra = backend - fx     # enforced by backend, not in fixture

    if not missing and not extra:
        print(f"OK  SUPPORTED_FORMATS == fixture ({len(backend)} extensions)")
        print("ALL_PASS")
        return 0

    if missing:
        print(f"XX  in fixture but NOT in backend/audio_utils.py SUPPORTED_FORMATS: {sorted(missing)}")
    if extra:
        print(f"XX  in backend SUPPORTED_FORMATS but NOT in fixture: {sorted(extra)}")
    print("  <-- DIVERGENTIE: pas backend/audio_utils.py, packages/shared/src/lib/uploadFormats.ts EN "
          "test-fixtures/upload_formats.json samen aan.")
    print("1_FAIL")
    return 1


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
