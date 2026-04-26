# Beslissing 024: Anti-Abuse op Welcome Credits

**Status:** Geaccepteerd
**Datum:** 2026-04-26
**Gerelateerde code:** Aanpassing van `claim_welcome_reward` RPC, nieuwe verificatie-flow in signup (`src/app/auth/`), nieuwe Cloudflare Turnstile integratie, eventueel nieuwe `email_verifications` tabel of velden in `profiles`

---

## Context

ADR-013 vastgelegd: 25 welcome credits gratis bij signup. Industry-data (gepubliceerd door Stripe Radar, Auth0 fraud reports) toont dat ~33% van freemium-signups disposable email gebruikt — gratis credits zonder verificatie zijn een **abuse-magneet**.

Verwachte abuse-patterns voor INDXR.AI bij launch:

- **Disposable email-services** (mailinator.com, 10minutemail, ~52k bekende domeinen via github.com/disposable/disposable)
- **Throwaway accounts** voor herhaalde 25-credit grabs
- **Bot-script-mass-signups** (geautomatiseerde signup zonder mens)
- **Same-device multiple accounts** (één persoon die handmatig 50 accounts maakt)

Bij launch is dit een **directe kostenpost**: elke abuse-account verbruikt potentieel 25 credits aan AssemblyAI-transcriptie zonder enige conversie naar betaald gebruik. Bij 25 credits = 25 minuten AssemblyAI ≈ $0,09 directe kosten + proxy-bandbreedte. Bij 1.000 fake signups in week 1 is dat $90+ verlies plus reputatieschade als we daarna rate-limits moeten verstrakken.

---

## Beslissing

**Vier-laagse anti-abuse op welcome credits:**

1. **Email-verificatie verplicht** vóór credits-toekenning
2. **Disposable email blocklist** check bij signup (github.com/disposable/disposable, ~52k domains)
3. **Cloudflare Turnstile** op signup form (gratis, vervangt CAPTCHA, privacy-first)
4. **Device fingerprint hash** gekoppeld aan account (één set welcome credits per device)

**Welcome credits worden pas toegekend NA email-verificatie** in plaats van bij account-aanmaak. Dit is een verandering ten opzichte van de huidige flow waarin `claim_welcome_reward` direct na signup wordt aangeroepen.

---

## Rationale

### Waarom vier lagen, niet één

Elke laag pakt een ander abuse-vector aan en geen enkele laag dekt alle vectoren:

- **Email-verificatie alleen** → faalt tegen real-but-disposable emails (Gmail aliases, `+`-addressing, catch-all domeinen)
- **Disposable blocklist alleen** → faalt tegen niet-gelistede disposable services en nieuwe disposable-providers
- **Turnstile alleen** → faalt tegen handmatige abuse (één mens met 50 echte emails)
- **Device fingerprint alleen** → faalt tegen VPN/incognito/verschillende devices

De combinatie raakt naar schatting 95%+ van bot-abuse en maakt handmatige abuse economisch onaantrekkelijk (te veel handelingen per 25 credits).

### Waarom Cloudflare Turnstile (niet reCAPTCHA)

- **Geen Google-tracking** (privacy-first, past bij PostHog cookieless mode in priorities.md taak 1.18)
- **Vrijwel onzichtbaar voor echte users** — geen "klik op alle bushaltes"-puzzles meer
- **Gratis tot 1M requests/maand** — INDXR.AI passeert die limiet pas bij massive scale
- **Bewezen effectief tegen automated signups** in productie bij vergelijkbare SaaS

### Waarom email-verificatie API (Kickbox of Clearout) náást blocklist

De disposable-blocklist (statische github lijst) vangt bekende disposable-services. Maar emails-verificatie API's detecteren ook:

- **Catch-all email patterns** (alle adressen op een domein vangen mail — vaak verdacht)
- **Recent-aangemaakte domeinen** (verdacht patroon, vaak voor abuse)
- **Role-based addresses** (`admin@`, `info@`, `no-reply@` — meestal niet legitieme persoonlijke accounts)
- **Soft-bounce risico** (email die syntactisch klopt maar niet bestaat)

Kosten: ~$0,008 per check. Bij 1.000 signups/maand = $8 — verwaarloosbaar.

### Waarom device fingerprint en niet IP-blocking

IP-blocking is fragiel:

- **Mobile networks** delen IP's via NAT — één geblokkeerd IP raakt honderden legitieme users
- **Carrier-grade NAT** maakt IP-rate-limiting bij scale onbruikbaar
- **VPN/Tor** maakt IP-blocking triviaal te omzeilen

