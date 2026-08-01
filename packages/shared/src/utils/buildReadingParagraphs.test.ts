// Pure unit tests for buildReadingParagraphs — the reader's paragraph merge (the biggest
// reading win of the transcript redesign). Framework-loose, run:
//   node --experimental-strip-types packages/shared/src/utils/buildReadingParagraphs.test.ts
// Fixtures are fixed and deterministic so a future change to the thresholds turns this RED.
import assert from "node:assert/strict";
import {
  buildReadingParagraphs,
  READING_PARAGRAPH_CONFIG,
  type TranscriptItem,
  type ReadingParagraphConfig,
} from "./formatTranscript.ts";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log("  ✓", name); }

// Build a contiguous segment run: each `dur` seconds, no gaps unless `gapsAfter` says so.
function seg(offset: number, dur: number, text: string): TranscriptItem { return { offset, duration: dur, text }; }
function run(n: number, dur: number, textFor: (i: number) => string, startOffset = 0): TranscriptItem[] {
  const out: TranscriptItem[] = [];
  let off = startOffset;
  for (let i = 0; i < n; i++) { out.push(seg(off, dur, textFor(i))); off += dur; }
  return out;
}
const paraDurations = (segsTotal: number, offs: number[]) =>
  offs.map((o, i) => (i < offs.length - 1 ? offs[i + 1] - o : segsTotal - o));

// ── 1. Captions: break at a sentence boundary once past minBreakSec ──────────
test("captions break at the sentence boundary after minBreakSec (offsets 0/30/60)", () => {
  // 30 segs × 3s. Sentence-ends at index 9 and 19. minBreakSec=22, maxParaSec=45.
  const segs = run(30, 3, (i) => (i === 9 || i === 19 ? "this ends a thought." : "some ordinary caption words here"));
  const paras = buildReadingParagraphs(segs, { isAi: false });
  assert.equal(paras.length, 3);
  assert.deepEqual(paras.map((p) => p.startOffset), [0, 30, 60]);
});

// ── 2. Captions: early sentence-ends do NOT fragment into one-sentence paras ──
test("captions with a period every segment still merge (not 10 tiny paras)", () => {
  const segs = run(10, 3, () => "a short caption line here."); // every seg ends a sentence
  const paras = buildReadingParagraphs(segs, { isAi: false });
  // minBreakSec=22 → first break only once accumulated ≥22s (seg 8). So 2 paras, not 10.
  assert.equal(paras.length, 2);
  assert.deepEqual(paras.map((p) => p.startOffset), [0, 24]);
});

// ── 3. A real pause (gap > pauseBreakSec) always breaks ──────────────────────
test("a gap larger than pauseBreakSec starts a new paragraph", () => {
  const segs = [seg(0, 3, "first part no punctuation"), seg(8, 3, "second part after a five second gap")];
  const paras = buildReadingParagraphs(segs, { isAi: false });
  assert.equal(paras.length, 2);
  assert.deepEqual(paras.map((p) => p.startOffset), [0, 8]);
});

// ── 4. AI: no sentence-ends → bounded by the hard maxParaSec cap ─────────────
test("AI transcript (no seg-end punctuation) breaks on the hard cap, never a runaway", () => {
  const segs = run(20, 5, () => "assemblyai words without terminal punctuation at the boundary");
  const paras = buildReadingParagraphs(segs, { isAi: true });
  const total = 20 * 5;
  const durs = paraDurations(total, paras.map((p) => p.startOffset));
  assert.ok(paras.length >= 2, "should split a 100s AI transcript");
  // maxParaSec=38; break is checked before adding, so a paragraph is at most cap + one segment.
  const cap = READING_PARAGRAPH_CONFIG.ai.maxParaSec + 5;
  for (const d of durs) assert.ok(d <= cap, `paragraph ${d}s exceeds ${cap}s cap`);
});

