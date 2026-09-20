# Courtside pilot architecture

Scope: organiser led Barcelona sports events with distinct player registrations and spectator interest. Working name Courtside is an implementation choice, not a user-approved brand. Latest September 20 organiser-led vault decision takes precedence over older newcomer-first text.

Visual thesis: warm paper, deep pine and acid lime; bold editorial typography with an airy, practical event workspace.
Content: event discovery, event detail and Play/Watch actions, organiser workspace and event composer.
Interaction: short entrance fade, responsive filter changes, clear modal and RSVP state transitions; respect reduced motion.

Vinext/React application with Cloudflare D1 SQLite durable records. Same-origin JSON API. Anonymous random HttpOnly session capability owns drafts and registrations; this is a private testing identity, not a verified user account. Losing cookies loses management access. No real contact details required or collected. No public deployment without the user's explicit approval per standing instructions.

Events: draft/published/cancelled, title, sport, venue, date with explicit offset (Europe/Madrid), description, player capacity and spectator access. Registrations: one per browser per event and role, separate play/watch states. Atomic SQL insert determines player waitlist; cancellation automatically promotes earliest waiting player. Spectators express interest, never a reserved seat. No invented historical traction.

Writing helper: live local Ollama qwen2.5:3b produces an editable description from title, sport, venue and notes. It is a fixed loopback call, with bounded input, timeout, schema output, plain text validation and no tools. Human explicitly accepts a suggestion, saves a draft and publishes separately. Deterministic templates remain available as a clearly labelled fallback. No attendee identity is sent to the model. AI can still make unsupported claims; human review is required. Structured event fields are authoritative. A hosted version needs a separate configured model provider; it cannot reach this laptop's Ollama.

Out of scope: payments, verified identities, venue bookings, permits, automatic outreach, real event imports, chat, predictive demand, self-improvement, commercial launch. Five organiser interviews remain required to validate the problem.

Verification: independent read-only reviewer, HTTP behaviour and adversarial checks, TypeScript and production build; bounded repair loop max three review cycles, document unresolved issues.
