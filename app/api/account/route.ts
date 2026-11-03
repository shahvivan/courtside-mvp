import { database, response, session, validOrigin } from "../../../lib/store";

type Role = "organiser" | "player";
type User = { sid: string; name: string; email: string; role: Role; salt: string; hash: string };

const ITERATIONS = 100000;
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(password: string, saltHex: string) {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256));
}
function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function users() {
  const db = await database();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('organiser','player')), salt TEXT NOT NULL, hash TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP)`,
  ).run();
  return db;
}
const publicUser = (u: User) => ({ name: u.name, email: u.email, role: u.role });

export async function GET(req: Request) {
  const sid = session(req);
  const db = await users();
  const user = await db.prepare("SELECT * FROM users WHERE sid=?").bind(sid).first<User>();
  return response(req, sid, { user: user ? publicUser(user) : null });
}

export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req)) return response(req, sid, { error: "Origin not allowed." }, 403);
  let body: { action?: string; name?: unknown; email?: unknown; password?: unknown; role?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 1000) return response(req, sid, { error: "Request is too long." }, 413);
    body = JSON.parse(raw);
  } catch {
    return response(req, sid, { error: "Invalid request." }, 400);
  }
  const db = await users();
  if (body.action === "logout") {
    return response(req, crypto.randomUUID(), { user: null });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return response(req, sid, { error: "Enter a valid email address." }, 400);
  if (body.action === "signup") {
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const role = body.role;
    if (role !== "organiser" && role !== "player") return response(req, sid, { error: "Choose how you'll use CourtSide." }, 400);
    if (!name || name.length > 60) return response(req, sid, { error: "Enter your first name." }, 400);
    if (password.length < 8 || password.length > 200) return response(req, sid, { error: "Use a password of at least 8 characters." }, 400);
    if (await db.prepare("SELECT 1 FROM users WHERE email=?").bind(email).first())
      return response(req, sid, { error: "An account with this email already exists. Log in instead." }, 409);
    // Keep the games this browser already owns, unless this browser is already tied to another account.
    const taken = await db.prepare("SELECT 1 FROM users WHERE sid=?").bind(sid).first();
    const newSid = taken ? crypto.randomUUID() : sid;
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const hash = await hashPassword(password, salt);
    await db.prepare("INSERT INTO users (sid,email,name,role,salt,hash) VALUES (?,?,?,?,?,?)").bind(newSid, email, name, role, salt, hash).run();
    return response(req, newSid, { user: { name, email, role } }, 201);
  }
  if (body.action === "login") {
    const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first<User>();
    const hash = await hashPassword(password, user?.salt || "00000000000000000000000000000000");
    if (!user || !sameHash(hash, user.hash)) return response(req, sid, { error: "Email or password is incorrect." }, 401);
    return response(req, user.sid, { user: publicUser(user) });
  }
  return response(req, sid, { error: "Unknown action." }, 400);
}
