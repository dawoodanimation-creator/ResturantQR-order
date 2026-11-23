# Floor Dashboard Module (`/floor`)

Designed for tablet use (1280x800 first) by managers, captains, and floor waiters.

### Key Responsibilities:
- "Start shift" overlay to acquire audio context and Screen Wake Lock API.
- Queue prioritization:
  1. Ready for pickup
  2. Needs approval (POST_PAY)
  3. Waiting for payment (PRE_PAY)
  4. Unpaid 30+ minutes
- Order action with concurrency locking (`transition_order_status`).
- Approve / Reject with plain text reason.
- Mark paid (Cash, Card, JazzCash, Easypaisa, Raast, Bank Transfer).
- Interactive floor table map with derived state (Available, In progress, Bell, Bill requested).
- Audio chime alerts with auto-expiring mute.
