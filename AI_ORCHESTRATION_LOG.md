# Build record, September 20 2026

## Exact user prompt

> look at obsidian vault and what I am doing with launching AI native ventures course.
>
> Build me an mvp.
> Use multiple agents and sub agents and an independent verifier agent and research agent for best practise

## Agent work

Main agent read vault schema, index and relevant course/venture/log pages; implemented the application. Research agent read primary operational guidance and returned requirements/sources. Product specification agent independently mapped current vault decisions to acceptance criteria and flagged stale player-first wording. Image agent produced a social preview image. Independent verifier inspected source and exercised HTTP behaviour and adversarial scenarios without changing product source. No claim is made that the agent runtime enforced a tool restriction; the reviewer followed its read-only assignment.

## Assistant decisions, not invented human judgments

Selected organiser-led workflow from the explicit September 20 vault decision. Treated older spectator-secondary prose as historical. Chose working name Courtside, a bounded anonymous local pilot and separate participant roles. Kept private course material out of the app. Used the laptop's existing Ollama model after checking availability; did not provision a paid key. Real event safety and venue permissions stay with humans. No interviews, user approval of branding or user reflections are invented.

## Problems found and revised

Independent review found sample identifiers exposed their owner capability. Replaced with opaque SHA-256 derived identifiers, and final demo uses fresh database state while test state is retained separately. Verifier found same-second cancellation/rejoin could regain old waitlist priority; now a rejoin gets a new queue ID. Expired joins and cancelled-event visibility were tightened. Draft editing added. Strict typing, lint and dependency checks informed further corrections; production package audit was clean after updating Next to a patched release.

## Human checkpoints still open

### October 13 unified integration

Vivan requested one navigable version in the existing shared GitHub repository, incorporating Claude's cancellation/waitlist promotion and paid/unpaid ideas. Work was staged on `integration/session6-unified` in a separate worktree from the preserved original project. Backend and frontend specialists implemented named database-backed RSVP and owner-only payment status, while the main agent preserved the synthetic review fixture, updated navigation/setup documentation, and ran browser checks. Independent reviewers tested API privacy, concurrency, FIFO and migration compatibility, then repeated the release gate after focused dependency security updates. See `verification/unified-integration.md` for actual results and residuals.

This work is subsequent integration, not a claim about the time or authorship of classroom sprint work. No persona answers, real interviews or customer validation were created. Session 4/5 handouts remain unchanged. Publishing GitHub source was authorised; public app deployment was not.

Vivan and Maximilian must review the product, brand and real organiser feedback. No demand validation, five-interview completion, market advantage or real traction is claimed. This log is a factual AI work record, not Vivan's personal reflection. Append his actual judgments after he tries it.

See independent report in verification for actual checks and limits. Local AI suggestions are always proposals; human must apply, save and publish separately. Documentation: https://docs.ollama.com/api/chat and https://docs.ollama.com/capabilities/structured-outputs.
