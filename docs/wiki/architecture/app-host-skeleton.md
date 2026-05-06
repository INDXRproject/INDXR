# App-host skelet — app.indxr.ai

**Status:** Functioneel correct, visueel onafgewerkt — baseline voor latere designer/developer.  
**Datum:** 2026-05-07 (na monorepo migratie + skelet-fix sprint)  
**Gerelateerd:** [cross-host-auth.md](cross-host-auth.md) — auth flows, cookie strategie, env vars.  
**Design tokens:** `apps/app/src/app/styles/tokens.css`

---

## Scope

Dit document beschrijft de skelet-staat van de app-host UI zoals opgeleverd na de monorepo migratie (B0–B2) en de skelet-fix sprint (2026-05-06/07). Het gaat over structuur en layout, niet over de eindbestemming qua design. Een latere designsprint kan op dit skelet bouwen zonder de structuur opnieuw te doordenken.

---

## Layout structuur

```
<div class="flex flex-col h-svh">          ← buitenste wrapper, viewport height
  <AppTopbar />                             ← 56px (h-14), sticky top-0 z-40
  <SidebarProvider class="flex-1 overflow-hidden">
    <AppSidebar />                          ← in flex flow, collapsible="none"
    <main id="main-content" class="w-full overflow-y-auto">
      <div class="p-4 md:p-8 ...">         ← page content
        {children}
      </div>
    </main>
    <MobileTabBar />                        ← md:hidden, fixed bottom
  </SidebarProvider>
</div>
```

**Beslissingen:**
- AppTopbar staat BUITEN SidebarProvider. Dit voorkomt het `fixed top-16` alignment-conflict uit Shadcn's standaard sidebar implementatie (die een 4rem header assumeert).
- SidebarProvider krijgt `flex-1 overflow-hidden` zodat sidebar + main samen de resterende hoogte vullen na AppTopbar.
- AppSidebar gebruikt `collapsible="none"` (in flex flow) in plaats van de default `variant="inset"` (fixed positioning). Dit maakt de sidebar hoogte afhankelijk van de flex container, niet van de viewport.
- Main content scrollt via `overflow-y-auto` op het main element zelf, niet op de body.

---

## AppTopbar

**Bestand:** `apps/app/src/components/AppTopbar.tsx`  
**Hoogte:** `h-14` (56px)  
**Styling:** `sticky top-0 z-40 border-b bg-bg`

**Linkerkant (links → rechts):**
1. Logo — mark (32px) + wordmark (36px), `<Link href="/dashboard">`
   - Light mode: `indxr-mark-black-transparent.png` + `indxr-wordmark-black-transparent.png`
   - Dark mode: `dark:hidden` / `hidden dark:block` via `data-theme` variant
2. SidebarTrigger — `md:hidden`, opent mobile drawer (Shadcn Sheet)

**Rechterkant (links → rechts):**
1. `ThemeToggle` — Sun/Moon, `Button size="icon"` (36px), `relative overflow-hidden` containment
2. Messages icon — `Mail size-5`, `Button variant="ghost" size="icon"`, link → `/dashboard/messages`. Accent-kleur dot indicator als MOCK_MESSAGES unread > 0.
3. Credits — `CircleDollarSign size-5` + count in pill (`bg-[var(--surface-elevated)]`, `tabular-nums`), link → `/dashboard/billing`
4. `AvatarDropdown` — `UserAvatar h-7 w-7` binnen `Button h-9 w-9`, dropdown: Account / Settings / Sign Out

**Onopgeloste visuele punten:**
- ThemeToggle Sun/Moon kleuren: Sun = `text-warning`, Moon = `text-accent` — valt op als er geen `--warning` token is gedefinieerd (fallback onbekend)
- Credits indicator toont altijd MOCK_MESSAGES unread count (hardcoded initiële staat); update wacht op backend messages API
- Logo-afmetingen zijn inline `style={{ height: "32px" }}` — niet via design token of className
- Gap tussen logo en SidebarTrigger op mobile: `gap-3` op header, kan druk aanvoelen op kleine schermen
- Rechter cluster: `gap-1` (4px) tussen alle items — functioneel maar niet bewust afgestemd op een spacing scale

---

## AppSidebar

**Bestand:** `apps/app/src/components/app-sidebar.tsx`  
**Breedte:** `w-64` (256px) expanded, `w-14` (56px) collapsed  
**Collapsible:** custom `useState` + `localStorage("sidebar-collapsed")` — één toggle knop bovenin  
**Grens:** `border-r` (vervanger voor inset-variant scheiding)

**Structuur (top → bottom):**
1. **Collapse toggle** — `PanelLeftClose`/`PanelLeftOpen`, `hidden md:block`. Desktop only; mobile gebruikt SidebarTrigger in AppTopbar.
2. **Nav items** (via SidebarGroup):
   - Home → `/dashboard`
   - Transcribe → `/dashboard/transcribe`
   - Messages → `/dashboard/messages`
