import Link from "next/link"

// One shared pointer from docs pages to the library + Claude/ChatGPT connection (ADR-108, positioning
// 9-11: "your own sources in Claude and ChatGPT"). A plain ink-framed note in Stijl B, not a DocsCallout
// (those are reserved for money/data/time warnings). `lead` lets a page tailor the first sentence.
export function AskYourLibrary({ lead }: { lead?: string }) {
  return (
    <aside className="my-8 border-2 border-[var(--fg-strong)] border-l-[8px] bg-[var(--bg)] px-4 py-3.5">
      <p className="font-bold text-[var(--fg-strong)]">Ask Claude or ChatGPT about it</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--fg)]">
        {lead ?? "Everything you transcribe is kept in your library, with its source and a citation."} Connect the
        library to Claude or ChatGPT and the assistant answers from your own transcripts, with quotes and
        timestamps. Read-only, free on every account.{" "}
        <Link href="/docs/guides/ai-assistants" className="font-bold text-[var(--link)] hover:underline">
          How to connect
        </Link>
      </p>
    </aside>
  )
}
