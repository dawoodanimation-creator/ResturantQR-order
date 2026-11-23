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
