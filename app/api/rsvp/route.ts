import { database, response, session, validOrigin } from "../../../lib/store";
export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const { event, role, action } = (await req.json()) as {
      event: string;
      role: string;
      action: string;
    };
    if (
      typeof event !== "string" ||
      !["play", "watch"].includes(role) ||
      !["join", "cancel"].includes(action)
    )
      return response(req, sid, { error: "Invalid RSVP." }, 400);
    const db = await database();
    if (action === "join") {
      await db.batch([
        db
          .prepare(
            "DELETE FROM rsvps WHERE event=? AND session=? AND role=? AND state='cancelled' AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='published' AND starts>?)",
          )
          .bind(event, sid, role, event, new Date().toISOString()),
        db
          .prepare(
            `INSERT INTO rsvps (event,session,role,state)
    SELECT e.id,?,?, CASE WHEN ?='watch' OR (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed')<e.capacity THEN 'confirmed' ELSE 'waitlisted' END
    FROM events e WHERE e.id=? AND e.status='published' AND e.starts>?
    ON CONFLICT(event,session,role) DO NOTHING`,
          )
          .bind(sid, role, role, event, new Date().toISOString()),
      ]);
      const result = await db
        .prepare(
          "SELECT state FROM rsvps WHERE event=? AND session=? AND role=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='published' AND starts>?)",
        )
        .bind(event, sid, role, event, new Date().toISOString())
        .first<{ state: string }>();
      if (!result || result.state === "cancelled")
        return response(
          req,
          sid,
          { error: "This event is not accepting registrations." },
          409,
        );
      return response(req, sid, { state: result.state });
    }
    await db.batch([
      db
        .prepare(
          "UPDATE rsvps SET state='cancelled' WHERE event=? AND session=? AND role=?",
        )
        .bind(event, sid, role),
      db
        .prepare(
          `UPDATE rsvps SET state='confirmed' WHERE id=(SELECT id FROM rsvps WHERE event=? AND role='play' AND state='waitlisted' ORDER BY id LIMIT 1)
    AND EXISTS (SELECT 1 FROM events e WHERE e.id=? AND e.status='published' AND e.starts>? AND (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed')<e.capacity)`,
        )
        .bind(event, event, new Date().toISOString()),
    ]);
    return response(req, sid, { state: "cancelled" });
  } catch {
    return response(
      req,
      sid,
      { error: "Unable to save your RSVP. Please try again." },
      400,
    );
  }
}
