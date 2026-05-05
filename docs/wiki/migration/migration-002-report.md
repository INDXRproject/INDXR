# Migration 002 — pnpm Monorepo Split

**Date:** 2026-05-05  
**Status:** Complete  
**Executed by:** Claude Sonnet 4.6

---

## Summary

The single Next.js project in `src/` was split into a pnpm monorepo with three packages:

| Package | Path | Purpose |
|---------|------|---------|
| `@indxr/marketing` | `apps/marketing/` | Public site, auth pages, docs, transcribe tool |
| `@indxr/app` | `apps/app/` | Authenticated dashboard on `app.indxr.ai` |
| `@indxr/shared` | `packages/shared/` | Shared UI components, hooks, utils, types |

---

## What Was Moved Where

### packages/shared/src/

| Source | Destination |
|--------|-------------|
| `src/components/Header.tsx` | `packages/shared/src/components/` |
| `src/components/Footer.tsx` | `packages/shared/src/components/` |
| `src/components/theme-provider.tsx` | `packages/shared/src/components/` |
| `src/components/TranscriptCard.tsx` | `packages/shared/src/components/` |
| `src/components/PlaylistManager.tsx` | `packages/shared/src/components/` |
| `src/components/PlaylistAvailabilitySummary.tsx` | `packages/shared/src/components/` |
| `src/components/UserAvatar.tsx` | `packages/shared/src/components/` |
| `src/components/free-tool/*` | `packages/shared/src/components/free-tool/` |
| `src/components/transcription/*` | `packages/shared/src/components/transcription/` |
| `src/components/ui/*` | `packages/shared/src/components/ui/` |
| `src/contexts/AuthContext.tsx` | `packages/shared/src/contexts/` |
| `src/hooks/useAuth.ts` | `packages/shared/src/hooks/` |
| `src/hooks/useJobStatus.ts` | `packages/shared/src/hooks/` |
| `src/hooks/use-mobile.ts` | `packages/shared/src/hooks/` |
| `src/lib/utils.ts` | `packages/shared/src/lib/` |
| `src/lib/cross-host-links.ts` | `packages/shared/src/lib/` |
| `src/lib/eta.ts` | `packages/shared/src/lib/` |
| `src/lib/pollingBackoff.ts` | `packages/shared/src/lib/` (pulled from app due to useJobStatus dependency) |
| `src/providers/PostHogProvider.tsx` | `packages/shared/src/providers/` |
| `src/types/transcript.ts` | `packages/shared/src/types/` |
| `src/types/sbd.d.ts` | `packages/shared/src/types/` |
| `src/utils/supabase/*` | `packages/shared/src/utils/supabase/` |
| `src/utils/formatTranscript.ts` | `packages/shared/src/utils/` |
| `src/utils/youtube.ts` | `packages/shared/src/utils/` |
| `src/utils/validation.ts` | `packages/shared/src/utils/` |
| `src/utils/disposable-email.ts` | `packages/shared/src/utils/` |
| `src/app/actions/rag-export.ts` | `packages/shared/src/actions/` |

All `@/` imports in `packages/shared/src/` were rewritten to relative paths.  
`NEXT_PUBLIC_PYTHON_BACKEND_URL` renamed to `NEXT_PUBLIC_AUDIO_UPLOAD_URL` in `AudioTab.tsx`.

### apps/marketing/src/

| Source | Destination |
|--------|-------------|
| `src/app/(marketing)/page.tsx` | `apps/marketing/src/app/page.tsx` |
| `src/app/about/`, `articles/`, `auth/`, `contact/`, `docs/`, `forgot-password/`, `login/`, `onboarding/`, `pricing/`, `privacy/`, `signup/`, `suspended/`, `terms/`, `transcribe/` | `apps/marketing/src/app/` (same names) |
| `src/app/api/extract/`, `check-playlist-availability/`, `video/` | `apps/marketing/src/app/api/` |
| `src/app/sitemap.ts` | `apps/marketing/src/app/` |
| `src/app/globals.css`, `styles/tokens.css` | `apps/marketing/src/app/` |
| `src/components/content/`, `docs/`, `marketing/`, `pricing/`, `seo/` | `apps/marketing/src/components/` |
| `src/lib/ratelimit.ts`, `authors.ts`, `docs-config.ts` | `apps/marketing/src/lib/` |
| `src/lib/pricing.ts` | `apps/marketing/src/lib/` (also copied — used by marketing pricing components) |
| `public/*` | `apps/marketing/public/` |

New files created: `layout.tsx`, `middleware.ts`.

### apps/app/src/

