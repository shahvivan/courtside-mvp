import assert from "node:assert/strict";

// Run against your own local development server. Uses isolated browser cookies,
// creates labelled test events and cancels them again in a finally block.
const base = (process.argv[2] || process.env.COURTSIDE_TEST_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
function client() {
  let cookie = "";
  return async (path, method = "GET", data, origin = base) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: origin, "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { parsed = { error: text }; }
    return { status: res.status, data: parsed };
  };
}

const owner = client();
const outsider = client();
const players = Array.from({ length: 5 }, () => client());
const ids = [];
async function makeEvent(capacity) {
  const created = await owner("/api/events", "POST", {
    title: "API verification event", sport: "Padel", venue: "Local test court",
    starts: new Date(Date.now() + 86400000).toISOString(), capacity,
    description: "Automated local verification, not a real event.", access: "Test participants only",
  });
  check(created.status === 201, "owner can create event");
  ids.push(created.data.id);
  const published = await owner("/api/events", "PATCH", { id: created.data.id, action: "publish" });
  check(published.status === 200, "owner can publish event");
  return created.data.id;
}
async function eventFor(who, id) {
  return (await who("/api/events")).data.events.find(e => e.id === id);
}
async function roster(id) { return (await owner(`/api/participants?event=${id}`)).data.participants; }
const join = (who, event, name, role = "play") => who("/api/rsvp", "POST", { event, action: "join", role, name });
const leave = (who, event, role = "play") => who("/api/rsvp", "POST", { event, action: "cancel", role });
try {
  // Establish each cookie before concurrent calls; browser identity must be stable.
  await Promise.all([owner, outsider, ...players].map(who => who("/api/events")));
  const event = await makeEvent(1);
  check((await join(players[0], event, "")).status === 400, "empty name rejected");
  check((await join(players[0], event, "<script>bad</script>")).status === 400, "markup name rejected");
  check((await join(players[0], event, "Éva")).data.state === "confirmed", "Unicode first name accepted");
  check((await join(players[1], event, "Ben")).data.state === "waitlisted", "full event waitlists second player");
  check((await join(players[2], event, "Cam")).data.state === "waitlisted", "third player waitlisted");
  check((await join(players[3], event, "Dara", "watch")).data.state === "confirmed", "watch does not consume capacity");
  check((await eventFor(players[1], event)).myWaitPosition === 1, "first waitlist position shown");
  check((await eventFor(players[2], event)).myWaitPosition === 2, "second waitlist position shown");
  check((await outsider(`/api/participants?event=${event}`)).status === 404, "public cannot read roster");
  const members = await roster(event);
  check(members.length === 4, "owner sees active named roster");
  check(members.every(p => !Object.hasOwn(p, "session") && !Object.hasOwn(p, "owner")), "roster never leaks session capabilities");
  const eva = members.find(p => p.name === "Éva");
  const ben = members.find(p => p.name === "Ben");
  const dara = members.find(p => p.name === "Dara");
  check((await outsider(`/api/participants?event=${event}`, "PATCH", { id: eva.id, paid: true })).status === 404, "non-owner cannot mark paid");
  check((await owner(`/api/participants?event=${event}`, "PATCH", { id: eva.id, paid: true }, "https://untrusted.example")).status === 403, "cross-origin payment update rejected");
  check((await owner(`/api/participants?event=${event}`, "PATCH", { id: ben.id, paid: true })).status === 409, "waitlist cannot be marked paid");
  check((await owner(`/api/participants?event=${event}`, "PATCH", { id: dara.id, paid: true })).status === 409, "spectator cannot be marked paid");
  check((await owner("/api/participants", "PATCH", { event, id: eva.id, paid: true })).status === 200, "owner marks current player paid");
  check((await eventFor(players[0], event)).myPaid === true, "player sees only own payment status");
  check((await eventFor(outsider, event)).myPaid === null, "outsider gets no payment information");
  check((await join(players[0], event, "Éva")).data.state === "confirmed", "repeat join idempotent");
  check((await eventFor(players[0], event)).myPaid === true, "repeat join preserves paid flag");
  await leave(players[0], event);
  check((await eventFor(players[1], event)).myPlay === "confirmed", "cancellation promotes FIFO first player");
  check((await eventFor(players[2], event)).myWaitPosition === 1, "remaining waitlist position advances");
  check((await owner(`/api/participants?event=${event}`, "PATCH", { id: eva.id, paid: true })).status === 409, "cancelled registration cannot be marked paid");
  await join(players[0], event, "Éva");
  check((await eventFor(players[0], event)).myWaitPosition === 2, "rejoin goes to queue tail");
  check((await roster(event)).find(p => p.name === "Éva").id !== eva.id, "rejoin has fresh registration id");
  await leave(players[1], event);
  check((await eventFor(players[2], event)).myPlay === "confirmed", "FIFO maintained after rejoin");
  await leave(players[2], event);
  check((await eventFor(players[0], event)).myPaid === false, "rejoin does not inherit old paid flag");

  const concurrent = await makeEvent(2);
  await Promise.all(players.map((who, i) => join(who, concurrent, ["Ari", "Ben", "Cam", "Dara", "Éva"][i])));
  const current = await eventFor(owner, concurrent);
  check(current.players === 2 && current.waiting === 3, "parallel joins never exceed capacity");
  const otherRoster = await roster(concurrent);
  check((await owner(`/api/participants?event=${event}`, "PATCH", { id: otherRoster[0].id, paid: true })).status === 409, "cross-event registration id rejected");
  const allEvents = await outsider("/api/events");
  check(allEvents.data.events.every(e => !Object.hasOwn(e, "owner") && !Object.hasOwn(e, "session")), "events never leak cookie identities");
  const confirmed = otherRoster.filter(p => p.state === "confirmed");
  const byName = new Map(["Ari", "Ben", "Cam", "Dara", "Éva"].map((name, i) => [name, players[i]]));
  await Promise.all(confirmed.map(p => leave(byName.get(p.name), concurrent)));
  const afterCancellation = await eventFor(owner, concurrent);
  check(afterCancellation.players === 2 && afterCancellation.waiting === 1, "parallel cancellations promote exactly available places");
  await owner("/api/events", "PATCH", { id: concurrent, action: "cancel" });
  check((await join(players[4], concurrent, "Éva")).status === 409, "cancelled event rejects joins");
  check((await roster(concurrent)).length === 0, "cancelled event has no active roster");
  console.log(JSON.stringify({ ok: true, assertions, base, eventIds: ids }, null, 2));
} finally {
  await Promise.all(ids.map(id => owner("/api/events", "PATCH", { id, action: "cancel" })));
}
