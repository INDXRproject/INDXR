// Editable-summary seed + serialize. The generated AI summary is {overview, sections[{heading,content}]}
// where overview/content are Markdown. The edited version lives in a Tiptap editor (mirroring the
// transcript's edited_content), so we need: (1) a seed = the generated summary as a Tiptap doc, and
// (2) serializers back to plain text / Markdown for the "Edited version" exports.
//
// This is a SMALL, deterministic Markdown subset — only what the summary actually emits: headings,
// unordered/ordered lists (rendered single-level; indentation is not preserved on the round-trip),
// blockquote, paragraphs, and inline **bold** / *italic* / `code`. No external markdown lib (none is
// installed) and no raw-HTML path (the content is model text). Plain JSON so it unit-tests under
// `node --experimental-strip-types`; the app casts the result to Tiptap's JSONContent.

export interface TNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TNode[];
  text?: string;
  marks?: { type: string }[];
}

const BOLD = "bold", ITALIC = "italic", CODE = "code";

/** Tokenise inline **bold**, *italic* / _italic_, `code` into Tiptap text nodes. Sequential scan;
 *  unmatched markers stay literal. Bold is checked before italic so `**x**` is not read as italics. */
export function parseInline(text: string): TNode[] {
  const out: TNode[] = [];
  let i = 0;
  let plain = "";
  const flush = () => { if (plain) { out.push({ type: "text", text: plain }); plain = ""; } };
  const emit = (t: string, mark: string) => { flush(); out.push({ type: "text", text: t, marks: [{ type: mark }] }); };

  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 1) { emit(text.slice(i + 2, end), BOLD); i = end + 2; continue; }
    }
    const c = text[i];
    if ((c === "*" || c === "_") && text[i + 1] !== c) {
      const end = text.indexOf(c, i + 1);
      if (end > i && text[end - 1] !== " ") { emit(text.slice(i + 1, end), ITALIC); i = end + 1; continue; }
    }
    if (c === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) { emit(text.slice(i + 1, end), CODE); i = end + 1; continue; }
    }
    plain += c;
    i++;
  }
  flush();
  return out.length ? out : [{ type: "text", text: text || " " }];
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const ULI_RE = /^\s*[-*]\s+(.*)$/;
const OLI_RE = /^\s*\d+\.\s+(.*)$/;

/** Markdown → array of Tiptap block nodes (headings, lists, blockquote, paragraphs). */
export function markdownToBlocks(md: string): TNode[] {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: TNode[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (!para.length) return;
    blocks.push({ type: "paragraph", content: parseInline(para.join(" ").trim()) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); continue; }

    const h = HEADING_RE.exec(line);
    if (h) { flushPara(); blocks.push({ type: "heading", attrs: { level: Math.min(3, h[1].length) }, content: parseInline(h[2].trim()) }); continue; }

    if (line.trim().startsWith(">")) {
      flushPara();
      blocks.push({ type: "blockquote", content: [{ type: "paragraph", content: parseInline(line.replace(/^\s*>\s?/, "")) }] });
      continue;
    }

    if (ULI_RE.test(line) || OLI_RE.test(line)) {
      flushPara();
      const ordered = OLI_RE.test(line);
      const re = ordered ? OLI_RE : ULI_RE;
      const items: TNode[] = [];
      while (i < lines.length && (ordered ? OLI_RE : ULI_RE).test(lines[i])) {
        const m = re.exec(lines[i])!;
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(m[1].trim()) }] });
        i++;
      }
      i--;
      blocks.push({ type: ordered ? "orderedList" : "bulletList", content: items });
      continue;
    }

    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

/** `[H:MM:SS]` / `[M:SS]` for a chapter start — same reading style the summary view shows, so the
 *  editable copy is a faithful picture of the generated summary (chapters WITH their timestamps). */
function chapterTimestamp(seconds?: number): string | null {
  if (seconds == null || seconds < 0) return null;
  const t = Math.floor(seconds);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The generated summary as a Tiptap doc — the SEED for the editable version. Overview under an
 *  "Overview" H2, then each chapter as an H2 heading (prefixed with its timestamp) + its notes. */
export function summaryToTiptapDoc(summary: { overview?: string; sections?: { heading: string; content: string; start_time?: number }[] }): TNode {
  const content: TNode[] = [];
  const overview = (summary?.overview || "").trim();
  if (overview) {
    content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Overview" }] });
    content.push(...markdownToBlocks(overview));
  }
  for (const sec of summary?.sections ?? []) {
    const ts = chapterTimestamp(sec.start_time);
    const headingText = `${ts ? `[${ts}] ` : ""}${(sec.heading || "").trim() || "Section"}`;
    content.push({ type: "heading", attrs: { level: 2 }, content: parseInline(headingText) });
    content.push(...markdownToBlocks(sec.content || ""));
  }
  if (!content.length) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

// ── Serializers (for the "Edited version" exports) ──────────────────────────────

function inlineText(nodes: TNode[] | undefined): string {
  return (nodes ?? []).map((n) => n.text ?? "").join("");
}
function inlineMarkdown(nodes: TNode[] | undefined): string {
  return (nodes ?? []).map((n) => {
    let t = n.text ?? "";
    for (const m of n.marks ?? []) {
      if (m.type === BOLD) t = `**${t}**`;
      else if (m.type === ITALIC) t = `*${t}*`;
      else if (m.type === CODE) t = `\`${t}\``;
    }
    return t;
  }).join("");
}

/** Tiptap doc → plain text (mirror of the transcript's edited .txt export). */
export function tiptapDocToText(doc: TNode | null | undefined): string {
  const out: string[] = [];
  for (const node of doc?.content ?? []) {
    if (node.type === "heading" || node.type === "paragraph") out.push(inlineText(node.content));
    else if (node.type === "bulletList" || node.type === "orderedList") {
      (node.content ?? []).forEach((li, idx) => {
        const body = (li.content ?? []).map((p) => inlineText(p.content)).join(" ");
        out.push(`${node.type === "orderedList" ? `${idx + 1}.` : "-"} ${body}`);
      });
    } else if (node.type === "blockquote") {
      out.push((node.content ?? []).map((p) => inlineText(p.content)).join(" "));
    } else if (node.content) out.push(inlineText(node.content));
  }
  return out.join("\n");
}

/** Tiptap doc → Markdown (mirror of the transcript's edited .md export). */
export function tiptapDocToMarkdown(doc: TNode | null | undefined): string {
  const out: string[] = [];
  for (const node of doc?.content ?? []) {
    if (node.type === "heading") out.push(`${"#".repeat((node.attrs?.level as number) || 2)} ${inlineMarkdown(node.content)}`);
    else if (node.type === "paragraph") out.push(inlineMarkdown(node.content));
    else if (node.type === "bulletList" || node.type === "orderedList") {
      (node.content ?? []).forEach((li, idx) => {
        const body = (li.content ?? []).map((p) => inlineMarkdown(p.content)).join(" ");
        out.push(`${node.type === "orderedList" ? `${idx + 1}.` : "-"} ${body}`);
      });
    } else if (node.type === "blockquote") {
      out.push((node.content ?? []).map((p) => `> ${inlineMarkdown(p.content)}`).join("\n"));
    } else if (node.content) out.push(inlineMarkdown(node.content));
  }
  return out.join("\n\n");
}
