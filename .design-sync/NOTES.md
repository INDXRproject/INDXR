# Design sync notes — @indxr/shared

## 2026-07-03 re-sync

- Fetched the project's `_ds_sync.json` anchor and saved it to `.design-sync/.cache/remote-sync.json` (gitignored, machine-local). **When hand-transcribing this file, `sourceHashes` is NOT optional in practice** — `remote-diff.mjs`'s `validSidecar()` requires `styleSha`/`renderHashes`/`sourceHashes` all present or it treats the anchor as `malformed` and falls back to full first-sync scope (everything shows as `added`). First attempt this run omitted `sourceHashes` and got exactly that; re-fetching with the field included fixed it (anchor: `ok`, 136 unchanged / 1 added).
- Driver run (`node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./packages/shared/node_modules --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`) found: **`FeedbackCard` added**, **`Toaster` removed** from the package's exports since the last sync. Both are expected — no investigation needed on a future re-sync unless the diff looks different from this.
- Authored `.design-sync/conventions.md` (first time — none existed) and wired it via `readmeHeader` in `config.json`. Content: no provider needed (theming is via `data-theme="dark"` attribute, not React context — `ThemeProvider` in the repo just wraps `next-themes` for the host app, not required for isolated renders); Tailwind utility-class idiom over the repo's OKLCH tokens (`bg-surface`, `text-fg-muted`, `bg-accent`, etc. — verified against the compiled `.design-sync-tokens.css` and real component source). Re-ran the driver afterward per the rebuild rule so the README actually carries the header.
- **Known render warns (pre-existing, not regressions):** 20 leaf components render as blank floor cards in isolation — `AlertDialogHeader`, `AlertDialogMedia`, `CardHeader`, `DropdownMenuLabel`, `SheetFooter`, `SheetHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarHeader`, `SidebarInput`, `SidebarMenuItem`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarProvider`, `TableCaption`, `TableCell`, `TableHead`. These are all layout-only children meant to be composed inside a parent (Card/Sheet/Sidebar/Table) — they render blank alone by design. All 20 are in the `unchanged` verification partition (carried forward, outside this run's gate) — not something this run needs to fix.
- `FeedbackCard` itself ships the floor card (no authored preview yet, not flagged `bad` — clean render with the standard "preview not yet authored" placeholder). Authorable on a future sync.

## Upload NOT completed this run — action required on next sync

The MCP `write_files` tool here only accepts inline file content (no local-path/disk upload), and `_ds_bundle.js` is ~860KB — over `Read`'s 256KB cap. Reconstructing it via chunked reads + manual reassembly risks silent byte-level corruption in code the design agent executes, so at the user's direction **this run stopped before uploading** rather than attempt that.

**State right now:**
- The project (`43b8e30d-d44f-4943-a841-3bb6fd80df17`) still has the **previous** sync's content (no FeedbackCard, Toaster still present) — nothing was corrupted, nothing partial was written except the `_ds_needs_recompile` sentinel (harmless — it just re-triggers the self-check against the still-valid old content).
- Locally, `ds-bundle/` is fully built, validated (`package-validate.mjs` exit 0), and has the new conventions header baked into `README.md`. `.design-sync/.cache/remote-sync.json` holds a valid anchor.
- **Next sync**: re-run the driver (should be a no-op rebuild since nothing source-side has changed since today), then complete the upload. If the same 256KB tool limitation is still in place, either: use a host/tool that supports local-path or larger inline payloads, or split `_ds_bundle.js` upload via a verified chunk-and-diff procedure (confirm reconstructed bytes match the source file exactly via `diff` before calling `write_files`) rather than skipping again.

## Re-sync risks

- `_ds_bundle.js`/`_ds_bundle.css`/`README.md`/the `FeedbackCard` component files and the `Toaster` deletes are all still pending upload — a future sync's diff will show the same delta again (this is expected, not a sign of a broken anchor) until the upload actually completes.
- `componentSrcMap` excludes `Form`/`FormItem`/`FormLabel`/`FormControl`/`FormDescription`/`FormMessage`/`FormField`/`useFormField` — confirm these are still meant to be excluded if the package's form exports change shape.
- `libOverrides.bundle.mjs` (Next.js `process.env.__NEXT_*` shim) — confirm still needed if the package's Next.js dependency surface changes.
