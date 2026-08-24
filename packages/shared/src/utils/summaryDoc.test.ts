// Run: node --experimental-strip-types packages/shared/src/utils/summaryDoc.test.ts
import assert from "node:assert";
import { parseInline, markdownToBlocks, summaryToTiptapDoc, tiptapDocToText, tiptapDocToMarkdown } from "./summaryDoc.ts";

let pass = 0;
const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log(`  [PASS] ${m}`); pass++; };

// Inline marks
const inl = parseInline("**Bold:** a *slanted* and `code` word");
ok(inl.some((n) => n.text === "Bold:" && n.marks?.[0].type === "bold"), "bold parsed");
ok(inl.some((n) => n.text === "slanted" && n.marks?.[0].type === "italic"), "italic parsed");
ok(inl.some((n) => n.text === "code" && n.marks?.[0].type === "code"), "code parsed");

// Blocks: bullet list + heading + paragraph
const blk = markdownToBlocks("## Title\n\nintro line\n- one\n- two\n- three");
ok(blk[0].type === "heading" && (blk[0].attrs?.level === 2), "heading block, level 2");
ok(blk.some((b) => b.type === "paragraph"), "paragraph block");
const list = blk.find((b) => b.type === "bulletList");
ok(!!list && list.content!.length === 3, "bullet list with 3 items");

// Ordered list
const ol = markdownToBlocks("1. first\n2. second");
ok(ol[0].type === "orderedList" && ol[0].content!.length === 2, "ordered list with 2 items");

// Round-trip a summary → doc → markdown, structure preserved
const doc = summaryToTiptapDoc({
  overview: "An **overview** paragraph.",
  sections: [
    { heading: "Chapter One", content: "Notes with a *point*.\n- bullet a\n- bullet b" },
    { heading: "Chapter Two", content: "More notes." },
  ],
});
ok(doc.type === "doc", "produces a doc node");
const headings = (doc.content ?? []).filter((n) => n.type === "heading");
ok(headings.length === 3, "Overview + 2 chapter headings = 3 heading nodes");
const md = tiptapDocToMarkdown(doc);
ok(md.includes("## Overview"), "markdown has Overview heading");
ok(md.includes("## Chapter One") && md.includes("## Chapter Two"), "markdown has both chapter headings");
ok(md.includes("**overview**"), "bold survives round-trip");
ok(md.includes("- bullet a") && md.includes("- bullet b"), "bullets survive round-trip");
const txt = tiptapDocToText(doc);
ok(txt.includes("Overview") && !txt.includes("##"), "plain text has no markdown markers");

// Empty summary → non-empty doc (editor never blank)
ok((summaryToTiptapDoc({}).content ?? []).length >= 1, "empty summary still yields a doc block");

console.log(`\nVERDICT: ALLE ASSERTS GROEN (${pass}/${pass})`);
