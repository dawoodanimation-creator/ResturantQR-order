# Local Print Agent (ESC/POS)

A lightweight Node.js daemon running on local counter PCs in restaurants.

### Architecture:
- Connects **outbound** from the restaurant LAN to the cloud (pulling print jobs).
- Authenticates using a hashed device token (`token_hash` in `print_agents`).
- Pulls pending jobs from `print_jobs` table via Supabase Realtime / polling fallback.
- Renders and prints ESC/POS receipt commands to network or USB thermal printers.
- Acknowledges printed jobs or logs retry count.
