# SPEC — Multi-Tenant Smart Restaurant QR Ordering, KDS & Owner Platform

> **Source of truth.** Read this file fully before every phase. Build ONLY the phase
> requested, then STOP and wait for approval. Record every decision in `DECISIONS.md`.
> Pakistan-first product (PKR, Asia/Karachi, local payment rails).

---

## 1. Product

A multi-tenant SaaS for restaurants, cafés and quick-service eateries.

- Restaurants subscribe monthly. Tiers unlock features via feature flags.
- Guests scan a QR on the table, order from their own phone, and track progress.
- Staff approve, cook and serve from a floor dashboard and a kitchen display.
- Owners manage menu, branches, tables, staff and settings.

**Roles:** super-admin (platform) · owner · manager · captain · waiter · kitchen · guest (anonymous).

---

## 2. Fixed architecture decisions — do not change without asking

| Area | Decision | Why |
|---|---|---|
| Framework | Latest stable Next.js (App Router), TypeScript strict | Verify the installed version; don't assume from memory |
| UI | Tailwind CSS + shadcn/ui + Lucide, mobile-first | |
| DB / Auth | Supabase Postgres + Supabase Auth (staff only) | |
| Realtime | **Supabase Realtime only — no Socket.io** | Socket.io needs a long-running server; doesn't fit serverless hosting |
| Server state | TanStack Query; Zustand only for client UI state (cart) | |
| Validation | Zod on every input, `.strict()` | |
| Writes | Server Actions / Route Handlers only. Guests never write with the anon key | Prevents price/status tampering |
| Money | Integer **paisa** everywhere (`*_paisa`, bigint). Rates in basis points (`*_bps`) | No float rounding errors |
| Migrations | Supabase CLI in `/supabase/migrations` + a separate seed file | |
| Tenancy | `restaurant_id` on every tenant table; RLS enabled on **every** table | Hard isolation |
| Guest URL | `/r/[restaurant-slug]/t/[qr-token]` | Table numbers are guessable; tokens are not. Rotatable. |

---

## 3. Hard-won rules (these were real bugs — bake them in from day one)

1. **Grant privileges explicitly in migrations.** Do not rely on the local Supabase
   stack's default privileges. A hosted project built by running migrations gets none
   of them, so `authenticated` and `service_role` end up with no SELECT and every read
   fails in production while passing locally.
2. **`anon` gets zero grants on anything.** Guest reads/writes go through server code
   using the secret key, after validating the QR or session token.
3. **Never trust client prices.** Re-price every line server-side from the DB inside one
   transaction. The client may send only ids, quantities and notes, plus an expected
   total used purely to detect a change.
4. **`order_items` store a snapshot** of name, unit price and selected modifiers (JSONB)
   at order time, so later menu edits never alter old bills.
5. **Never preselect an option that costs money.** Required groups: nothing preselected.
   Optional groups: preselect defaults only when the price delta is zero.
6. **Rate limit per device, not per session.** A table session is shared by many guests.
   Use a random device id in localStorage: ≥15 s between orders and ≤5 per 10 min per
   device, ≤20 per 10 min per session. Idempotency key per order to survive double taps.
7. **Daily order numbers reset at the restaurant's local midnight** (`restaurants.timezone`,
   default `Asia/Karachi`), never UTC.
8. **Log every status change** to an `order_status_events` table by trigger, with actor and
   `clock_timestamp()`. Prep-time and response-time analytics are impossible to add later
   without this.
9. **Show an ETA only once an order is accepted.** Before approval or payment, show a hint.
10. **Ready is not the end.** The floor needs a "Ready for pickup" list with
    "Mark served" (dine-in) / "Mark collected" (counter), or orders stall forever.
11. **Two staff, one order:** every staff action locks the row, re-checks the current
    status, and returns "Already handled by <name>" instead of overwriting.
12. **Set `realtime.setAuth(token)` before subscribing.** If the socket opens before the
    session loads, RLS silently drops every event.
13. **Refetch after subscribing** (a couple of seconds later, and again a few seconds after
    that) plus a quiet safety refetch; replication can be warming up and early events lost.
