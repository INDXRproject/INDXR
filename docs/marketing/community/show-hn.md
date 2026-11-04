# Show HN — tekst (Khidr plaatst)

**Titel (≤80 tekens):**
Show HN: INDXR – turn YouTube lectures and recordings into a searchable library

**URL:** https://indxr.ai/?utm_source=hn

**Eerste reactie van Khidr (direct na plaatsen):**

Hi HN, I'm Khidr, a solo developer from the Netherlands. I built INDXR because I kept watching long lectures and podcasts and losing what was in them.

What it does: paste a YouTube link (or a whole playlist) or upload a recording, and you get a clean transcript with speaker labels and timestamps. YouTube captions are free and work without an account. For videos without captions, and for your own files, it transcribes with AI (AssemblyAI). Everything lands in a library you can search and group into collections, and you can export it as Markdown (with YAML frontmatter and timestamp links back to the video), SRT/VTT, CSV, JSON, or a chunked JSON meant for RAG pipelines.

Pricing is per minute with credits that don't expire, no subscription. I picked that because most people I talked to transcribe in bursts, and a monthly plan punishes that.

How I use it myself: I export lectures as Markdown into Obsidian and link to them from my own notes, so a two-hour talk becomes something I can search and quote from.

Stack, if you're curious: Next.js on Vercel, a FastAPI backend on Railway, Supabase, yt-dlp for captions, AssemblyAI for speech-to-text.

Honest status: it works and people use it, but nobody has paid yet, so I'm especially interested in what would make this worth paying for to you, and what's missing or broken. I'll be here answering.

---
Notities voor Khidr:
- Plaats op een dinsdag t/m donderdag tussen 15:00 en 17:00 (NL-tijd, = ochtend VS). Blijf de eerste 2–3 uur reacties beantwoorden.
- Vraag niemand om te upvoten (verboden, en HN detecteert het).
- Klopt een zin niet meer (bv. stack of prijs), pas hem aan vóór plaatsen.
