# Courtside

An organiser led sports MVP for Vivan and Maximilian's AI Native Ventures project. Working name only. The venture's current scope is defined by the September 20 organiser-led decision in the vault.

## Open it

On this laptop: http://localhost:3000

If stopped, double click `Start Courtside.command`. Source lives in `/Users/jignesh/Documents/ventures/courtside-mvp`.

## Five minute demo

1. Load sample events. All are fictional and have no real bookings.
2. Open Sunday sand social. Join to play, then register interest in watching. Observe separate counts.
3. Open Organise, create an event, and enter its title, sport, place, future time and player capacity.
4. Try Suggest event description. A real local model writes a suggestion. Check it, edit it and choose Use reviewed suggestion. The instant template helper is separate.
5. Save the draft. Edit it if needed, then Publish reviewed draft. It appears under Discover.
6. Open a second browser profile or private window at the same local URL to test a different participant. Set capacity to one before publishing to test the waitlist.
7. Cancel a player RSVP; the earliest waiting player gets that place. Spectator interest does not affect player capacity.
8. Use Prepare invitation to copy a draft, or Export pilot data to download your event records. Nothing is sent automatically.

## What is real

Durable local D1 database, API enforced ownership, drafts and publishing, Play and Watch flows, concurrency-safe capacity, waitlist, cancellation, filtering, data export and local AI inference. Records survive refresh and server restart. Authentication is an anonymous browser capability cookie, not verified identity. Clearing that cookie loses management access. No real contact data is requested.

## Deliberate limits

This is a local pilot, not a publicly launched marketplace. No payments, email, verified identities, booked venues, permits or attendance verification. Sample signups are not traction. Localhost links only work on this laptop; a public pilot needs deployment, real authentication, rate limits, hosted model configuration and a privacy review. The standing no-deployment preference has been respected.

All generated descriptions require fact checking. The model can hallucinate despite its instructions. It cannot publish, message people or modify event fields. Requests time out after 45 seconds; the instant template remains available. Model is already installed locally and no paid API key is used. Only user-entered event facts go to the local model.

Five real organiser interviews remain necessary. This build does not validate the problem, willingness to pay, spectator demand or a defensible advantage. See `SCOPE.md`, `AI_ORCHESTRATION_LOG.md`, `architecturedoc.md` and `verification/`.

## Development

Node 22.13 or newer, npm. `npm ci`, `npm run dev -- --host 127.0.0.1`. Checks: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`. DB schema: `db/schema.ts`, migrations: `drizzle/`. Local runtime also initializes tables with prepared statements. Final pilot state uses `.wrangler/pilot-state`; prior verifier state is preserved in `.wrangler/state`.

Local AI: existing Ollama service on 127.0.0.1:11434 with qwen2.5:3b. Do not expose this development server or Ollama directly to the internet.

Security residual: production dependency audit reports zero findings, but the full toolchain has 14 advisories, including server/build tooling. See `verification/final-checks.md`. Resolve these and retest before deploying. Browser interactions and visual/mobile QA have not been executed; the independent reviewer verified the API and inspected UI source.

## Research used

* [Ollama chat API](https://docs.ollama.com/api/chat) and [structured output](https://docs.ollama.com/capabilities/structured-outputs)
* [Eventbrite waitlist operations](https://www.eventbrite.com/help/en-us/articles/817355/)
* [W3C forms](https://www.w3.org/WAI/tutorials/forms/)
* [NIST generative AI risk profile](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=958388)
* [EDPB security guidance](https://www.edpb.europa.eu/sme/be-compliant/secure-personal-data_en)

These informed implementation, not evidence of customer demand.