3. **Library** (SidebarMenuItem met expandable sub-sectie):
   - Chevron-toggle: expand/collapse collecties
   - Default: ingeklapt buiten `/dashboard/library`, uitgeklapt erin
   - Sub-items: All Transcripts + per-collection items met count
   - Drag-and-drop transcript-verplaatsing tussen collecties
   - Inline create/rename/delete collecties
4. **SidebarFooter:**
   - Storage meter (alleen expanded) — `Progress` bar, `usedMB / 500 MB`
   - Navigation guard — inline card als user navigeert tijdens actieve playlist extractie
   - Credits link → `/dashboard/billing` (CircleDollarSign + count, icon-only collapsed)
   - Account → `/dashboard/account`
   - Settings → `/dashboard/settings`
   - Sign Out → `supabase.auth.signOut()` + redirect naar `marketingHref('/login')`

**Collapsed state (w-14):**
- Iconen alleen, tekst hidden (`cn(collapsed && "hidden")`)
- Items gecentreerd (`cn(collapsed && "justify-center")`)
- Library sub-sectie verborgen
- Storage meter verborgen
- Credits: icoon only

**Onopgeloste visuele punten:**
- Geen logo in sidebar — logo zit in AppTopbar. Eerste element is de collapse toggle, geen branding. Dit is bewust (dubbel logo = chaos), maar ziet er kaal uit ingeklapt.
- Sidebar achtergrond: `bg-sidebar` (Shadcn token). Als `--color-sidebar` / `--sidebar` niet gedefinieerd is in `tokens.css`, valt dit terug op transparant of standaard-Shadcn kleur. De sidebar gebruikt `bg-sidebar` via Shadcn's token systeem, niet de eigen `--bg` / `--surface` tokens. Dit kan leiden tot kleurinconsistentie.
- `TooltipProvider delayDuration={300}` wraps de gehele sidebar — tooltips zijn gedefinieerd (via `title` attribute) maar Radix Tooltip wordt niet actief gebruikt op items. Tooltip-triggers ontbreken bij collapsed iconen.
- Drag-and-drop: werkt via HTML5 `draggable` + `dataTransfer`. Geen visuele drag-ghost.
- Library collecties: max-height `40vh` met `overflow-y-auto`. Veel collecties → scrollbaar, maar geen visuele indicator.
- Footer nav items gebruiken `<a href={item.url}>` (niet `<Link>`) — full page refresh op navigatie binnen app-host. Dit is bewust (cross-host patroon), maar voor dezelfde-host navigatie zou `<Link>` sneller zijn.

---

## Admin layout

**Bestand:** `apps/app/src/app/admin/layout.tsx`  
**Structuur:** eigen sticky nav (geen AppSidebar, geen SidebarProvider)

```
<div class="min-h-screen bg-bg">
  <nav class="border-b bg-bg sticky top-0 z-10 h-14">
    "Admin" label + tabs (Overview / Users / Credits / Transcripts / Paid Users)
    ml-auto: ← Back to App link | ThemeToggle | AvatarDropdown
  </nav>
  <div class="max-w-7xl mx-auto p-6">
    {children}
  </div>
</div>
```

**Onopgeloste visuele punten:**
- Admin nav heeft `z-10` (vs AppTopbar `z-40`) — geen overlap-issues door separate layout, maar inconsistente z-index schaal
- "← Back to App" is plaintext link zonder duidelijk chevron icon of consistent button style
- Admin heeft geen sidebar of breadcrumb-navigatie — voor diepere admin-pagina's (bijv. `/admin/transcripts/[id]`) is er geen visuele context

---

## Post-login routing

Na succesvolle login via `loginAction` (Server Action in `packages/shared/src/actions/auth-actions.ts`):

```
redirect(APP_URL + '/dashboard')  ← Home landing pagina
```

Als `?redirectTo=` param aanwezig en valide (zelfde-host): redirect terug naar die URL (bijv. na beschermde route interceptie door middleware).

Onboarding-pad: als `profiles.onboarding_completed = false` → redirect naar `indxr.ai/onboarding` ipv dashboard.

---

## Verwijzingen

| Document | Wat |
|---|---|
| [cross-host-auth.md](cross-host-auth.md) | Cookie strategie, auth flows, env var contract, Supabase URL config |
| `apps/app/src/app/styles/tokens.css` | CSS design tokens (bg, surface, accent, fg, border) |
| `apps/app/src/components/AppTopbar.tsx` | Topbar component |
| `apps/app/src/components/app-sidebar.tsx` | Sidebar component (713 regels) |
| `apps/app/src/components/AvatarDropdown.tsx` | Avatar dropdown (app-host variant) |
| `packages/shared/src/components/ui/sidebar.tsx` | Shadcn sidebar primitieven |
