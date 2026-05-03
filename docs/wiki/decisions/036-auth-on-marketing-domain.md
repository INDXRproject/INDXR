# Beslissing 036: Auth flows op marketing domain

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/login/`, `src/app/signup/`, `src/app/auth/callback/`, `next.config.ts`

---

## Context

Na de subdomain-split (ADR-034) staat de geauthenticeerde app op `app.indxr.ai`. De vraag is of auth flows (login, signup, forgot-password, onboarding) ook naar `app.indxr.ai` verhuizen of op `indxr.ai` blijven.

---

## Beslissing

Auth flows blijven op het marketing domain: `indxr.ai/login`, `indxr.ai/signup`, `indxr.ai/forgot-password`, `indxr.ai/onboarding`.

---

## Rationale

- Marketing-funnel is naadloos: `indxr.ai/pricing` → `indxr.ai/signup` → `app.indxr.ai/dashboard`
- Pattern gevolgd door Linear, Vercel, Notion: auth als onderdeel van de conversie-funnel, niet van de app
- Technisch voordeel: auth cookies op root-domein (`.indxr.ai`) zijn beschikbaar op zowel `indxr.ai` als `app.indxr.ai`

Overwogen alternatieven: auth op `app.indxr.ai/login` (logischer vanuit app-perspectief, maar verbreekt conversie-funnel), aparte `auth.indxr.ai` (overkill voor huidige schaal).

---

## Consequenties

- Supabase OAuth callback (`/auth/callback`) blijft op `indxr.ai`
- Auth cookies worden gezet op `.indxr.ai` (root-domein scope)
- Herzien wanneer: enterprise SSO of multi-tenant auth een andere architectuur vereist
