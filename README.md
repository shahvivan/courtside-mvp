# CourtSide

One project for Vivan and Maximilian: discover a game, join to play or watch, manage confirmations and track whether players have paid the organiser. CourtSide does not collect or move money.

## Start here

Requires Node.js 22.13 or newer and npm. No paid API key or cloud account is needed locally.

```sh
git clone https://github.com/shahvivan/courtside-mvp.git
cd courtside-mvp
npm ci
npm run dev
```

Open **http://localhost:3000**. After installing dependencies, macOS users can also double-click `Start Courtside.command`. Keep the terminal running. If port 3000 is occupied, run `npm run dev -- --port 3001` and open http://localhost:3001.

## Find your way around

| Area | What to do |
| --- | --- |
| Discover | Load fictional sample events, find a game, enter a first name, join to play or watch. |
| My RSVPs | Check your place or waitlist position. Use “I can't make it” to cancel; the earliest waiting player moves up automatically. |
| Organise | Create, edit and publish reviewed event drafts. Open your event to see its roster and mark confirmed players paid or unpaid. |
| Evidence review | Inspect the separate Session 4/5 synthetic fixture, record reasons, export review history, then return to games. |

Paid flags are organiser-entered notes about the current registration, not bank receipts or an accounting ledger. Cancellation clears the flag; rejoining starts unpaid and requires the organiser to recheck any prior payment. No money is refunded or moved by these actions. Keep external payment records separately.

## Two-person demo

1. Create and publish a fictional event with one player place.
2. In another browser profile/private window at the same address, enter a fictional first name and join to play.
3. Use a third browser session to join the waitlist. Cancel the first player's place; refresh the waiting browser to confirm promotion.
4. In the organiser's browser, mark the confirmed player paid. Refresh the participant view to see the updated note.
5. Open Evidence review. Its fictional payments and local review notes do not change the event database.

## Working together

GitHub is the shared source of truth. Pull before starting, use a feature branch and open a pull request so your partner can review changes. Do not force-push or commit environment files, database state or dependencies.

```sh
git pull --ff-only
git switch -c feature/your-change
```

GitHub shares **code, not running event data**. Each laptop's local database is separate. A localhost invitation works only on the laptop running it. A shared hosted app requires separate approval and a security/authentication upgrade. This repository update is not a deployment; the dev server listens only on loopback.

## What was combined

The original React/Vinext event app remains the entry point. Later standalone signup ideas now use its database-backed flows: names, cancellation, FIFO waitlist promotion and owner-only paid/unpaid notes. The original Session 4/5 evidence tool remains at `/review/index.html`, explicitly separate from the event roster. Classroom handouts were not changed.

## Data and limits

Records persist in local D1 SQLite under `.wrangler/pilot-state`. An anonymous HttpOnly cookie controls access, not a verified account. Clearing cookies loses management access. Use fictional first names and sample data. No venue reservations, attendance verification, customer validation or verified payment evidence are claimed.

Evidence-review notes use browser localStorage, not D1 or a production audit trail. They do not synchronise across devices.

AI description assistance is optional: local Ollama with `qwen2.5:3b`. If unavailable, the labelled template/manual editing still works. Review all AI wording. AI cannot publish, contact people or handle money; only event draft facts, not attendee names, go to the model.

This is a local prototype, not production-ready software. Do not expose the dev server or Ollama to the internet. Prior toolchain advisories and anonymous identity require review before deployment. See `verification/unified-integration.md` for current checks and limits.

## Checks and structure

```sh
npm run lint
npx tsc --noEmit
npm run build
node public/review/test.cjs
# With a local server running; creates fictional test events:
node verification/integration-api.mjs http://127.0.0.1:3000
```

`app/`: UI and API. `lib/`: data helpers/types. `db/` and `drizzle/`: schema. `public/review/`: evidence fixture. See `architecturedoc.md`, `SCOPE.md`, and `verification/`. September verification files are historical, not a claim about this integration.
