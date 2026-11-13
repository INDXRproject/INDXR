"""ADR-111 (Zotero fase 1). Mirrors packages/shared/src/lib/citation.test.ts's APA assertion for
the backend's citeproc-py engine (used by mcp_server.py's get_source). citeproc-js and citeproc-py
are different engines consuming the SAME official CSL style files, so small punctuation
differences between the two engines are expected for MLA/Chicago/Harvard — only APA (the
get_source default) is asserted for an exact match here; run via check-playlist-invariants.sh."""

import citation

item = citation.build_csl_json(
    "t1",
    "Can Firas Zahabi Take Kevin Lee to the Next Level?",
    "Fight Game Analysis",
    "8YvEPC8irZY",
    "2018-03-12",
)
assert item["type"] == "motion_picture", item["type"]

expected_apa = (
    "Fight Game Analysis. (2018, March 12). Can Firas Zahabi Take Kevin Lee to the Next Level? "
    "[Video recording]. YouTube. https://youtu.be/8YvEPC8irZY"
)
actual_apa = citation.render_citation(item, "apa")
assert actual_apa == expected_apa, f"got: {actual_apa!r}\nexpected: {expected_apa!r}"
print(f"  ✓ APA (video): {actual_apa}")

upload = citation.build_csl_json("t2", "My recorded lecture", None, None, None)
assert upload["type"] == "song", upload["type"]
print(f"  ✓ csl-json type (upload): {upload['type']}")

for style in ("mla", "chicago", "harvard"):
    rendered = citation.render_citation(item, style)
    assert rendered, f"{style} rendered empty"
    print(f"  ✓ {style} (video) renders non-empty: {rendered}")

try:
    citation.render_citation(item, "nonexistent-style")
    raise AssertionError("expected ValueError for an unknown style")
except ValueError:
    print("  ✓ unknown style raises ValueError")

print("ALL_PASS")
