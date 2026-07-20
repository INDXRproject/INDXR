# Auth e-mail templates (transactioneel)

Gebrande HTML voor de **transactionele Supabase-auth-mails**, in de `send.indxr.ai`-broadcast-huisstijl
(zelfde tabel-layout, inline styles en hex-kleuren als `apps/app/src/lib/mail.ts`). Deze bestanden zijn
de **versiebeheerde bron van waarheid**; de live-kopie leeft in het Supabase-dashboard (auth-templates
zijn niet in de repo-runtime opgenomen). Wijzig hier → plak opnieuw in het dashboard.

## Bestanden

| Bestand | Supabase-template | Onderwerp (Subject) |
|---|---|---|
| `confirm-signup.html` | Authentication → Emails → **Confirm signup** | `Confirm your email address for INDXR.AI` |
| `reset-password.html` | Authentication → Emails → **Reset password** | `Reset your INDXR.AI password` |

**Niet aangepast:** Magic Link (niet gebruikt — geen `signInWithOtp` in de codebase), Invite, Change
Email Address, Reauthentication → blijven Supabase-defaults. Voeg hier een template toe zodra een flow
daadwerkelijk in gebruik komt.

## Harde eisen (niet onderhandelbaar)

1. **`{{ .ConfirmationURL }}` exact behouden.** Deze Go-template-variabele bouwt de PKCE-verify-link
   (`…/auth/v1/verify?token=…&type=…&redirect_to=…`) die na klik naar `/auth/callback?code=…` redirect,
   waar `exchangeCodeForSession` de sessie zet. Verwijderen/wijzigen = auth-flow breekt. Staat in elk
   template op **twee** plekken (de knop-`href` én de plaktekst-fallback) — beide behouden.
2. **Geen `<style>`-blokken, flexbox/grid, custom fonts of OKLCH.** E-mailclients (Gmail/Outlook/Apple
   Mail) strippen/negeren die. Alles is tabel-gebaseerd met inline styles en web-safe fonts; kleuren zijn
   hex (vertaald uit de OKLCH-tokens in `tokens.css` light-mode).
3. **Logo-URL absoluut:** `https://app.indxr.ai/logo/indxr-wordmark-white-transparent.png` (witte wordmark
   op de donkere `#141414`-headerbalk → leesbaar in light én dark mode; clients inverteren afbeeldingen niet).

## Toepassen (Khidr — dashboard)

Er is **geen Management-API-token** beschikbaar in deze omgeving en de Supabase-MCP heeft geen
auth-config-endpoint, dus CC kon de templates **niet** zelf live zetten. Handmatig plakken:

1. Supabase → project `INDXR` (`uivlvwcplcaixkzuiwsv`) → **Authentication → Emails**.
2. Per template hierboven: zet het **Subject** en plak de volledige HTML in het **Message (HTML)**-veld.
3. Bevestig dat `{{ .ConfirmationURL }}` intact staat na plakken.
4. Stuur een testmail (of doorloop de echte flow) zodra **custom SMTP** aan staat.

> **Alternatief (later):** toepasbaar via de Management API
> `PATCH /v1/projects/{ref}/config/auth` met de velden
> `mailer_subjects_confirmation` / `mailer_templates_confirmation_content` en
> `mailer_subjects_recovery` / `mailer_templates_recovery_content` (vereist een Supabase Personal
> Access Token).

## Afhankelijkheid

De echte **inbox-delivery-test** (mail komt aan via Resend, niet de Supabase-default-mailer) kan pas
**ná** het koppelen van custom SMTP (Resend) in Auth → SMTP Settings. Zie `roadmap/priorities.md` 1.30.
