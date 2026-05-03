# ADR-S006: Auth flows op marketing domain

**Date:** 2026-05-03  
**Status:** Accepted

## Context

Na de subdomain-split (ADR-S002) staat de geauthenticeerde app op `app.indxr.ai`. De vraag is of auth flows (login, signup, forgot-password, onboarding) ook naar `app.indxr.ai` verhuizen of op `indxr.ai` blijven.

## Decision

Auth flows blijven op het marketing domain: `indxr.ai/login`, `indxr.ai/signup`, etc.

## Alternatives considered

- **Auth op `app.indxr.ai/login`:** logischer vanuit app-perspectief, maar verbreekt de conversie-funnel (marketing → signup moet één domein zijn)
- **Aparte auth-service (`auth.indxr.ai`):** overkill voor huidige schaal

## Consequences

- Marketing-funnel is naadloos: `indxr.ai/pricing` → `indxr.ai/signup` → `app.indxr.ai/dashboard`
- Supabase OAuth callback (`/auth/callback`) blijft op `indxr.ai`
- Auth cookies worden gezet op root-domein (`.indxr.ai`) zodat ze beschikbaar zijn op `app.indxr.ai`

## Trigger to reconsider

Als enterprise SSO of multi-tenant auth een andere architectuur vereist.
