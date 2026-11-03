import {
  currentUser,
  database,
  response,
  session,
  validOrigin,
  validateEvent,
} from "../../../lib/store";

export async function GET(req: Request) {
  const sid = session(req);
  const db = await database();
  const rows = await db
    .prepare(
      `SELECT e.id,e.title,e.sport,e.venue,e.starts,e.capacity,e.description,e.access,e.status,e.demo,e.price,e.bizum,(e.owner=?) AS mine,
 (SELECT group_concat(n,'|') FROM (SELECT COALESCE(m.name,'Player') AS n FROM rsvps r LEFT JOIN participant_metadata m ON m.rsvp=r.id WHERE r.event=e.id AND r.role='play' AND r.state='confirmed' ORDER BY r.id)) AS names,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed') AS players,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='waitlisted') AS waiting,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='watch' AND state='confirmed') AS spectators,
 (SELECT state FROM rsvps WHERE event=e.id AND session=? AND role='play') AS myPlay,
 (SELECT state FROM rsvps WHERE event=e.id AND session=? AND role='watch') AS myWatch,
 (SELECT COALESCE(m.paid,0) FROM rsvps r LEFT JOIN participant_metadata m ON m.rsvp=r.id WHERE r.event=e.id AND r.session=? AND r.role='play' AND r.state='confirmed') AS myPaid,
 (SELECT m.name FROM participant_metadata m JOIN rsvps r ON r.id=m.rsvp WHERE r.event=e.id AND r.session=? AND r.state IN ('confirmed','waitlisted') ORDER BY CASE r.role WHEN 'play' THEN 0 ELSE 1 END LIMIT 1) AS myName,
 (SELECT COUNT(*) FROM rsvps q WHERE q.event=e.id AND q.role='play' AND q.state='waitlisted' AND q.id<=(SELECT id FROM rsvps WHERE event=e.id AND session=? AND role='play' AND state='waitlisted')) AS myWaitPosition
 FROM events e WHERE (e.status='published' AND (e.demo=0 OR e.owner=?)) OR e.owner=? OR (e.status='cancelled' AND EXISTS(SELECT 1 FROM rsvps WHERE event=e.id AND session=?)) ORDER BY e.starts`,
    )
    .bind(sid, sid, sid, sid, sid, sid, sid, sid, sid)
    .all();
  return response(req, sid, { events: rows.results.map(row => ({ ...row, myPaid: row.myPaid == null ? null : Boolean(row.myPaid), myWaitPosition: row.myWaitPosition || null })) });
}
export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 6000)
      return response(req, sid, { error: "Event is too long." }, 413);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const db = await database();
    const user = await currentUser(db, sid);
    if (user?.role !== "organiser")
      return response(req, sid, { error: "Only organiser accounts can create games." }, 403);
    const data = validateEvent(body);
    const publish = body.publish === true;
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO events (id,owner,title,sport,venue,starts,capacity,description,access,price,bizum,status,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      )
      .bind(
        id,
        sid,
        data.title,
        data.sport,
        data.venue,
        data.starts,
        data.capacity,
        data.description,
        data.access,
        data.price,
        data.bizum,
        publish ? "published" : "draft",
      )
      .run();
    return response(req, sid, { id }, 201);
  } catch (e) {
    return response(
      req,
      sid,
      { error: e instanceof Error ? e.message : "Invalid event." },
      400,
    );
  }
}
export async function PATCH(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 6500)
      return response(req, sid, { error: "Request is too long." }, 413);
    const body = JSON.parse(raw) as {
      id: string;
      action: string;
      data?: Record<string, unknown>;
    };
    const db = await database();
    const event = await db
      .prepare("SELECT * FROM events WHERE id=? AND owner=?")
      .bind(body.id, sid)
      .first<{ status: string; starts: string }>();
    if (!event)
      return response(
        req,
        sid,
        { error: "Event not found or not yours." },
        404,
      );
    if (body.action === "edit" && event.status !== "cancelled" && body.data) {
      const data = validateEvent(body.data);
      const taken = await db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE event=? AND role='play' AND state='confirmed'").bind(body.id).first<{ n: number }>();
      if ((taken?.n || 0) > data.capacity)
        return response(req, sid, { error: `${taken?.n} players are already in. Spots can't go below that.` }, 400);
      await db
        .prepare(
          "UPDATE events SET title=?,sport=?,venue=?,starts=?,capacity=?,description=?,access=?,price=?,bizum=? WHERE id=? AND owner=? AND status!='cancelled'",
        )
        .bind(
          data.title,
          data.sport,
          data.venue,
          data.starts,
          data.capacity,
          data.description,
          data.access,
          data.price,
          data.bizum,
          body.id,
          sid,
        )
        .run();
      // More spots: move waiting players up in join order.
      for (let k = 0; k < 200; k++) {
        const now = new Date().toISOString();
        const moved = await db.batch([
          db.prepare(`INSERT INTO rsvp_log (event,rsvp,action,was)
            SELECT w.event,w.id,'promote','waitlisted' FROM rsvps w
            WHERE w.id=(SELECT id FROM rsvps WHERE event=? AND role='play' AND state='waitlisted' ORDER BY id LIMIT 1)
            AND w.session NOT IN (SELECT session FROM count_optouts)
            AND EXISTS (SELECT 1 FROM events e WHERE e.id=? AND e.status='published' AND e.starts>? AND (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed')<e.capacity)`)
            .bind(body.id, body.id, now),
          db.prepare(`UPDATE rsvps SET state='confirmed' WHERE id=(SELECT id FROM rsvps WHERE event=? AND role='play' AND state='waitlisted' ORDER BY id LIMIT 1)
            AND EXISTS (SELECT 1 FROM events e WHERE e.id=? AND e.status='published' AND e.starts>? AND (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed')<e.capacity)`)
            .bind(body.id, body.id, now),
        ]);
        if (!moved[1].meta.changes) break;
      }
    } else if (
      body.action === "publish" &&
      event.status === "draft" &&
      Date.parse(event.starts) > Date.now()
    ) {
      await db
        .prepare(
          "UPDATE events SET status='published' WHERE id=? AND owner=? AND status='draft'",
        )
        .bind(body.id, sid)
        .run();
    } else if (body.action === "cancel" && event.status !== "cancelled") {
      await db.batch([
        db
          .prepare(
            "UPDATE events SET status='cancelled' WHERE id=? AND owner=?",
          )
          .bind(body.id, sid),
        db
          .prepare("UPDATE rsvps SET state='cancelled' WHERE event=?")
          .bind(body.id),
      ]);
    } else
      return response(
        req,
        sid,
        {
          error:
            "This change is not available. Past events cannot be published.",
        },
        400,
      );
    return response(req, sid, { ok: true });
  } catch {
    return response(req, sid, { error: "Invalid request." }, 400);
  }
}