14. **Archive, never delete** anything with history (menu items, tables, branches). Hard
    delete only when nothing references it.
15. **Many staff in Pakistan have no email.** Support username + temporary password accounts
    created by the owner, with a forced password change on first sign-in. Email invites are
    the secondary path (and need custom SMTP in production).
16. **Keep screens awake.** Floor and KDS tablets sleep otherwise — use the Screen Wake Lock
    API after a "Start shift" tap (which also unlocks audio, since browsers block autoplay).
17. **Colour is never the only signal.** Every status carries an icon and a text label.
18. **Deploy to a hosted staging environment early** (end of the first UI phase, not at the
    end). Several classes of bug — grants, env vars, regions, cold starts — only appear there.

---

## 4. Modules

### A. Guest PWA (zero install)
- QR → `/r/[slug]/t/[qr-token]` → opens or joins the table's active session.
  The session is opened by an action **after mount**, never during the page GET, so link
  previews and prefetches don't mark tables busy.
- Menu: categories from DB, item photos, dietary tags, allergens (in the item sheet, not on
  the card), per-branch availability and price overrides, sold-out items shown disabled with
  a text label (no strikethrough price — that reads as a discount).
- Cards are compact: aim for ≥5 visible on a 390px screen. A visible 44px "+" button on the
  photo adds simple items directly and shows the in-cart quantity.
- Item sheet: modifier groups as data (single/multi, required, min/max, price deltas).
  Photo ≤ ~200px tall so the first required choice is visible without scrolling. No summary
  error banner: on submit, scroll to and focus the first invalid group.
- Cart drawer: quantity, notes, live total. At quantity 1 the minus becomes a trash button.
- **Billing modes** (per restaurant, overridable per branch):
  - **PRE_PAY** (counter/QSR): order → `awaiting_payment` → staff confirm payment → kitchen.
    Guest sees a large "Pay at counter" token.
  - **POST_PAY** (dine-in): order → `pending_approval` → manager approves → kitchen.
- Tracker: placed → accepted → preparing → ready → served/collected. Reconnect handling,
  polling fallback, manual refresh, `aria-live` announcements.
- Price changed since adding to cart → show "was X, now Y" per line and require an explicit
  "Confirm new total" before resubmitting.
- Call bell: Call waiter, Need water, Clean table, Get cutlery (rate-limited).
- Bill: request bill, split (equal / by item), tip, digital receipt (PDF + share link).
- Feedback after settling: private comment **and** a public review link offered to everyone.
  Do **not** route only high ratings to the public link — that is review gating and breaks
  Google's review policy.
- PWA: per-table manifest, installable, offline page. The service worker must **never** cache
  menu or prices.

### B. Floor dashboard (tablet, 1280×800 first)
- "Start shift" overlay unlocks audio and the wake lock.
- Queue order: **Ready for pickup → Needs approval → Waiting for payment → Unpaid 30+ min**.
- Approve / Reject with a reason (the guest sees it as plain text, never HTML). When the
  reason is "item unavailable", offer to mark that item sold out at this branch in the same step.
- Mark paid: cash, card, or mobile wallet / bank transfer (JazzCash, Easypaisa, Raast,
  bank transfer) with an optional reference number.
- Cancel stale unpaid counter orders with a reason.
- Floor map: Available / In progress / Bell / Bill requested, each with colour + icon + text.
  Status is derived from data, never set by hand.
- Chimes: new order, a distinct one for "ready", and a soft reminder every 60 s while anything
  has waited over 2 minutes. Mute auto-expires.

### C. Kitchen display (1920×1080 TV and 1280×800 tablet)
- Dark theme, ≥64px touch targets, readable from 2 metres.
- Tickets oldest first: order number, table, elapsed timer, items with modifiers and notes.
- Timer thresholds from restaurant settings (default amber 10 min, red 15 min), always with a
  text label. Flashing only when `prefers-reduced-motion` is off.
- Start cooking → Mark ready, with a 10-second undo.
- Compact density toggle so a busy service fits more tickets per screen.
- Kitchen can mark an item sold out for its branch, with confirmation.

