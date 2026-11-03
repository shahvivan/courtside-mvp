import { env } from "cloudflare:workers";
import { setupLearning } from "./learning";

export async function database() {
  const db = env.DB;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, sport TEXT NOT NULL, venue TEXT NOT NULL, starts TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 200), description TEXT NOT NULL, access TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', demo INTEGER NOT NULL DEFAULT 1)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS rsvps (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, session TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('play','watch')), state TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(event,session,role))`,
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_rsvp_event_role_state ON rsvps(event,role,state)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS participant_metadata (rsvp INTEGER PRIMARY KEY, name TEXT NOT NULL, paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0,1)))`,
    ),
  ]);
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('organiser','player')), salt TEXT NOT NULL, hash TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP)`,
  ).run();
  await setupLearning(db);
  if (!paymentColumns) {
    const cols = await db.prepare("PRAGMA table_info(events)").all<{ name: string }>();
    const have = new Set(cols.results.map((c) => c.name));
    for (const col of ["price", "bizum"])
      if (!have.has(col)) await db.prepare(`ALTER TABLE events ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`).run();
    paymentColumns = true;
  }
  return db;
}
let paymentColumns = false;
export async function currentUser(db: D1Database, sid: string) {
  return db.prepare("SELECT name, role FROM users WHERE sid=?").bind(sid).first<{ name: string; role: "organiser" | "player" }>();
}

export function session(req: Request) {
  const existing = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)courtside=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return existing || crypto.randomUUID();
}
export function response(
  req: Request,
  sid: string,
  data: unknown,
  status = 200,
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": `courtside=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=34560000${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
export function validOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return origin === new URL(req.url).origin;
}
export function participantName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Please enter your first name.");
  const name = value.trim().replace(/\s+/gu, " ");
  if (!name || name.length > 60 || !/^[\p{L}\p{M} .’'\-]+$/u.test(name) || !/\p{L}/u.test(name))
    throw new Error("Enter a first name using 1–60 characters.");
  return name;
}
export const sports = [
  "Beach volleyball",
  "Padel",
  "Basketball",
  "Beach tennis",
];
export function validateEvent(data: Record<string, unknown>) {
  for (const [field, min, max] of [
    ["title", 3, 100],
    ["venue", 3, 160],
    ["description", 0, 2000],
    ["access", 3, 300],
  ] as const) {
    if (
      typeof data[field] !== "string" ||
      (data[field] as string).trim().length < min ||
      (data[field] as string).length > max
    )
      throw new Error(
        field === "title" ? "Give the game a name (3–100 characters)."
          : field === "venue" ? "Add where you'll play (3–160 characters)."
            : field === "description" ? "Keep the notes under 2,000 characters."
              : "Spectator info must be 3–300 characters.",
      );
  }
  if (!sports.includes(String(data.sport)))
    throw new Error("Choose an available sport.");
  if (
    !Number.isInteger(data.capacity) ||
    Number(data.capacity) < 1 ||
    Number(data.capacity) > 200
  )
    throw new Error(
      "Player capacity must be a whole number between 1 and 200.",
    );
  if (
    typeof data.starts !== "string" ||
    !Number.isFinite(Date.parse(data.starts)) ||
    Date.parse(data.starts) < Date.now() + 60000
  )
    throw new Error("Choose an event time in the future.");
  const price = typeof data.price === "string" ? data.price.trim() : "";
  const bizum = typeof data.bizum === "string" ? data.bizum.replace(/[-.]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (price.length > 20) throw new Error("Keep the price short, for example €5.");
  if (bizum && !/^[+\d][\d ]{5,19}$/.test(bizum)) throw new Error("Enter a valid Bizum phone number.");
  return {
    price,
    bizum,
    title: String(data.title).trim(),
    sport: String(data.sport),
    venue: String(data.venue).trim(),
    description: String(data.description).trim(),
    access: String(data.access).trim(),
    capacity: Number(data.capacity),
    starts: new Date(String(data.starts)).toISOString(),
  };
}
