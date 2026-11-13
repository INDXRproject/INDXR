"""Citation rendering for the MCP get_source tool (ADR-111). Mirrors
packages/shared/src/lib/citation.ts in Python using citeproc-py against the SAME official CSL
style files (csl_styles/*.csl — copies of packages/shared/src/lib/csl-styles/*.csl; the backend
Docker build context is backend/ only, so it can't reach packages/shared at build time). Only
rendering is ported here — RIS/BibLaTeX/citekey export lives in the Next.js app (file export is a
browser-facing feature, not something an MCP tool needs)."""

import os
from typing import Optional

from citeproc import Citation, CitationItem, CitationStylesBibliography, CitationStylesStyle, formatter
from citeproc.source.json import CiteProcJSON

CITATION_STYLES = ("apa", "mla", "chicago", "harvard")
_STYLES_DIR = os.path.join(os.path.dirname(__file__), "csl_styles")
_style_cache: dict[str, CitationStylesStyle] = {}


def _get_style(style: str) -> CitationStylesStyle:
    if style not in _style_cache:
        _style_cache[style] = CitationStylesStyle(os.path.join(_STYLES_DIR, f"{style}.csl"), validate=False)
    return _style_cache[style]


def build_csl_json(
    item_id: str,
    title: str,
    channel: Optional[str],
    video_id: Optional[str],
    published_at: Optional[str],
) -> dict:
    """Same shape/type-mapping as buildCslJson() in citation.ts."""
    item: dict = {
        "id": item_id,
        "type": "motion_picture" if video_id else "song",
        "title": title,
        "author": [{"literal": (channel or "").strip() or ("Unknown channel" if video_id else "Unknown")}],
    }
    if published_at:
        parts = published_at.split("-")
        if len(parts) == 3:
            item["issued"] = {"date-parts": [[int(parts[0]), int(parts[1]), int(parts[2])]]}
    if video_id:
        item["URL"] = f"https://youtu.be/{video_id}"
        item["publisher"] = "YouTube"
    return item


def render_citation(item: dict, style: str = "apa") -> str:
    """Plain-text bibliography entry for `item` in one of CITATION_STYLES. Raises ValueError for
    an unknown style (callers should validate against CITATION_STYLES first for a clean 4xx)."""
    if style not in CITATION_STYLES:
        raise ValueError(f"Unknown citation style: {style}")
    source = CiteProcJSON([item])
    bib = CitationStylesBibliography(_get_style(style), source, formatter.plain)
    citation = Citation([CitationItem(item["id"])])
    bib.register(citation)
    bib.cite(citation, lambda w: None)
    return "\n".join(str(entry) for entry in bib.bibliography())
