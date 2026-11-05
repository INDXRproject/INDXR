# Redesign stijl B — uitrolchecklist (besluit Khidr 2026-11-05)

Stijl gekozen: **B "Poster"**. Wit, zwart, amber `#ffb000`, Space Grotesk + IBM Plex Mono, harde randen van 2px. Mockups staan in het design-canvas (pagina's "Drie stijlen" en "B — app"). Het logo en het credit-icoon worden opnieuw ontworpen; de opties staan in `logo-opties.png` en de keuze ligt bij Khidr.

Alles hieronder hoort bij de redesign. Een punt is pas af als het in productie is gecontroleerd.

## Logo (nieuw, overal vervangen)
- [ ] Logo-bestanden: horizontaal, alleen het beeldmerk en alleen het woordmerk, elk in zwart op wit, wit op zwart en transparant. SVG met de tekst omgezet naar paden, en PNG. Gaat naar `apps/*/public/logo/`.
- [ ] Favicons in beide apps: `favicon.ico`, `favicon.svg`, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192/512.png`, en `site.webmanifest` controleren.
- [ ] `packages/shared/src/components/Header.tsx` (marketing-header).
- [ ] `apps/app/src/components/AppTopbar.tsx` (app-kopbalk).
- [ ] `apps/app/src/app/transcribe/page.tsx` (merkbalk van de balie).
- [ ] `apps/app/src/app/unsubscribe/page.tsx`.
- [ ] `apps/marketing/src/app/signup/page.tsx`.
- [ ] OG-afbeelding `apps/marketing/public/og-default.jpg`, plus de openGraph-verwijzingen in de layouts.
- [ ] Organization-schema op de homepage: `logo` wijst nu naar `apple-touch-icon.png`. Na de wissel controleren met de Rich Results Test.

## E-mails (opmaak + logo)
- [ ] `apps/app/src/lib/mail.ts`: transactionele mails via Resend.
- [ ] `backend/mailer.py`: mails die de backend verstuurt.
- [ ] `docs/email-templates/confirm-signup.html` en `reset-password.html`. Dit zijn de Supabase Auth-templates: in de repo bijwerken én in Supabase Dashboard → Auth → Email Templates zetten.
- [ ] Mailopmaak naar stijl B: witte achtergrond, zwarte tekst, amber knop met zwarte rand. Testen in Gmail (web en mobiel), Outlook en Apple Mail.

## Credit-icoon
- [ ] `packages/shared/src/components/icons/HexagonCreditIcon.tsx` en `apps/app/public/credit-coin.png` vervangen door het gekozen icoon (C1–C4).
- [ ] Pakketafbeeldingen `public/packages/*.webp` (schatkisten) vervangen door een vormgeving in stijl B.

## Opruimen
- [ ] AlternativeTo-badge uit de footer halen (`packages/shared/src/components/Footer.tsx`, `/badges/alternativeto-badge-*.svg`). Besluit Khidr 2026-11-05. De `sameAs`-link in het Organization-schema blijft staan.
- [ ] Bekijken of `AlternativeToNudge` in de bibliotheek blijft. Dat is een aparte beslissing; de badge-beslissing gaat alleen over de footer.

## Buiten de repo (zelfde logo, zelfde dag)
- [ ] Stripe Checkout-branding: logo, icoon en merkkleur (Stripe Dashboard → Settings → Branding).
- [ ] Google OAuth-toestemmingsscherm: logo.
- [ ] Vermeldingen op AlternativeTo en Product Hunt, en social-profielen.
- [ ] Resend: weergavenaam en logo van de afzender, indien ingesteld.
