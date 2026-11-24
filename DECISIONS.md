# Architectural Decisions Log (`DECISIONS.md`)

This log records every non-obvious architecture and design decision for the project along with its concise reasoning.

| Decision ID | Area | Decision | Reasoning |
|---|---|---|---|
| DEC-001 | Financial Modeling | Store money as integer paisa (`*_paisa`, `bigint`) and rates as basis points (`*_bps`, `integer`). | Eliminates floating-point rounding errors across line-item and tax calculations. |
| DEC-002 | Realtime Engine | Use Supabase Realtime exclusively; do not use Socket.io. | Next.js serverless execution environments cannot sustain long-running stateful WebSocket server connections. |
| DEC-003 | Anonymous Access | Revoke all schema grants from Postgres role `anon`. | Forces all guest reads/writes through authenticated server actions/route handlers, preventing client tampering of prices or states. |
| DEC-004 | Least Privilege Grants | Deny blanket `UPDATE` on orders to `authenticated`; use column-level grants excluding `*_paisa`. | Prevents staff roles from tampering with order totals; financial totals are updated solely via SECURITY DEFINER procedures. |
| DEC-005 | Order Status Lifecycle | Enum: `awaiting_payment`, `pending_approval`, `accepted`, `preparing`, `ready`, `served`, `rejected`, `cancelled`. | Drops redundant `placed`; derives counter "Collected" vs dine-in "Served" in UI from billing mode; limits undo transitions. |
| DEC-006 | Staff Usernames | Non-email staff accounts use the RFC 2606 reserved TLD `.invalid` (`<user>@staff-login.invalid`). | Guarantees synthetic staff emails will never trigger or attempt outbound mail delivery. |
| DEC-007 | Tenancy Guarantees | Enforce composite foreign keys `(id, restaurant_id)` across all tenant tables. | Makes cross-tenant data references impossible at the Postgres schema constraint level. |
| DEC-008 | Table Kinds | Restrict `table_kind` to `dine_in` and `counter`. | Delivery and takeaway are explicitly out of scope for the dine-in / counter ordering model. |
| DEC-009 | Restaurant Suspension | Store `suspended_at timestamptz` instead of a boolean `is_suspended`. | Captures both the active suspension state and the exact audit timestamp when suspension occurred. |
| DEC-010 | Secrets Safety | Automated pre-commit/CI check fails if any `.env` other than `.env.example` is tracked or staged. | Protects developer and production credentials from accidental git commits. |
| DEC-011 | Guest Session Mount | Open table session via Server Action after client mount instead of page GET. | Prevents crawlers, link unfurlers, and browser prefetching from creating ghost table sessions. |
| DEC-012 | Price Protection | Re-price every line item server-side and trigger a "was X, now Y" confirmation if total changes. | Prevents client-side price tampering while providing transparent UX when menu prices update. |
| DEC-013 | Mobile Density | Use compact 72-76px horizontal cards with dedicated 44px '+' quick-add touch targets. | Satisfies the requirement of >=5 items visible on standard 390px mobile screens without sacrificing tap accessibility. |
| DEC-014 | Terminal Step Mapping | Status `served` dynamically derives guest UI label as 'Collected' (PRE_PAY) or 'Served' (POST_PAY). | Avoids duplicate backend terminal states while maintaining clear domain vocabulary for both dining modes. |
| DEC-015 | Modifier UX & Accessibility | Auto-scroll and focus the first invalid modifier group on submit without summary error banners. | Guides mobile users directly to missing required inputs without wasting vertical screen space on redundant banner text. |
| DEC-016 | Next.js 16 Streaming | Use export const instant = false for dynamic QR guest routes under Next.js 16 cacheComponents. | Enables Partial Prerendering (PPR) dynamic streaming without failing build-time static generation on uncached table params. |
| DEC-017 | SSR Storage Fallback | Provide in-memory storage fallback for useCartStore when window.localStorage is undefined. | Prevents runtime crashes in Next.js SSR and Node.js testing environments while persisting state in browser. |
| DEC-018 | Unit Test Runner | Use Node.js native test runner (node --test) with experimental strip-types for pure helper unit testing. | Provides zero-dependency, sub-second execution for unit tests without bloating dependencies. |
| DEC-019 | Rate Limiting Enforcement | Enforce 15s device cooldown, <=5 orders/10m per device, and <=20 orders/10m per session via pure evaluator. | Exactly enforces SPEC §3 Rule 6 protecting against double-taps and table spam while allowing multi-guest shared table ordering. |

