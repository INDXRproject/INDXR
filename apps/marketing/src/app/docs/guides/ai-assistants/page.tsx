import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { pageOg } from "@/lib/pageOg"
import { FREE_TIER } from "@indxr/shared/lib/pricing"

// The MCP connector (ADR-108): a read-only remote MCP server at app.indxr.ai/api/mcp, OAuth 2.1 with
// dynamic client registration. Tool list, limits and block sizes mirror backend/mcp_server.py.
// Claude steps: support.claude.com "Get started with custom connectors using remote MCP" (checked
// 2026-11-09). ChatGPT steps: developer mode, paid plans, web only (OpenAI moves these menus).
const MCP_URL = "https://app.indxr.ai/api/mcp"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/ai-assistants" },
  title: "Use INDXR in Claude & ChatGPT — INDXR.AI Docs",
  description:
    "Connect your INDXR library to Claude or ChatGPT. The assistant searches your transcripts and answers with quotes and timestamps. Read-only and free.",
  robots: { index: true, follow: true },
  ...pageOg("/docs/guides/ai-assistants"),
}

const CODE = "block overflow-x-auto border-2 border-[var(--fg-strong)] bg-[var(--bg-subtle)] px-4 py-3 font-mono text-sm text-[var(--fg-strong)]"
const STEPS = "list-decimal space-y-2 pl-6 text-[var(--fg-subtle)] leading-relaxed"
const P = "text-[var(--fg-subtle)] leading-relaxed"

