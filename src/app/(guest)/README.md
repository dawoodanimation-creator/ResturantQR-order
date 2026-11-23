# Guest PWA Module

Zero-install mobile web application accessed via QR scan at table:
`/r/[slug]/t/[token]`

### Key Responsibilities:
- Table session join / open action after mount.
- Menu browsing, category filtering, search, and item sheets.
- Modifier selection (single/multi, required/optional, zero-delta default).
- Cart drawer with live client-side Zustand store.
- Order submission (re-priced on server inside one transaction).
- Realtime order tracker (placed -> accepted -> preparing -> ready -> served).
- Call waiter / water / clean table / cutlery bell with rate limiting.
- Digital bill request, bill splitting, tips, and receipt download.
- Post-settlement feedback.
