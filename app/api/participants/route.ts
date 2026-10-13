import { database, response, session, validOrigin } from "../../../lib/store";

export async function GET(req: Request) {
  const sid = session(req);
  const event = new URL(req.url).searchParams.get("event");
  if (!event) return response(req, sid, { error: "Choose an event." }, 400);
  const db = await database();
  const owned = await db.prepare("SELECT id FROM events WHERE id=? AND owner=?").bind(event, sid).first();
  if (!owned) return response(req, sid, { error: "Event not found or not yours." }, 404);
  const rows = await db.prepare(`SELECT r.id,COALESCE(m.name,'Unnamed participant') AS name,r.role,r.state,
    CASE WHEN r.role='play' AND r.state='confirmed' THEN COALESCE(m.paid,0) ELSE NULL END AS paid
    FROM rsvps r LEFT JOIN participant_metadata m ON m.rsvp=r.id
    WHERE r.event=? AND r.state IN ('confirmed','waitlisted') ORDER BY r.id`).bind(event).all();
  return response(req, sid, { participants: rows.results.map(row => ({ ...row, paid: row.paid == null ? null : Boolean(row.paid) })) });
}

export async function PATCH(req: Request) {
  const sid = session(req);
  if (!validOrigin(req)) return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 500) return response(req, sid, { error: "Request is too long." }, 413);
    const { id, paid, event: bodyEvent } = JSON.parse(raw) as { id: number; paid: boolean; event?: string };
    const event = new URL(req.url).searchParams.get("event") || bodyEvent;
    if (typeof event !== "string" || !event || !Number.isSafeInteger(id) || id <= 0 || typeof paid !== "boolean")
      return response(req, sid, { error: "Invalid payment status." }, 400);
    const db = await database();
    const owned = await db.prepare("SELECT id FROM events WHERE id=? AND owner=?").bind(event, sid).first();
    if (!owned) return response(req, sid, { error: "Event not found or not yours." }, 404);
    // This is only an organiser's manual record. No money moves through CourtSide.
    // Membership and ownership are checked again inside the write to avoid a
    // cancellation racing with a payment update.
    const result = await db.prepare(`INSERT INTO participant_metadata (rsvp,name,paid)
      SELECT r.id,COALESCE(m.name,'Unnamed participant'),? FROM rsvps r
      JOIN events e ON e.id=r.event LEFT JOIN participant_metadata m ON m.rsvp=r.id
      WHERE r.id=? AND r.event=? AND r.role='play' AND r.state='confirmed' AND e.owner=? AND e.status='published'
      ON CONFLICT(rsvp) DO UPDATE SET paid=excluded.paid`).bind(paid ? 1 : 0, id, event, sid).run();
    if (!result.meta.changes) return response(req, sid, { error: "Only confirmed players in active events can be marked paid." }, 409);
    return response(req, sid, { ok: true, paid });
  } catch {
    return response(req, sid, { error: "Invalid request." }, 400);
  }
}
