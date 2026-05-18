# Church Media Control System — Plan

## 1. Analysis

You need a two-screen live-service tool: an **operator dashboard** and a **projector view**, kept in sync in real time, that must not fail mid-service. The hardest requirements are not features — they are **reliability, latency, and operator ergonomics under pressure**. Everything else (song CRUD, service order, slide splitting) is standard.

### One important stack note
You asked for **Next.js (App Router)**. This Lovable project's web-app template is **Vite + React + React Router + TypeScript + Tailwind + shadcn/ui**, with **Lovable Cloud (Supabase under the hood)** for Auth, DB, Storage, and Realtime. Switching to Next.js is not supported here.

For this product the Vite/React stack is actually a better fit — there is no SEO/SSR need, the app is a logged-in dashboard + a fullscreen projector route, and client-only rendering means **lower latency on slide changes** and **simpler Realtime wiring**. I recommend we proceed on the supported stack. Everything else you specified (TS, Tailwind, Supabase Auth/DB/Storage/Realtime, PWA-capable, dark UI) stays identical.

**Please confirm**: proceed with Vite + React + Supabase (recommended), or stop here.

---

## 2. Recommended Architecture

**Two clients, one source of truth.**

```text
┌──────────────────┐        Supabase Realtime         ┌──────────────────┐
│ Operator (/app)  │ ───── writes presentation_state ─▶│ Projector (/live)│
│  dashboard, big  │ ◀──── subscribes for confirms ── │  fullscreen only │
│  buttons, search │                                  │  no controls     │
└────────┬─────────┘                                  └────────▲─────────┘
         │ CRUD (songs, slides, service order)                 │
         ▼                                                     │
   Supabase Postgres ─── Realtime channel: presentation_state ─┘
```

- **Single row per session** in `presentation_state` (`current_item_id`, `current_slide_index`, `mode`: `slide | black | logo | verse | media`, `payload jsonb`, `updated_at`). Operator updates it; projector subscribes via Realtime.
- **Optimistic UI** on operator; projector renders straight from realtime payload (no extra fetch on slide change → instant).
- **Fallback**: if Realtime disconnects, projector polls the state row every 1s and shows a small "reconnecting" indicator (operator-only).
- **Preload** next/previous slide content in memory on the projector to avoid flicker.
- **Keyboard shortcuts** on operator: `→`/`←` next/prev, `B` black, `L` logo, `Space` next.
- **State management**: React Query for server data + a tiny Zustand store for the live presentation state. No Redux.
- **Auth**: Supabase email/password (+ Google) — gated `/app`; `/live/:sessionId` is a public read-only view of the state row (RLS allows anonymous SELECT on that one row, nothing else).

---

## 3. MVP Scope (ship first)

1. Auth (email/password + Google), protected `/app`.
2. Song library: create / edit / delete / search by title or artist.
3. Paste lyrics → auto-split into slides on blank lines (editable after split).
4. Select a song → send slide to projector; Next / Prev; Black / Logo.
5. Projector route `/live/:sessionId` — clean fullscreen output, dark bg, large legible type.
6. Basic service order: ordered list of items (song / scripture / announcement), click to go live.
7. Keyboard shortcuts + reconnect indicator.

**Explicitly out of MVP**: media upload/video, countdown timer, Bible API, livestream, AI, translations, multi-tenant, animations beyond a fade.

---

## 4. Database Schema

All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. RLS on everywhere.