Device fingerprint hash (browser-based: canvas-rendering, geïnstalleerde fonts, timezone, screen-resolution, plugin-set) is meer specifiek aan het apparaat zelf en privacy-acceptabel als gehasht (geen ruwe fingerprint opgeslagen, alleen SHA-256 van de combinatie).

### Waarom credits NA verificatie in plaats van direct

**Huidige flow (ADR-013):** account aanmaken → `claim_welcome_reward()` → credits direct beschikbaar → email-verificatie later (optioneel).

**Nieuwe flow:** account aanmaken → email verificeren via link → `claim_welcome_reward()` getriggerd → credits beschikbaar.

Dit voorkomt het structurele patroon "ik maak account, gebruik 25 credits, verifieer nooit, gooi account weg". UX-impact is één extra klik op een email-link — standaard pattern, gebruikers verwachten dit.

---

## Architectuur

```
Signup form:
1. Email + password input
2. Cloudflare Turnstile widget (verifieer mens)
3. Submit:
   a. Disposable email blocklist check (instant, in-memory)
   b. Email-verificatie API call (Kickbox/Clearout)
   c. Reject met duidelijke message bij fail
   d. Anders: maak Supabase account aan
   e. Sla device fingerprint hash op in profiles tabel
4. Verify-link in email (Supabase Auth standaard)
5. User klikt link → Supabase verifieert email → trigger claim_welcome_reward(user_id)
6. claim_welcome_reward RPC controleert (uitbreiding op huidige RPC):
   a. Email is geverifieerd (bestaande Supabase Auth check)
   b. Device fingerprint hash niet eerder gebruikt
   c. Pas dan: +25 credits via add_credits

Bij tweede account vanaf zelfde device:
- Account-aanmaak slaagt (geen blokkade voor real users met meerdere accounts)
- Welcome credits worden NIET toegekend (device fingerprint match)
- User kan nog wel kopen via Stripe (geen blokkade voor betalend gebruik)
```

---

## Wijzigingen aan bestaande systemen

**`profiles` tabel** — nieuwe kolommen:

```sql
ALTER TABLE profiles
  ADD COLUMN device_fingerprint_hash TEXT,
  ADD COLUMN welcome_credits_claimed BOOLEAN DEFAULT FALSE,
  ADD COLUMN email_verification_method TEXT;
  -- 'kickbox', 'clearout', 'manual_admin', 'bypassed_for_test'

CREATE INDEX idx_profiles_fingerprint ON profiles (device_fingerprint_hash);
```

**`claim_welcome_reward` RPC** — bestaande RPC uit ADR-013 wordt uitgebreid:

- Check of `device_fingerprint_hash` al voorkomt in andere `profiles` rij met `welcome_credits_claimed = true`
- Zo ja → return success false met reden "duplicate device"
- Zo nee → trek 25 credits bij, zet `welcome_credits_claimed = true`

**Signup flow in `src/app/auth/`:**
- Turnstile-component toevoegen
- Disposable-email check (build-time gegenereerde set in JS bundle)
- Email-verificatie API call vóór `supabase.auth.signUp()`

---

## Consequenties

**Voordelen:**
- Significante reductie in fraud-credits (verwacht: 80%+ minder abuse-signups)
- Cleaner user-base: emailadressen zijn echte adressen die mail kunnen ontvangen
- Voorbereiding op Stripe Radar (priorities.md taak 1.13): account-vereiste plus email-verificatie maken Stripe Radar's risk-scoring effectiever
- Email-verificatie was sowieso nodig voor launch (zie priorities.md taak 1.19 — Supabase email-verificatie aanzetten)

**Trade-offs:**
- UX-friction: extra signup-stap (verifieer email vóór credits)
- ~$8/maand Kickbox-kosten bij 1.000 signups (verwaarloosbaar)
- False positives mogelijk: legitieme users met catch-all email of niet-standaard provider
- Device fingerprint kan falen bij users met privacy-tools (Brave shields, Tor Browser, hardened Firefox) — die krijgen geen welcome credits

**Mitigatie van false positives:**
- Crisp support-flow (priorities.md taak 1.15): user kan handmatig vragen om welcome credits indien geblokkeerd door false positive
- Khidr kan handmatig credits toevoegen via admin-dashboard (priorities.md taak 1.17 — manual credits add/remove)
- Logging in Sentry: welke fingerprint-checks falen, om te beoordelen of de regels te strikt zijn

---

## Verhouding tot ADR-013

Dit ADR vervangt ADR-013 niet, maar voegt een verplichte verificatie-laag toe. De **25-credit-belofte uit ADR-013 blijft volledig**, maar conditioneel op:

- Email is geverifieerd
- Device fingerprint is uniek

ADR-013's "permanent paid user status" mechanisme is niet geraakt — dat blijft gebaseerd op `total_credits_purchased > 0` via Stripe.