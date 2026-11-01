import assert from "node:assert/strict";

// Session 7 learning-loop check. Run against a fresh local dev server:
//   node verification/learning-loop.mjs http://127.0.0.1:3000
// Creates fictional games that start ~70 seconds ahead, so it takes about 2 minutes.
const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions++; console.log("ok -", message); };
function client() {
  let cookie = "";
  return async (path, method = "GET", data) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: base, "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: await res.json() };
  };
}
const owner = client();
const starts = new Date(Date.now() + 70000).toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function game(capacity) {
  const created = await owner("/api/events", "POST", {
    title: "Learning loop test", sport: "Beach volleyball", venue: "Local test beach", starts, capacity,
    description: "Automated local verification, not a real event.", access: "Test only",
  });
  await owner("/api/events", "PATCH", { id: created.data.id, action: "publish" });
  return created.data.id;
}

// 1. Before any finished games there is no suggestion.
const early = await owner(`/api/learning?sport=Beach%20volleyball&starts=${encodeURIComponent(starts)}&capacity=4`);
check(early.data.suggestion.ready === false, "no suggestion before 3 finished games");

// 2. Three games of 4 places. In each: 5 players join (1 waitlisted), 1 confirmed player cancels
//    late (the waitlisted one is promoted), and 1 confirmed player does not show.
const games = [];
for (let g = 0; g < 3; g++) {
  const id = await game(4);
  const ps = Array.from({ length: 5 }, () => client());
  for (const [i, p] of ps.entries()) await p("/api/rsvp", "POST", { event: id, role: "play", action: "join", name: ["Ana", "Ben", "Carla", "Dani", "Eli"].at(i) });
  const cancel = await ps[0]("/api/rsvp", "POST", { event: id, role: "play", action: "cancel" });
  check(cancel.data.state === "cancelled", `game ${g + 1}: late cancellation saved`);
  games.push(id);
}
// An opted-out player is never counted.
const quiet = client();
await quiet("/api/learning", "POST", { action: "optout" });
await quiet("/api/rsvp", "POST", { event: games[0], role: "watch", action: "join", name: "Quiet" });
check((await quiet("/api/learning")).data.optedOut === true, "player can leave their sign-ups out");

const early2 = await owner("/api/learning", "POST", { action: "attendance", event: games[0], rsvp: 1, showed: true });
check(early2.status === 409, "attendance is refused before kickoff");
console.log("waiting for kickoff…");
await sleep(Math.max(0, Date.parse(starts) - Date.now() + 2000));

for (const [g, id] of games.entries()) {
  const roster = await owner(`/api/participants?event=${id}`);
  const confirmed = roster.data.participants.filter((p) => p.role === "play" && p.state === "confirmed");
  check(confirmed.length === 4, `game ${g + 1}: 4 confirmed after promotion`);
  for (const [i, p] of confirmed.entries())
    await owner("/api/learning", "POST", { action: "attendance", event: id, rsvp: p.id, showed: i !== 0 });
  const closed = await owner("/api/learning", "POST", { action: "close", event: id });
  check(closed.data.result.lateCancels === 1 && closed.data.result.noShows === 1, `game ${g + 1}: 1 late cancel + 1 no-show counted`);
}

// 3. Now the loop suggests reserves: 6 lost of 12 places = 50% rate.
const ready = await owner(`/api/learning?sport=Beach%20volleyball&starts=${encodeURIComponent(starts)}&capacity=10`);
const s = ready.data.suggestion;
check(s.ready && Math.abs(s.rate - 0.5) < 1e-9 && s.predicted === 5 && s.reserves === 5 && s.stillComing, "suggests 5 reserves for 10 places at a 50% drop rate");

// 4. The rate being set for the first time goes to the human review list.
const review = await owner("/api/learning");
check(review.data.changes.length === 1 && review.data.changes[0].old_rate === null, "first rate is logged for review");
await owner("/api/learning", "POST", { action: "reviewed", id: review.data.changes[0].id });
check((await owner("/api/learning")).data.changes[0].reviewed_at, "founder can mark the change reviewed");

// 5. Organiser can switch suggestions off; another browser cannot see this organiser's learning.
await owner("/api/learning", "POST", { action: "settings", suggestions: false });
const off = await owner(`/api/learning?sport=Beach%20volleyball&starts=${encodeURIComponent(starts)}&capacity=10`);
check(off.data.suggestion.off === true, "organiser can switch suggestions off");
const stranger = client();
check((await stranger(`/api/learning?event=${games[0]}`)).status === 404, "another browser cannot read a game's learning data");
check((await stranger("/api/learning", "POST", { action: "close", event: games[1] })).status === 404, "another browser cannot finish someone else's game");

console.log(`${assertions} assertions passed`);
