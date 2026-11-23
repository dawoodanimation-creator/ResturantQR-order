<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RestaurantQR-Order — Agent Context Guide

> Multi-Tenant Smart Restaurant QR Ordering, KDS & Owner Platform (Pakistan-first product: PKR, Asia/Karachi, local payment rails).
> Source of truth: `SPEC.md`. Architecture decisions: `DECISIONS.md`.

---

## 1. Tech Stack & Versions

- **Framework**: Next.js 16 (App Router), TypeScript (strict mode).
- **Styling**: Tailwind CSS 4, Lucide icons, `clsx`, `tailwind-merge`.
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth (`@supabase/supabase-js`, `@supabase/ssr`).
- **Realtime**: Supabase Realtime exclusively (no Socket.io).
- **State**: TanStack Query (server state), Zustand (client UI cart state only).
- **Validation**: Zod with `.strict()`.

---

## 2. Core Commands

```bash
# Development
npm run dev               # Start Next.js dev server on http://localhost:3000
npm run build             # Build production bundle
npm run typecheck         # TypeScript strict typecheck (tsc --noEmit)
npm run lint              # ESLint check
npm run check:secrets     # Audit repository against leaked .env files or passwords
npm test                  # Run full pre-commit verification suite

# Supabase (Local workflow)
npx supabase start        # Launch local Docker containers (Postgres, Auth, Realtime, Studio)
npx supabase db reset     # Reset local database and run all migrations + seed.sql
npx supabase test db      # Execute pgTAP unit and RLS tests in supabase/tests/
npx supabase db push      # Push migrations to remote hosted project
```

---

## 3. Directory Structure

```
├── docs/                 # Documentation & Phase screenshot artifacts
│   └── screenshots/      # Review screenshots per phase
├── public/               # Static assets & PWA manifests
├── scripts/              # Secret audit and build verification scripts
│   └── check-no-secrets.js
├── src/
│   ├── app/              # Next.js App Router route groups
│   │   ├── (guest)/      # Guest PWA: /r/[slug]/t/[token] (table QR order flow)
│   │   ├── (floor)/      # Floor Dashboard: /floor (tablet 1280x800)
│   │   ├── (kds)/        # Kitchen Display System: /kds (1920x1080 TV & tablet)
│   │   ├── (owner)/      # Owner Management Portal: /owner (desktop first)
│   │   ├── (admin)/      # Platform Super-Admin: /super-admin
│   │   └── api/          # Internal secure route handlers
│   ├── components/       # UI & Module Components
│   │   ├── floor/        # Floor queue, table map, shift wake-lock components
│   │   ├── guest/        # Menu cards, item sheets, cart drawer, live tracker
│   │   ├── kds/          # Kitchen ticket cards, timer threshold chips, sold-out toggles
│   │   ├── owner/        # Menu editors, branch/table QR generators, staff managers
│   │   ├── shared/       # Common widgets (audio chime player, status indicators)
│   │   └── ui/           # Primitive design system components
│   ├── hooks/            # Custom React hooks (realtime subscriptions, wake-lock)
│   ├── lib/              # Core libraries & clients
│   │   ├── db/           # Database query helpers
│   │   ├── supabase/     # Client, server, and service_role admin factories
│   │   ├── utils/        # Formatting (paisa to PKR), class merges
│   │   └── validations/  # Zod schemas for all client & server payloads
│   ├── services/
│   │   └── print-agent/  # Outbound ESC/POS print client architecture
│   └── types/            # TypeScript definitions (database.types.ts)
├── supabase/
│   ├── migrations/       # Versioned SQL migrations (schema, state machine, grants, RLS)
│   ├── tests/            # pgTAP database tests
│   └── seed.sql          # Seed data with demo restaurants, menus & staff
├── DECISIONS.md          # Architectural decisions log with single-line rationale
└── SPEC.md               # Source of truth specification
```

---

## 4. Hard-Won Rules & Database Conventions

1. **Explicit Grants**: Migration grants must be explicit. Never rely on default privileges.
2. **Zero Anon Grants**: Role `anon` has zero table grants. Guest reads and writes go through server code using `service_role` after verifying QR token or session token.
3. **Never Trust Client Prices**: Re-price every item server-side inside one transaction. The client only sends IDs, quantities, notes, and an expected total for mismatch detection.
4. **Snapshot Order Items**: `order_items` stores a complete snapshot (`name_snapshot`, `unit_price_paisa`, `modifiers_snapshot`) at order time. Later menu edits never alter old bills.
5. **No Negative / Sneaky Defaults**: Never preselect a modifier option that costs money (`chk_default_zero_price` constraint).
6. **Financial Data Types**: All money is stored in integer **paisa** (`*_paisa`, `bigint`). All rates are stored in basis points (`*_bps`, `integer`, e.g. `1600` = 16%).
7. **Timezone-Aware Resets**: Daily order numbers reset at the restaurant's local midnight (`restaurants.timezone`, default `Asia/Karachi`), never UTC.
8. **Audit Every Transition**: Trigger `trg_orders_status_audit` logs every status change to `order_status_events` with actor type and `clock_timestamp()`.
9. **Concurrency Protection**: Staff actions utilize `transition_order_status` which acquires a row lock (`FOR UPDATE`) and re-checks status, returning `"Already handled by <name>"` if taken.
10. **Archive, Never Delete**: Historical records (branches, tables, menu items) are marked `is_archived = true`, never hard deleted if referenced.
11. **Column-Level Write Grants**: Authenticated staff can update order status, reasons, and ETA, but can NEVER update financial totals (`*_paisa`).
12. **Synthetic Staff Usernames**: Staff accounts without email use the RFC 2606 reserved `.invalid` domain (`<username>@staff-login.invalid`).
13. **Secrets Policy**: Only `.env.example` may be committed. All `.env*` files are strictly excluded.
