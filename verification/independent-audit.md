# Courtside independent verification

Date: 2026-09-20
Target: http://localhost:3000
Source: /Users/jignesh/Documents/ventures/courtside-mvp
Role: independent HTTP and code reviewer. No app source edits, no browser actions, no deployment.

## Verdict

Core local pilot API passes the exercised acceptance and adversarial checks after fixes. No outstanding blocker was observed in the tested scope. This is not production security certification or demand validation.

## Executed evidence

Initial full HTTP suite: 34 checks passed, zero failed. It covered draft creation/privacy, owner-only publication/cancellation, published discovery, separate player/spectator RSVP state, duplicate idempotence, cancellation/promotion, invalid event fields, unsupported role, origin protection, refresh persistence, and sample token fix.

Atomic capacity test: 20 concurrent sessions against one player place yielded exactly one confirmed and 19 waitlisted. Final revised join implementation repeated with 30 sessions: exactly one confirmed and 29 waitlisted. Player cancellation promoted exactly one, and spectator registration remained independent.

Final revision suite: 11 checks passed, zero failed. Owner draft edit returned 200 and persisted. Foreign edit returned 404. Invalid edit and published-event edit returned 400. Cancelled-event rejoin returned 409 and preserved both cancelled RSVP records and attendee visibility. An actual 63-second clock-expiry test returned 409 for both previously confirmed and new participants after the event started.

Additional malformed inputs: malformed JSON, null, and array returned 400; oversized event body returned 413. Responses set no-store and nosniff, and session cookies are HttpOnly and SameSite=Strict. Local HTTP does not use Secure; source adds Secure for HTTPS.

Privacy and text: public event projection has no owner token, session column or participant roster. Submitted script-tag text was stored unchanged; source renders text through React interpolation, with no dangerous HTML sink found. No email collection observed.

AI HTTP checks: foreign origin 403, invalid input 400, oversized input 413, valid input 200 with provider `Local Ollama · qwen2.5:3b`, reviewRequired true, and a fictional pilot description. Source fixes provider URL to loopback and model to qwen2.5:3b. Source UI requires explicit suggestion application, draft save, and publication; template and model assistance are separately described.

## Defects found and independently retested

1. Critical: sample event IDs exposed owner cookie token, allowing public viewer to impersonate owner. Reproduced forged cookie yielding mine=1 and unauthorized cancellation 200. Fixed opaque hashed sample suffix; fresh-session impersonation retest returned 404. Old exposed test data must remain isolated from final runtime.
2. Waitlist fairness: A joined, B joined, A cancelled/rejoined within the same second, then holder cancelled; A incorrectly promoted ahead of B. Fixed fresh insertion ID and ID-based queue order. Retest: A waitlisted, B confirmed.
3. Expired event duplicate join: prior member received 200 confirmed after start while new member received 409. Fixed availability check in result lookup. Real-clock final retest: both returned 409.
4. Cancellation visibility: attendee could no longer retrieve cancelled event. Fixed session-scoped access to cancelled event and My RSVPs filter; HTTP attendee sees cancelled while stranger cannot. UI filter verified by code, not browser.
5. Cancelled RSVP deletion on rejected rejoin: corrected DELETE predicate only applies to open future events. Final HTTP rejected rejoin preserved cancelled RSVP visibility.

## Limits and residuals

Browser interaction, visual layout, accessibility, restart persistence and fresh final-runtime database isolation were not independently executed in this reviewer role. Refresh persistence was executed. Main agent owns server lifecycle and browser verification.

AI received one live happy-path check plus input/origin checks, not exhaustive prompt-injection or factual reliability testing. Its returned description was 32 words despite the prompt requesting 40 to 70, a nonblocking wording-quality residual. Human review remains required.

Cookie identity is browser-scoped, not verified identity. No production authorization, abuse resistance, multi-device recovery, real venue booking, attendance, payments or business demand is certified.
