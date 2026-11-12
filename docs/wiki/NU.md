# NU — wat loopt er, wat ligt bij Khidr (één pagina)

Elke chat/sessie werkt deze pagina bij als hij iets start, afrondt of een besluit van Khidr nodig heeft. Kort houden: één regel per onderwerp, details in de gelinkte pagina. Afgerond → regel weg (geschiedenis staat in `LOG.md`).
Bijgewerkt: 2026-11-12 15:30 (community-chat).

## Doel
Eerste betalende klanten. Nu 0. Criterium: terugkerende gebruikers uiterlijk 15-12 (`business/growth-live-status.md` §0).

## Product — loopt
- **Sentry 11/12-11:** ±8 nieuwe issues `YT-DLP-AUDIO final_fail` (AI-transcriptie kan de audio niet downloaden), sinds 11-11 22:11. Mogelijk tests van de playlist-chat, mogelijk proxy/YouTube. Moet de playlist-chat bekijken.
- **Spelling hints (ADR-109):** live 11-11, 3 bugs gefixt 12-11. Andere chat bezig met toepassen + review.
- **Playlists:** andere chat lost problemen op. Bekend open: botcheck bij 3 parallelle playlists (`roadmap/priorities.md`, "Gevonden 9-11").
- **Google-login voor niet-eigenaren:** onbewezen (0 externe signups sinds 7-11).

## Product — idee, wacht op Khidr
- **Captions → AI-upsell zichtbaar maken** (`roadmap/product-gaps-2026-11-04.md`, gat 2).
- **Zotero + meerdere citatiestijlen** (gat 3; plan in `roadmap/cc-prompt-2026-11-12-zotero-citations.md`).

## Marketing — loopt
- **Claude-directory:** live sinds 11-11.
- **Hacker News (`sinbadbuilds`):** 2 reacties geplaatst 12-11. Show HN vroegst di 17-11 of do 19-11, 15–17 u (`marketing/community/show-hn.md`).
- **Obsidian-forum:** account aanmaken (Khidr), concepten in `marketing/community/drafts/2026-11-12.md`.
- **Dagelijkse community-ronde:** 13:41, concepten in `marketing/community/drafts/`.
- **Directories:** alleen gratis (besluit Khidr 12-11: nergens voor betalen). SaaSHub ingediend, Peerlist-profiel staat, AlternativeTo live. Uneed, There's An AI For That, Toolify, Peerlist Launchpad: geschrapt.
- **Product Hunt:** na redesign; check 25-11.

## Ligt bij Khidr (besluit of actie)
- Zotero/citatiestijlen: ja/nee, en welke fase eerst.
- Stripe-mail 10-11: vanaf 20-11 toont het dashboard secret keys niet meer; bestaande keys blijven werken. Alleen actie als je een key ergens anders nodig hebt dan in Vercel/Railway.
- Obsidian-forumaccount + avatar (`marketing/social/sinbad-avatar-512.png`).

## Toegang per chat (wat kan een chat zelf zien)
- **Geplande community-chat (cloud):** repo (code + docs, push), contact@-mailbox, INDXR-bibliotheek (MCP, lezen), HN en Obsidian-forum lezen. **Niet:** PostHog-INDXR (connector hangt aan project Zwart op Wit), Supabase, Railway, Vercel, Stripe, Sentry-dashboard, Chrome, Reddit, Khidrs computer.
- Cijfers (signups, betalingen) komen dus uit een chat op Khidrs computer of met Supabase-toegang.
