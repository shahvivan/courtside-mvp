import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join as joinPath } from "node:path";

// Red-line test: CourtSide must never use an individual player's attendance
// history to score, rank, flag or block them.
// Run against a fresh local dev server (takes about 90 seconds):
//   node verification/no-individual-scoring.mjs http://127.0.0.1:3000
const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions++; console.log("ok -", message); };

// ---------- Part 1: the code never groups attendance by person ----------
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = joinPath(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
const source = ["app", "lib"].flatMap(files).map((path) => [path, readFileSync(path, "utf8")]);
for (const [path, code] of source) {
  check(!/GROUP\s+BY\s+(?:\w+\.)?session/i.test(code), `${path}: never groups data by player (session)`);
  check(!/\b(reliab\w*|noShowCount|playerScore|banned|blocklist)\b/i.test(code), `${path}: no per-player reliability, score or ban fields`);
}
const rsvpRoute = readFileSync("app/api/rsvp/route.ts", "utf8");
check(!/\battendance\b/.test(rsvpRoute) && !/\bshowed\b/.test(rsvpRoute), "joining and the waitlist never read attendance");

// ---------- Part 2: a player who never shows up is treated like anyone else ----------
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
const absent = client(); // never turns up
const regular = client(); // always turns up
const other = client();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function game(starts, capacity) {
  const created = await owner("/api/events", "POST", {
    title: "Red line test", sport: "Basketball", venue: "Local test court", starts, capacity,
    description: "Automated local verification, not a real event.", access: "Test only",
  });
  await owner("/api/events", "PATCH", { id: created.data.id, action: "publish" });
  return created.data.id;
}
const join = (who, id, name) => who("/api/rsvp", "POST", { event: id, role: "play", action: "join", name });

// Three past games: "absent" never shows up, "regular" always does.
const soon = new Date(Date.now() + 70000).toISOString();
const past = [];
for (let i = 0; i < 3; i++) {
  const id = await game(soon, 2);
  await join(absent, id, "Alex");
  await join(regular, id, "Rita");
  past.push(id);
}
console.log("waiting for kickoff…");
await sleep(Math.max(0, Date.parse(soon) - Date.now() + 2000));
for (const id of past) {
  const roster = (await owner(`/api/participants?event=${id}`)).data.participants;
  for (const p of roster) await owner("/api/learning", "POST", { action: "attendance", event: id, rsvp: p.id, showed: p.name === "Rita" });
  await owner("/api/learning", "POST", { action: "close", event: id });
}

// A new game with one place: "absent" joins first and must get it.
const later = new Date(Date.now() + 86400000).toISOString();
const g1 = await game(later, 1);
check((await join(absent, g1, "Alex")).data.state === "confirmed", "a player with 3 no-shows still gets a free place");
check((await join(regular, g1, "Rita")).data.state === "waitlisted", "a reliable player who joins later is not moved ahead of them");

// Waitlist order is first come, first served, whatever the history.
const g2 = await game(later, 1);
await join(other, g2, "Olga");
await join(absent, g2, "Alex");
await join(regular, g2, "Rita");
const absentView = (await absent("/api/events")).data.events.find((e) => e.id === g2);
const regularView = (await regular("/api/events")).data.events.find((e) => e.id === g2);
check(absentView.myWaitPosition === 1 && regularView.myWaitPosition === 2, "waitlist order follows join order, not attendance history");
await other("/api/rsvp", "POST", { event: g2, role: "play", action: "cancel" });
const promoted = (await absent("/api/events")).data.events.find((e) => e.id === g2);
check(promoted.myPlay === "confirmed", "the first waiting player is promoted even with a bad attendance history");

// Nothing about a player's history appears in any response.
const banned = /score|reliab|noshow|no_show|history|flag|block|rank|showed|attend/i;
const keysOf = (rows) => rows.flatMap((row) => Object.keys(row));
check(!keysOf((await absent("/api/events")).data.events).some((k) => banned.test(k)), "a player never sees a score or history about themselves");
const roster = (await owner(`/api/participants?event=${g1}`)).data.participants;
check(roster.every((p) => p.showed === null), "the organiser's roster for a new game shows no past attendance");
check(!keysOf(roster).some((k) => k !== "showed" && banned.test(k)), "the organiser's roster has no score, flag or history fields");
const learning = (await owner("/api/learning")).data;
check(learning.changes.every((c) => Object.keys(c).every((k) => !/session|player|name|rsvp/i.test(k))), "the review list is about game types, never about players");

console.log(`${assertions} assertions passed`);
