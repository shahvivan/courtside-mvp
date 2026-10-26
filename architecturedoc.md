# CourtSide unified architecture

## Session 6 update (hackathon of 13 October 2026)

Documented on 26 October 2026. This section describes what the end-of-class commit 0c982fd (13 October 2026, 10:08) added. The sections below describe the full app.

Goal of the hackathon: user proof for our riskiest guess, that a casual player can join a game alone, within two minutes, through a join link with an instant status.

What changed on 13 October:

1. Joining asks for a first name, checked on the server, so the organiser's roster shows who is coming. The player chooses Play or Watch.
2. Instant status after joining: place saved, waitlist number, or watching. Spectators never use player places.
3. Cancellation: "I can't make it" and "Leave the waitlist". The earliest waitlisted player is promoted automatically (first in, first out).
4. Organiser-only roster with a manual paid / not paid mark for confirmed players. Decision on 13 October: CourtSide stays free and never moves money. The mark only records payments made directly to the organiser, because we believe chasing payments is a recurring problem for organisers (not yet tested).
5. The Session 4/5 evidence review page now lives in the same app as a separate, clearly synthetic page.

Key choices: one app instead of a separate join page; capacity and the waitlist are enforced in the database so two people cannot take the last place; first names only; an anonymous browser cookie instead of accounts; runs locally, with no public hosting yet.

Not built: payment processing, notifications, accounts, public hosting.

Open assumptions to test: people join without help; a waitlist number is understood as "no place yet"; organisers keep the paid mark up to date. Planned test: 12 casual players, target at least 10 joining alone within two minutes.

## Product

One React/Vinext app: Discover → event details → named Play/Watch RSVP → My RSVPs. Organise manages drafts, publication, rosters and a paid/unpaid mark. Evidence review links to a separate classroom fixture with a return link.

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