// ── 5. Config is honoured (tunable) ──────────────────────────────────────────
test("a tighter maxParaSec produces more paragraphs (config is respected)", () => {
  const segs = run(20, 5, () => "assemblyai words without terminal punctuation");
  const tight: ReadingParagraphConfig = { pauseBreakSec: 2, captions: { minBreakSec: 22, maxParaSec: 45 }, ai: { maxParaSec: 10 }, maxChars: 500 };
  const wide = buildReadingParagraphs(segs, { isAi: true });
  const narrow = buildReadingParagraphs(segs, { isAi: true, config: tight });
  assert.ok(narrow.length > wide.length, `tight (${narrow.length}) should beat default (${wide.length})`);
});

// ── 6. HTML entities are decoded, empty segments skipped ─────────────────────
test("entities decoded, blank segments skipped", () => {
  // Contiguous timing (blank has no real duration) so no silence-gap break — this isolates
  // entity decoding + blank-skipping. (A blank WITH duration is a real pause; tested in #3.)
  const segs = [seg(0, 3, "Tom &amp; Jerry said &quot;hi&quot;."), seg(3, 0, "   "), seg(3, 3, "next line here")];
  const paras = buildReadingParagraphs(segs, { isAi: false });
  assert.equal(paras.length, 1);
  assert.ok(paras[0].text.includes("Tom & Jerry"));
  assert.ok(paras[0].text.includes('"hi"'));
  assert.ok(!/\s{2,}/.test(paras[0].text), "no double spaces from the blank segment");
});

// ── 7. Reading-quality band on a realistic mixed fixture ─────────────────────
test("realistic caption fixture yields a readable word band (no poem, no wall)", () => {
  // 60 segs × 3s (~30 words/para target); sentence-ends sprinkled every ~7 segs.
  const segs = run(60, 3, (i) => (i % 7 === 6 ? "and that wraps the point." : "steady caption text of five words"));
  const paras = buildReadingParagraphs(segs, { isAi: false });
  const words = paras.map((p) => p.text.split(/\s+/).filter(Boolean).length);
  const median = [...words].sort((a, b) => a - b)[Math.floor(words.length / 2)];
  assert.ok(median >= 30 && median <= 120, `median ${median} words out of band`);
  assert.ok(Math.max(...words) <= 180, `a paragraph of ${Math.max(...words)} words is a wall`);
  assert.ok(paras.length > 1);
});

// ── 8. Char guardrail bounds fast speakers (long text, short duration) ───────
test("maxChars caps a fast speaker before the duration cap (no word walls)", () => {
  // 200-char segments, only 3s each → duration cap never fires, char cap must.
  const long = "x".repeat(200);
  const segs = run(10, 3, () => long);
  const paras = buildReadingParagraphs(segs, { isAi: true });
  assert.ok(paras.length >= 3, "char cap should split dense fast speech");
  for (const p of paras) assert.ok(p.text.length <= READING_PARAGRAPH_CONFIG.maxChars + 210, `paragraph ${p.text.length} chars overruns the guardrail`);
});

// ── 9. Char cap does NOT cut mid-sentence when punctuation is reachable ───────
test("punctuated AI transcript: paragraphs end at sentence boundaries (no mid-sentence cut)", () => {
  // Periods land MID-segment (AssemblyAI style). 40 segs × 5s. The char cap must run on to the
  // next sentence end rather than slicing a sentence.
  const endsSentence = (s: string) => /[.!?]["')\]]*$/.test(s.trim());
  const segs: TranscriptItem[] = [];
  for (let i = 0; i < 40; i++) {
    segs.push(seg(i * 5, 5,
      i % 2 === 0
        ? "the speaker keeps going and going without stopping here yet at"
        : "all up to this point. then a brand new sentence starts again here"));
  }
  const paras = buildReadingParagraphs(segs, { isAi: true });
  const withPunct = paras.filter((p) => endsSentence(p.text)).length;
  // All but maybe the last paragraph should end cleanly on a sentence.
  assert.ok(withPunct >= paras.length - 1, `${withPunct}/${paras.length} paragraphs end on a sentence`);
  assert.ok(paras.length >= 3, "should split a 200s transcript");
  for (const p of paras) assert.ok(p.text.length <= READING_PARAGRAPH_CONFIG.maxChars + 80, `paragraph ${p.text.length} chars over guardrail`);
});

console.log(`\n${passed} passed`);
