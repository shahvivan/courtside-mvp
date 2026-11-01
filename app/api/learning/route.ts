import { database, response, session, sports, validOrigin } from "../../../lib/store";
import { closeGame, suggestionFor } from "../../../lib/learning";

export async function GET(req: Request) {
  const sid = session(req);
  const params = new URL(req.url).searchParams;
  const db = await database();
  const event = params.get("event");
  if (event) {
    const owned = await db.prepare("SELECT id FROM events WHERE id=? AND owner=?").bind(event, sid).first();
    if (!owned) return response(req, sid, { error: "Event not found or not yours." }, 404);
    const game = await db
      .prepare("SELECT predicted_drops,suggested_reserves,chosen_reserves,choice,actual_drops,closed_at FROM game_learning WHERE event=?")
      .bind(event)
      .first();
    return response(req, sid, { game: game ?? null });
  }
  const sport = params.get("sport");
  const starts = params.get("starts");
  const capacity = Number(params.get("capacity"));
  if (sport || starts) {
    if (!sport || !sports.includes(sport) || !starts || !Number.isFinite(Date.parse(starts)) || !Number.isInteger(capacity) || capacity < 1 || capacity > 200)
      return response(req, sid, { error: "Add sport, start time and player places to see a suggestion." }, 400);
    return response(req, sid, { suggestion: await suggestionFor(db, sid, { sport, starts, capacity }) });
  }
  const [optout, setting, changes] = await Promise.all([
    db.prepare("SELECT 1 AS x FROM count_optouts WHERE session=?").bind(sid).first(),
    db.prepare("SELECT suggestions FROM learning_settings WHERE owner=?").bind(sid).first<{ suggestions: number }>(),
    db.prepare("SELECT id,sport,slot,old_rate,new_rate,games,at,reviewed_at FROM rule_changes WHERE owner=? ORDER BY id DESC LIMIT 20").bind(sid).all(),
  ]);
  return response(req, sid, {
    optedOut: !!optout,
    suggestionsOn: setting ? !!setting.suggestions : true,
    changes: changes.results,
  });
}

export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req)) return response(req, sid, { error: "Origin not allowed." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 500) return response(req, sid, { error: "Request is too long." }, 413);
    const body = JSON.parse(raw) as {
      action: string;
      event?: unknown;
      rsvp?: unknown;
      showed?: unknown;
      chosen?: unknown;
      choice?: unknown;
      suggestions?: unknown;
      id?: unknown;
    };
    const db = await database();

    if (body.action === "optout") {
      // Data minimisation: forget the timing of this browser's player sign-ups and stop logging new ones.
      await db.batch([
        db.prepare("INSERT INTO count_optouts (session) VALUES (?) ON CONFLICT(session) DO NOTHING").bind(sid),
        db.prepare("DELETE FROM rsvp_log WHERE rsvp IN (SELECT id FROM rsvps WHERE session=?)").bind(sid),
        db.prepare("DELETE FROM attendance WHERE rsvp IN (SELECT id FROM rsvps WHERE session=?)").bind(sid),
      ]);
      return response(req, sid, { ok: true });
    }

    if (body.action === "settings") {
      if (typeof body.suggestions !== "boolean") return response(req, sid, { error: "Invalid setting." }, 400);
      await db
        .prepare("INSERT INTO learning_settings (owner,suggestions) VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET suggestions=excluded.suggestions")
        .bind(sid, body.suggestions ? 1 : 0)
        .run();
      return response(req, sid, { ok: true });
    }

    if (body.action === "reviewed") {
      if (!Number.isSafeInteger(body.id)) return response(req, sid, { error: "Invalid change." }, 400);
      await db
        .prepare("UPDATE rule_changes SET reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND owner=?")
        .bind(body.id, sid)
        .run();
      return response(req, sid, { ok: true });
    }

    if (typeof body.event !== "string" || !body.event) return response(req, sid, { error: "Choose an event." }, 400);
    const event = await db
      .prepare("SELECT id,sport,starts,capacity,status FROM events WHERE id=? AND owner=?")
      .bind(body.event, sid)
      .first<{ id: string; sport: string; starts: string; capacity: number; status: string }>();
    if (!event) return response(req, sid, { error: "Event not found or not yours." }, 404);

    if (body.action === "choice") {
      // The organiser's answer to the suggestion card. The suggestion itself is recomputed here, not trusted from the browser.
      if (!["accepted", "edited", "dismissed"].includes(String(body.choice)) || !Number.isInteger(body.chosen) || Number(body.chosen) < 0 || Number(body.chosen) > 50)
        return response(req, sid, { error: "Invalid choice." }, 400);
      const s = await suggestionFor(db, sid, event);
      if (s.off || !s.ready) return response(req, sid, { error: "No suggestion for this game." }, 409);
      await db
        .prepare(
          `INSERT INTO game_learning (event,predicted_drops,suggested_reserves,chosen_reserves,choice) VALUES (?,?,?,?,?)
           ON CONFLICT(event) DO UPDATE SET predicted_drops=excluded.predicted_drops,suggested_reserves=excluded.suggested_reserves,chosen_reserves=excluded.chosen_reserves,choice=excluded.choice`,
        )
        .bind(event.id, s.predicted, s.reserves, body.choice === "dismissed" ? 0 : Number(body.chosen), body.choice)
        .run();
      return response(req, sid, { ok: true });
    }

    const closed = await db.prepare("SELECT closed_at FROM game_learning WHERE event=? AND closed_at IS NOT NULL").bind(event.id).first();

    if (body.action === "attendance") {
      if (event.status !== "published" || Date.parse(event.starts) > Date.now())
        return response(req, sid, { error: "Record attendance once the game has started." }, 409);
      if (closed) return response(req, sid, { error: "Attendance for this game is already finished." }, 409);
      if (!Number.isSafeInteger(body.rsvp) || typeof body.showed !== "boolean") return response(req, sid, { error: "Invalid attendance." }, 400);
      const result = await db
        .prepare(
          `INSERT INTO attendance (rsvp,event,showed)
           SELECT r.id,r.event,? FROM rsvps r WHERE r.id=? AND r.event=? AND r.role='play' AND r.state='confirmed'
           AND r.session NOT IN (SELECT session FROM count_optouts)
           ON CONFLICT(rsvp) DO UPDATE SET showed=excluded.showed`,
        )
        .bind(body.showed ? 1 : 0, body.rsvp, event.id)
        .run();
      return response(req, sid, { ok: true, counted: !!result.meta.changes });
    }

    if (body.action === "close") {
      if (closed) return response(req, sid, { error: "Attendance for this game is already finished." }, 409);
      if (event.status !== "published") return response(req, sid, { error: "Only published games can be finished." }, 409);
      return response(req, sid, { ok: true, result: await closeGame(db, sid, event.id) });
    }

    return response(req, sid, { error: "Unknown action." }, 400);
  } catch (error) {
    return response(req, sid, { error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }
}