| Source | Destination |
|--------|-------------|
| `src/app/(app)/admin/` | `apps/app/src/app/admin/` (route group stripped) |
| `src/app/(app)/dashboard/` | `apps/app/src/app/dashboard/` (route group stripped) |
| `src/app/actions/credits.ts` | `apps/app/src/app/actions/` |
| `src/app/actions/rag-export.ts` | `apps/app/src/app/actions/` (also in shared — app components import via @/app/actions/) |
| `src/app/auth/actions.ts` | `apps/app/src/app/auth/` (used by dashboard/settings/ProfileSettingsCard.tsx) |
| `src/app/api/admin/`, `ai/`, `jobs/`, `playlist/`, `stripe/`, `transcribe/` | `apps/app/src/app/api/` |
| `src/app/api/extract/`, `check-playlist-availability/`, `video/` | `apps/app/src/app/api/` (shared with marketing) |
| `src/app/globals.css`, `styles/tokens.css` | `apps/app/src/app/` |
| `src/components/app-sidebar.tsx` | `apps/app/src/components/` |
| `src/components/SaveErrorModal.tsx` | `apps/app/src/components/` |
| `src/components/dashboard/` | `apps/app/src/components/dashboard/` |
| `src/components/library/` | `apps/app/src/components/library/` |
| `src/lib/stripe.ts` | `apps/app/src/lib/` |
| `src/lib/pricing.ts` | `apps/app/src/lib/` |
| `src/lib/pollingBackoff.ts` | `apps/app/src/lib/` |
| `src/lib/eta.ts` | `apps/app/src/lib/` |
| `src/lib/ratelimit.ts` | `apps/app/src/lib/` |
| `public/*` | `apps/app/public/` (robots.txt overwritten with Disallow: /) |

New files created: `layout.tsx`, `middleware.ts`.

---

## Build Verification Results

### @indxr/marketing — PASS

```
✓ Compiled successfully in ~15s
✓ Completed runAfterProductionCompile
✓ Generating static pages using 7 workers (60/60) in 762.4ms
```

60 routes rendered successfully (static + dynamic).

### @indxr/app — PASS

```
✓ Compiled successfully in ~18s
✓ Completed runAfterProductionCompile
```

All dashboard routes rendered successfully (all dynamic).

**Fixes required during build:**

1. `tailwind-merge` missing in `packages/shared/package.json` — added.
2. `pricing.ts` missing in marketing — copied from src/lib/.
3. `lucide-react`, `sonner`, `tailwind-merge` missing in marketing deps — added.
4. `rag-export.ts` action missing in apps/app — copied (app components use `@/app/actions/rag-export`).
5. `auth/actions.ts` missing in apps/app — copied (ProfileSettingsCard imports it).
6. `ratelimit.ts` missing in apps/app — copied.
7. `@supabase/ssr`, `@supabase/supabase-js` missing in app and marketing deps — added.
8. Tiptap packages + `file-saver`, `jszip`, `posthog-*`, `zod` missing in app deps — added.
9. `sbd` type declaration — added `packages/shared/src/types` to both app tsconfigs' `include`.
10. `Stripe` apiVersion `'2025-12-15.clover'` → `'2026-02-25.clover'` (new stripe@20.4.x requires updated API version).
11. `apps/app/.env.local` required for build — Stripe constructor throws at module init without `STRIPE_SECRET_KEY`.

---

## Full git status Output (Phase 7 — before src/ removal)

```
On branch master
Changes not staged for commit:
  modified:   docs/LOG.md
  deleted:    package-lock.json
  modified:   package.json

Untracked files:
  apps/
  packages/
  pnpm-lock.yaml
  pnpm-workspace.yaml
```

After `rm -rf src/`: 231 files shown as `deleted:` — all tracked src/ files, as expected.

---

## Awareness: tsconfig fallback paths

Both app tsconfigs use:
```json
"paths": {
  "@/*": ["./src/*", "../../packages/shared/src/*"]
}
```

**Local wins.** If `apps/marketing/src/lib/pricing.ts` exists AND `packages/shared/src/lib/pricing.ts` exists, the local `./src/lib/pricing.ts` will be resolved first. This is intentional — app-specific overrides are possible. But if you accidentally add a local file with the same name as a shared one, the shared version is silently shadowed. During debugging, check local src/ before assuming shared is being used.

---

## Open Questions for Khidr

1. **Stripe webhook URL**: After splitting into two Vercel projects, the webhook URL must be re-registered in Stripe Dashboard as `https://app.indxr.ai/api/stripe/webhook`. The old `https://indxr.ai/api/stripe/webhook` will stop receiving events.

2. **AudioTab env var rename confirmed**: `NEXT_PUBLIC_PYTHON_BACKEND_URL` → `NEXT_PUBLIC_AUDIO_UPLOAD_URL` in `packages/shared/src/components/free-tool/AudioTab.tsx`. Both Vercel projects need the new env var set.

3. **Two Vercel projects needed**: Each `apps/*` directory must be a separate Vercel project with its own root directory configured (`apps/marketing` and `apps/app`). See `docs/wiki/operations/deployment.md` for details.

4. **apps/app/.env.local**: The Stripe initialization in `apps/app/src/lib/stripe.ts` requires `STRIPE_SECRET_KEY` at module evaluation time (Next.js route data collection). For CI builds, `STRIPE_SECRET_KEY` must be set as a Vercel env var. The local build currently depends on `.env.local` being present.

5. **eta.ts duplication**: `packages/shared/src/lib/eta.ts` AND `apps/app/src/lib/eta.ts` both exist. The shared version is used by `TranscriptionProgress.tsx` (in shared). The app version is the local copy. Either can be removed if you consolidate — the local one in app shadows the shared one.
