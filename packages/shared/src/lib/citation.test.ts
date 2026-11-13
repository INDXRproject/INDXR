// ADR-111 (Zotero fase 1). Checks citeproc-js's output against the official APA 7th/MLA 9th/
// Chicago 18th (author-date)/Harvard ("Cite Them Right" 12th) style guides, hand-verified once —
// not against our own string-building logic (there isn't any; citeproc-js does the rendering).
// No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/citation.test.ts
// scripts/check-playlist-invariants.sh runs this (and the Python mirror, backend/test_citation.py).
import assert from "node:assert/strict"
import { buildCslJson, renderCitation, buildRis, buildBibLatex, buildCitekey } from "./citation.ts"

let passed = 0
function check(name: string, actual: unknown, expected: unknown) {
  assert.equal(actual, expected, `${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  console.log(`  ✓ ${name}`)
  passed++
}

const video = buildCslJson("t1", {
  title: "Can Firas Zahabi Take Kevin Lee to the Next Level?",
  channel: "Fight Game Analysis",
  videoId: "8YvEPC8irZY",
  publishedAt: "2018-03-12",
})
check("csl-json type (video)", video.type, "motion_picture")
check("csl-json URL (video)", video.URL, "https://youtu.be/8YvEPC8irZY")

check(
  "APA (video)",
  renderCitation(video, "apa").plain,
  "Fight Game Analysis. (2018, March 12). Can Firas Zahabi Take Kevin Lee to the Next Level? [Video recording]. YouTube. https://youtu.be/8YvEPC8irZY",
)
check(
  "MLA (video)",
  renderCitation(video, "mla").plain,
  "Fight Game Analysis. Can Firas Zahabi Take Kevin Lee to the Next Level? YouTube, 2018, https://youtu.be/8YvEPC8irZY.",
)
check(
  "Chicago (video)",
  renderCitation(video, "chicago").plain,
  "Fight Game Analysis. 2018. Can Firas Zahabi Take Kevin Lee to the Next Level? YouTube. https://youtu.be/8YvEPC8irZY.",
)
// Harvard includes an "(Accessed: <today>)" clause — only check the stable prefix.
assert.ok(
  renderCitation(video, "harvard").plain.startsWith(
    "Fight Game Analysis (2018) Can Firas Zahabi Take Kevin Lee to the Next Level? YouTube. Available at: https://youtu.be/8YvEPC8irZY (Accessed:",
  ),
  "Harvard (video) prefix",
)
console.log("  ✓ Harvard (video) prefix")
passed++

check("APA (video) title is italic in HTML", renderCitation(video, "apa").html.includes("<i>Can Firas Zahabi"), true)

const upload = buildCslJson("t2", { title: "My recorded lecture", channel: null, videoId: null, publishedAt: null })
check("csl-json type (upload)", upload.type, "song")
check("APA (upload, undated)", renderCitation(upload, "apa").plain, "Unknown. (n.d.). My recorded lecture [Audio recording].")

check("RIS TY (video)", buildRis(video).split("\n")[0], "TY  - VIDEO")
check("RIS TY (upload)", buildRis(upload).split("\n")[0], "TY  - SOUND")

const citekey = buildCitekey({ channel: "Fight Game Analysis", title: video.title as string, publishedAt: "2018-03-12" })
check("citekey", citekey, "fightgameanalysis2018can")
check("BibLaTeX entry type (video)", buildBibLatex(video, citekey).split("{")[0], "@video")
check("BibLaTeX entry type (upload)", buildBibLatex(upload, "x").split("{")[0], "@audio")

console.log(`${passed} passed`)