| Table | Purpose | Key fields | Notes |
|---|---|---|---|
| `profiles` | App user metadata | `user_id uuid → auth.users`, `display_name`, `role` | role lives in separate `user_roles` table (see below) |
| `user_roles` | RBAC (avoid privilege escalation) | `user_id`, `role app_role` enum (`admin`,`operator`) | checked via `has_role()` SECURITY DEFINER fn |
| `songs` | Song catalog | `title`, `artist`, `category`, `number int`, `created_by` | indexes: `title trgm`, `artist`, `number` |
| `song_slides` | Ordered slides per song | `song_id fk`, `position int`, `content text` | unique(`song_id`,`position`); cascade delete |
| `service_orders` | A service/run-sheet | `name`, `service_date`, `created_by` | |
| `service_items` | Ordered items in a service | `service_order_id fk`, `position int`, `kind` enum(`song`,`scripture`,`announcement`,`media`), `ref_id uuid`, `payload jsonb` | unique(`service_order_id`,`position`) |
| `media_assets` | Uploaded images/videos (post-MVP wiring, table now) | `kind`, `storage_path`, `width`, `height`, `created_by` | |
| `presentation_sessions` | A live session a projector can join | `name`, `slug text unique`, `owner_id`, `is_active bool` | slug used in `/live/:slug` |
| `presentation_state` | Current on-screen state (one row per session) | `session_id fk unique`, `mode`, `current_item_id`, `current_slide_index`, `payload jsonb`, `updated_at` | Realtime publication enabled; the only row anon can SELECT |

**Reliability constraints**: NOT NULL on all critical FKs; unique `(song_id, position)`; check constraint on `mode`; trigger to bump `updated_at`; Realtime replication enabled only on `presentation_state`.

**RLS summary**: authenticated users can CRUD their own org's content; `presentation_state` SELECT allowed to anon **only for active sessions**; all writes require auth + role check via `has_role()`.

---

## 5. Folder Structure

```text
src/
  pages/
    Index.tsx                 # redirect to /app or /auth
    Auth.tsx
    app/
      Dashboard.tsx           # main control surface
      Songs.tsx               # library list + search
      SongEditor.tsx          # paste + auto-split editor
      Services.tsx            # service order list
      ServiceEditor.tsx
    live/
      Projector.tsx           # /live/:slug fullscreen
  components/
    control/                  # SlidePreview, BigButton, ServiceList, NowLive
    song/                     # SlideList, LyricsPaster
    projector/                # SlideRenderer, BlackScreen, LogoScreen
    layout/                   # AppShell, Topbar
    ui/                       # shadcn primitives (existing)
  hooks/
    useAuth.ts
    usePresentation.ts        # subscribe + mutate presentation_state
    useSongs.ts               # react-query wrappers
    useKeyboardShortcuts.ts
  lib/
    supabase.ts               # client (already provided by Cloud)
    lyrics.ts                 # splitLyricsIntoSlides()
    types.ts
  store/
    presentation.ts           # zustand: local optimistic state
  index.css, main.tsx, App.tsx
supabase/
  migrations/                 # SQL migrations created via Cloud
```

---

## 6. Implementation Steps

1. **Enable Lovable Cloud** + set up dark theme tokens in `index.css`/Tailwind.
2. **Migrations**: create enums, tables, `has_role()`, RLS policies, Realtime publication on `presentation_state`.
3. **Auth pages** + protected route wrapper + `profiles`/`user_roles` auto-insert trigger on signup.
4. **Songs**: list + search + create with `LyricsPaster` (auto-split on `\n\n`) + slide editor.
5. **Presentation engine**: `usePresentation` hook (subscribe + `goLive`, `next`, `prev`, `black`, `logo`).
6. **Dashboard**: song picker → slide grid → big Next/Prev/Black/Logo + "Now Live" panel + keyboard shortcuts.
7. **Projector route** `/live/:slug`: fullscreen renderer, reconnect handling, font-size autoscale.
8. **Service order**: CRUD + drag-reorder (dnd-kit) + one-click "go live" per item.
9. **Polish**: loading/error states, toasts, confirm-on-destructive, offline indicator, PWA manifest only (no SW).

After step 2 I'll summarize, and again after step 7 (end-to-end MVP).

---

## Confirmations needed before I start

1. **OK to use Vite + React + Supabase** instead of Next.js? (strongly recommended — see §1)
2. **Auth methods**: email/password + Google sign-in OK as default?
3. **User profiles**: store `display_name` + `role` (admin/operator) — OK?

Reply "go" with any overrides and I'll execute steps 1–4 in the first pass.