### D. Owner portal (desktop first)
- Menu: categories (reorder, hide), items (create/edit/duplicate/archive), photos (private
  bucket + an authorised media route, client-side resize), shared modifier groups showing
  "used by N items", restaurant-wide and per-branch availability and price.
- Prices typed in whole rupees with a live formatted preview.
- Optional Urdu fields (`name_ur`, `description_ur`) on categories, items, modifier groups and
  options, with RTL input.
- Settings: billing mode, tax and service charge, KDS thresholds, unpaid alert minutes,
  timezone, logo and brand colour with a live preview and a WCAG contrast check that falls
  back to the default theme when the colour fails.
- Branches and tables: CRUD, QR generation, rotate QR with a warning, printable A4 sheet
  (default 4 A6 cut-out cards per sheet; option of 1 folded tent) with English + Urdu
  "Scan to order".
- Staff: username accounts and email invites, roles and branches, deactivate, password reset.
  The last active owner cannot be removed or demoted.

### E. Local print agent (ESC/POS)
- A small Node service on the counter PC that **connects out** to the cloud and pulls print
  jobs. The cloud cannot reach into a restaurant's LAN.
- Per-branch device token (store only a hash). Jobs are acknowledged and retried.

### F. Super-admin
- Tenants, subscription tier and status, feature flags, suspend switch (suspended restaurants
  show a notice instead of the app).

---

## 5. Data model (minimum)

`restaurants, branches, tables, table_sessions, categories, menu_items, modifier_groups,
modifier_options, menu_item_modifier_groups, branch_menu_item_overrides, branch_order_counters,
orders, order_items, order_status_events, payments, call_bells, feedback, staff, print_agents,
print_jobs, subscription_plans, restaurant_subscriptions, feature_flags, vouchers`

- Enums for order status, payment status/method, bell type, staff role, billing mode, table kind.
- Composite foreign keys `(id, restaurant_id)` so cross-tenant links are impossible at DB level.
- Indexes on every FK and on `(restaurant_id, status, created_at)` for live screens.
- `updated_at` triggers; realtime publication on the live tables.
- Write pgTAP tests for RLS: cross-tenant isolation, branch scoping, role limits
  (kitchen cannot see payments, waiter cannot reject), `anon` denied, super-admin access.

---

## 6. Phases

| Phase | Scope |
|---|---|
| **1** | Schema + explicit grants + RLS + seed + generated types + folder structure. **No UI.** |
| **2** | Guest PWA: menu, item sheet, cart, ordering (both modes), tracker |
| **2.5** | **Deploy to hosted staging** (Supabase project + Vercel) and smoke-test it |
| **3** | Staff auth + floor dashboard + KDS + realtime |
| **4** | Owner portal: menu, settings, branches/tables/QR, staff |
| **5** | Bill flow: call bell, request bill, split, tips, receipts, feedback, print agent |
| **6** | Online payments (verify each provider's merchant docs first), analytics |
| **7** | Super-admin, subscriptions, feature flags, custom domains |

---

## 7. Quality bar (every phase)

- **Accessibility:** WCAG 2.2 AA, ≥44px touch targets (≥64px on KDS), visible focus, labelled
  controls, colour never the only signal, `prefers-reduced-motion` respected.
- **Layout:** 8pt spacing grid; breakpoints 640 / 768 / 1024 / 1440 / 1536. Guest screens share
  one page container with consistent gutters.
- **Testing:** unit tests for pure helpers, pgTAP for DB rules, Playwright end-to-end at 360px
  and 390px for guests and 1280px for staff, including multi-context tests (guest + manager +
  kitchen at once) and an axe scan. Typecheck, lint and a production build must pass before
  every commit.
- **Design review:** after each UI phase, capture screenshots of every key state into
  `docs/screenshots/phase-N/` with an index, so they can be reviewed without running the app.
- **Secrets:** never commit any `.env` but `.env.example`. Demo passwords live only in the
  local seed file, never in migrations. Add a check script that fails if that slips.

---

## 8. Things that need verification, not assumption

- Payment provider APIs (JazzCash, Easypaisa, Raast): read the official merchant docs before
  designing the integration.
- Tax and service charge rates differ by province; keep them configurable and let the owner
  set them.
- Review-platform policies before building any feedback-to-public-review flow.
