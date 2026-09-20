import {
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
      `SELECT e.id,e.title,e.sport,e.venue,e.starts,e.capacity,e.description,e.access,e.status,e.demo,(e.owner=?) AS mine,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='confirmed') AS players,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='play' AND state='waitlisted') AS waiting,
 (SELECT COUNT(*) FROM rsvps WHERE event=e.id AND role='watch' AND state='confirmed') AS spectators,
 (SELECT state FROM rsvps WHERE event=e.id AND session=? AND role='play') AS myPlay,
 (SELECT state FROM rsvps WHERE event=e.id AND session=? AND role='watch') AS myWatch
 FROM events e WHERE e.status='published' OR e.owner=? OR (e.status='cancelled' AND EXISTS(SELECT 1 FROM rsvps WHERE event=e.id AND session=?)) ORDER BY e.starts`,
    )
    .bind(sid, sid, sid, sid, sid)
    .all();
  return response(req, sid, { events: rows.results });
}
export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 6000)
      return response(req, sid, { error: "Event is too long." }, 413);
    const data = validateEvent(JSON.parse(raw));
    const db = await database();
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO events (id,owner,title,sport,venue,starts,capacity,description,access) VALUES (?,?,?,?,?,?,?,?,?)`,
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
    if (body.action === "edit" && event.status === "draft" && body.data) {
      const data = validateEvent(body.data);
      await db
        .prepare(
          "UPDATE events SET title=?,sport=?,venue=?,starts=?,capacity=?,description=?,access=? WHERE id=? AND owner=? AND status='draft'",
        )
        .bind(
          data.title,
          data.sport,
          data.venue,
          data.starts,
          data.capacity,
          data.description,
          data.access,
          body.id,
          sid,
        )
        .run();
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