export default function DocsAiAssistantsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Connect your INDXR library to Claude or ChatGPT",
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/ai-assistants",
    step: [
      { "@type": "HowToStep", position: 1, name: "Add a custom connector", text: `In Claude, open Customize → Connectors, choose Add custom connector and paste ${MCP_URL}.` },
      { "@type": "HowToStep", position: 2, name: "Sign in and allow", text: "Click Connect, sign in to INDXR and allow read access to your library." },
      { "@type": "HowToStep", position: 3, name: "Ask", text: "Turn the INDXR connector on in a chat and ask about your sources." },
    ],
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Claude & ChatGPT" },
          ]}
        />
        <h1 className="text-4xl font-bold leading-[1] tracking-[-0.04em] text-[var(--fg-strong)] mb-5 sm:text-5xl">Claude &amp; ChatGPT</h1>
        <DefinitionLeadOpening>
          Connect your INDXR library to an AI assistant, and next to everything it already knows and can look
          up, it can search your own transcripts and quote the passage and the minute it was said. The connection can only
          read your library, never change it, and it is free on every account.
        </DefinitionLeadOpening>

        <div className="my-8 border-2 border-[var(--fg-strong)] bg-[var(--bg)]">
          <p className="border-b-2 border-[var(--fg-strong)] bg-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[var(--fg-on-accent)]">
            Before you connect
          </p>
          <div className="px-4 py-4">
            <p className={P}>
              You need a free INDXR account with a few sources in it: a lecture playlist, the interviews behind an
              article, the talks you are drawing on for a book. YouTube captions cost nothing, and a new account
              comes with {FREE_TIER.WELCOME_CREDITS} credits for AI transcription.
            </p>
            <a
              href="/signup"
              className="mt-4 inline-flex h-11 items-center border-2 border-[var(--fg-strong)] bg-[var(--fg-strong)] px-5 font-bold text-[var(--bg)] hover:opacity-90"
            >
              Create a free account
            </a>
          </div>
        </div>

        <AnchorHeading as="h2">What the assistant can do</AnchorHeading>
        <ul className="list-disc space-y-2 pl-6 text-[var(--fg-subtle)] leading-relaxed">
          <li><strong>List your collections</strong>, with how many transcripts each holds.</li>
          <li><strong>Search your library</strong>: titles, channels and the transcript text itself. Each hit comes with a short excerpt, its timestamp and a link to that moment in the video.</li>
          <li><strong>Read a transcript</strong> in blocks of up to 30 minutes, with timestamps and speaker names. If you edited a transcript, it reads your edited version.</li>
          <li><strong>Look up the source</strong>: channel, link, length, language, publication date, and a ready APA 7 citation.</li>
          <li><strong>Read a summary</strong> you already made. It never creates one, so it never spends credits.</li>
        </ul>

        <AnchorHeading as="h2">What it cannot do</AnchorHeading>
        <p className={P}>
          It cannot add, edit or delete anything, spend credits, or see your account, payments or anyone
          else&apos;s library. It sees only what it asks for: the search results and transcript blocks it needs to
          answer you. Your audio never leaves INDXR, because there is none: audio is deleted after transcription.
        </p>

        <AnchorHeading as="h2">Connect Claude</AnchorHeading>
        <p className={P}>
          Works on every Claude plan (the Free plan allows one custom connector). Add it on claude.ai or in Claude
          Desktop; after that it also works in the Claude mobile apps.
        </p>
        <ol className={STEPS}>
          <li>Open <strong>Customize → Connectors</strong>.</li>
          <li>Click <strong>+ Add</strong>, then <strong>Add custom connector</strong>.</li>
          <li>Name it <strong>INDXR</strong> and paste this URL, then continue:</li>
        </ol>
        <code className={`${CODE} my-3`}>{MCP_URL}</code>
        <ol className={STEPS} start={4}>
          <li>Choose to sign in, click <strong>Add</strong>, then <strong>Connect</strong>. Sign in to INDXR and click <strong>Allow</strong>.</li>
          <li>In a chat, open <strong>+ → Connectors</strong> and turn INDXR on.</li>
        </ol>
        <p className={`${P} mt-3`}>On a Team or Enterprise plan, an owner may have to add the connector for the organisation first.</p>

        <AnchorHeading as="h2">Connect Claude Code</AnchorHeading>
        <p className={P}>Add the server once, then sign in from the MCP menu:</p>
        <code className={`${CODE} my-3`}>claude mcp add --transport http indxr {MCP_URL}</code>
        <p className={P}>
          Then run <code className="font-mono text-sm">/mcp</code> in Claude Code, choose indxr and sign in.
        </p>

        <AnchorHeading as="h2">Connect ChatGPT</AnchorHeading>
        <p className={P}>
          ChatGPT connects to your own servers through <strong>developer mode</strong>, on paid plans (Plus, Pro,
          Business, Enterprise, Edu) and on the web only. Developer mode is still a beta at OpenAI, and its menus move
          now and then: if a step looks different, OpenAI&apos;s help pages have the current path.
        </p>
        <ol className={STEPS}>
          <li>Open <strong>Settings → Apps &amp; Connectors → Advanced</strong> and switch on <strong>Developer mode</strong>.</li>
          <li>Back on the connectors page, click <strong>Create</strong>. Name it INDXR, paste the URL above and choose <strong>OAuth</strong> as authentication.</li>
          <li>Save, click <strong>Connect</strong>, sign in to INDXR and click <strong>Allow</strong>.</li>
          <li>In a new chat, open <strong>+ → Developer mode</strong> and select INDXR.</li>
        </ol>

        <AnchorHeading as="h2">Questions that work well</AnchorHeading>
        <p className={P}>Name the collection or the source when you can, and ask for quotes. For example:</p>
        <ul className="list-disc space-y-2 pl-6 text-[var(--fg-subtle)] leading-relaxed">
          <li>&ldquo;In my Death course, what does Kagan say about the soul? Quote him with timestamps.&rdquo;</li>
          <li>&ldquo;Turn lectures 6 to 10 of my Early Middle Ages collection into study notes, with a citation per section.&rdquo;</li>
          <li>&ldquo;Which of my sources mention Charlemagne? Give me the APA references.&rdquo;</li>
        </ul>

        <AnchorHeading as="h2">Limits</AnchorHeading>
        <p className={P}>
          Up to 60 requests a minute per account. Long transcripts are read in blocks of 15 minutes by default (30 at
          most), so the assistant fetches a long lecture in a few steps.
        </p>

        <AnchorHeading as="h2">Disconnect</AnchorHeading>
        <p className={P}>
          Remove the INDXR connector in Claude or ChatGPT and its access ends. To have every connection revoked at
          once, email <a href="mailto:support@indxr.ai" className="text-[var(--link)] hover:underline">support@indxr.ai</a>.
          What the assistant read during a chat is kept by that provider under its own terms.
        </p>

        <RelatedTopicsList
          topics={[
            { label: "Library", href: "/docs/guides/library" },
            { label: "Playlists", href: "/docs/guides/playlists" },
            { label: "What happens to my data", href: "/privacy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
