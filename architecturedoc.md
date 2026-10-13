# CourtSide unified architecture

## Product

One React/Vinext app: Discover → event details → named Play/Watch RSVP → My RSVPs. Organise manages drafts, publication, rosters and paid/unpaid notes. Evidence review links to a separate classroom fixture with a return link.

Visual thesis: calm warm surfaces, clear typography and CourtSide green. Content plan: navigation, workspace, filters/list, event detail, owner tools. Interaction thesis: short list entrance, visible row focus/hover and explicit pending/success states, respecting reduced motion.

## State and authority

JSON API and local D1 SQLite persist events and registrations. Atomic SQL controls capacity and FIFO promotion. Additive participant metadata records first names and manual paid flags against RSVP IDs. Owner checks are server-side, not an organiser toggle. Other sessions get aggregate event counts and their own status, not roster names or cookie capability IDs. Payment updates are restricted to active confirmed players.

Paid flags describe the current registration. Cancellation clears them; rejoin uses a fresh registration and unpaid flag. No refund is triggered and no financial ledger is provided. External payment history must stay with the organiser.

Identity is an anonymous HttpOnly SameSite capability cookie, not a verified account. Clearing it loses access. D1 state under `.wrangler/pilot-state` is ignored by Git. Different laptops have separate local databases. GitHub shares code, not running data.

The fixture under `public/review/` keeps its deterministic engine and browser localStorage. It never reads/mutates D1, sends messages or moves money. Its synthetic banner, boundary notice and return link distinguish it from the live pilot roster.

## AI and release boundaries

Optional local Ollama drafts descriptions from event facts, excluding attendee names. Users review/apply, save and publish separately. A labelled template works without the model. AI has no publication, messaging or money authority.

No model training, customer validation, payments, public hosting or real authentication is added. Existing handouts and their timing claims are not changed. Integration incorporates the signup ideas into the original app rather than running two disconnected signup systems.

Verify lint, types, build, fixture regressions, multi-session API behaviour, privacy/ownership, waitlist concurrency and browser navigation. Independent review gates source publication; at most three substantive fix/review rounds before escalating. A shared hosted version requires separate approval, authentication, rate limiting, privacy/security work and dependency review.
