import { database, participantName, response, session, validOrigin } from "../../../lib/store";
export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 1000) return response(req, sid, { error: "Request is too long." }, 413);
    const { event, role, action, name: suppliedName } = JSON.parse(raw) as {
      event: string;
      role: string;
      action: string;
      name?: unknown;
    };
    if (
      typeof event !== "string" ||
      !["play", "watch"].includes(role) ||
      !["join", "cancel"].includes(action)
    )
      return response(req, sid, { error: "Invalid RSVP." }, 400);
    const db = await database();
    if (action === "join") {
      let name: string;
      try { name = participantName(suppliedName); }
      catch (error) { return response(req, sid, { error: (error as Error).message }, 400); }
      await db.batch([
        db.prepare("DELETE FROM participant_metadata WHERE rsvp IN (SELECT id FROM rsvps WHERE event=? AND session=? AND role=? AND state='cancelled') AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='published' AND starts>?)")
          .bind(event, sid, role, event, new Date().toISOString()),
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
        db.prepare(`INSERT INTO participant_metadata (rsvp,name,paid)
          SELECT r.id,?,0 FROM rsvps r JOIN events e ON e.id=r.event
          WHERE r.event=? AND r.session=? AND r.role=? AND r.state IN ('confirmed','waitlisted') AND e.status='published' AND e.starts>?
          ON CONFLICT(rsvp) DO UPDATE SET name=excluded.name`)
          .bind(name, event, sid, role, new Date().toISOString()),
        // Learning loop: log the join time of a player registration (no name, no cookie id).
        db.prepare(`INSERT INTO rsvp_log (event,rsvp,action,was)
          SELECT r.event,r.id,'join',r.state FROM rsvps r
          WHERE r.event=? AND r.session=? AND r.role='play' AND r.state IN ('confirmed','waitlisted')
          AND NOT EXISTS(SELECT 1 FROM rsvp_log l WHERE l.rsvp=r.id AND l.action='join')
          AND NOT EXISTS(SELECT 1 FROM count_optouts WHERE session=?)`)
          .bind(event, sid, sid),
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
      db.prepare("UPDATE participant_metadata SET paid=0 WHERE rsvp IN (SELECT id FROM rsvps WHERE event=? AND session=? AND role=?)")
        .bind(event, sid, role),
      // Learning loop: log the cancellation and whether the place was confirmed.
      db.prepare(`INSERT INTO rsvp_log (event,rsvp,action,was)
        SELECT r.event,r.id,'cancel',r.state FROM rsvps r
        WHERE r.event=? AND r.session=? AND r.role='play' AND r.state IN ('confirmed','waitlisted')
        AND NOT EXISTS(SELECT 1 FROM count_optouts WHERE session=?)`)
        .bind(event, sid, sid),
      db
        .prepare(
          "UPDATE rsvps SET state='cancelled' WHERE event=? AND session=? AND role=?",
        )
        .bind(event, sid, role),
      // Learning loop: log the promotion that the next statement performs (same conditions).
      db.prepare(`INSERT INTO rsvp_log (event,rsvp,action,was)
        SELECT w.event,w.id,'promote','waitlisted' FROM rsvps w
        WHERE w.id=(SELECT id FROM rsvps WHERE event=? AND role='play' AND state='waitlisted' ORDER BY id LIMIT 1)
        AND w.session NOT IN (SELECT session FROM count_optouts)
        AND EXISTS (SELECT 1 FROM events e WHERE e.id=? AND e.status='published' AND e.starts>? AND (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed')<e.capacity)`)
        .bind(event, event, new Date().toISOString()),
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
