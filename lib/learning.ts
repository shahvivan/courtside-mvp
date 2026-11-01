// Session 7 learning loop.
// CourtSide learns about GAME TYPES, never about individual people.
// A game type = one organiser + one sport + one time slot (Barcelona time).
// Nothing here scores, ranks, flags or blocks a player.

export const MIN_GAMES = 3; // fewer finished games than this = no suggestion
export const BIG_CHANGE = 0.1; // a rate move of 10 points goes to the founders' review

type Db = D1Database;

export function slot(starts: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(starts));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const day = weekday === "Sat" || weekday === "Sun" ? "weekend" : "weekday";
  const band = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `${day} ${band}`;
}

export async function setupLearning(db: Db) {
  await db.batch([
    // Join, cancel and promotion times for PLAYER registrations. No names, no cookie id.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS rsvp_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, rsvp INTEGER NOT NULL, action TEXT NOT NULL CHECK(action IN ('join','cancel','promote')), was TEXT, at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
    ),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_rsvp_log_event ON rsvp_log(event)`),
    // The organiser's "showed up" tick after the game. Only used in totals per game.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS attendance (rsvp INTEGER PRIMARY KEY, event TEXT NOT NULL, showed INTEGER NOT NULL CHECK(showed IN (0,1)))`,
    ),
    // One row per game: what was suggested, what the organiser chose, what happened.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS game_learning (event TEXT PRIMARY KEY, predicted_drops REAL, suggested_reserves INTEGER, chosen_reserves INTEGER, choice TEXT CHECK(choice IN ('accepted','edited','dismissed')), actual_drops INTEGER, closed_at TEXT)`,
    ),
    // Every big move in a game type's drop rate, for the human review.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS rule_changes (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, sport TEXT NOT NULL, slot TEXT NOT NULL, old_rate REAL, new_rate REAL NOT NULL, games INTEGER NOT NULL, at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), reviewed_at TEXT)`,
    ),
    // Organisers can switch suggestions off.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS learning_settings (owner TEXT PRIMARY KEY, suggestions INTEGER NOT NULL DEFAULT 1 CHECK(suggestions IN (0,1)))`,
    ),
    // Players can leave their sign-ups out of the counts.
    db.prepare(`CREATE TABLE IF NOT EXISTS count_optouts (session TEXT PRIMARY KEY)`),
  ]);
}

type Finished = { capacity: number; actual_drops: number; starts: string; sport: string };

// Drop rate = players lost (late cancels + no-shows) per player place.
export function rateOf(games: Finished[]) {
  const places = games.reduce((s, g) => s + g.capacity, 0);
  const lost = games.reduce((s, g) => s + g.actual_drops, 0);
  return places ? lost / places : null;
}

async function finishedGames(db: Db, owner: string, excludeEvent?: string) {
  const rows = await db
    .prepare(
      `SELECT e.capacity, g.actual_drops, e.starts, e.sport FROM game_learning g JOIN events e ON e.id=g.event
       WHERE e.owner=? AND g.closed_at IS NOT NULL AND g.actual_drops IS NOT NULL AND e.id IS NOT ?`,
    )
    .bind(owner, excludeEvent ?? null)
    .all<Finished>();
  return rows.results;
}

export async function suggestionFor(
  db: Db,
  owner: string,
  game: { sport: string; starts: string; capacity: number },
) {
  const setting = await db
    .prepare("SELECT suggestions FROM learning_settings WHERE owner=?")
    .bind(owner)
    .first<{ suggestions: number }>();
  if (setting && !setting.suggestions) return { off: true as const };
  const all = await finishedGames(db, owner);
  const type = slot(game.starts);
  const same = all.filter((g) => g.sport === game.sport && slot(g.starts) === type);
  const basis =
    same.length >= MIN_GAMES
      ? { games: same, scope: `${game.sport}, ${type}` }
      : all.length >= MIN_GAMES
        ? { games: all, scope: "all your games (not enough of this type yet)" }
        : null;
  if (!basis)
    return { off: false as const, ready: false as const, finished: all.length, needed: MIN_GAMES };
  const rate = rateOf(basis.games) ?? 0;
  const predicted = Math.round(rate * game.capacity * 10) / 10;
  const reserves = rate > 0 ? Math.max(1, Math.ceil(rate * game.capacity)) : 0;
  return {
    off: false as const,
    ready: true as const,
    rate,
    predicted,
    reserves,
    stillComing: rate >= 0.1,
    games: basis.games.length,
    scope: basis.scope,
  };
}

// Called when the organiser finishes recording attendance.
export async function closeGame(db: Db, owner: string, eventId: string) {
  const event = await db
    .prepare("SELECT id, sport, starts, capacity FROM events WHERE id=? AND owner=?")
    .bind(eventId, owner)
    .first<{ id: string; sport: string; starts: string; capacity: number }>();
  if (!event) throw new Error("Event not found or not yours.");
  if (Date.parse(event.starts) > Date.now()) throw new Error("Record attendance after the game has started.");
  // Unmarked players would silently count as "showed up" and make the rate look too good.
  const unmarked = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM rsvps r WHERE r.event=? AND r.role='play' AND r.state='confirmed'
       AND r.session NOT IN (SELECT session FROM count_optouts)
       AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.rsvp=r.id)`,
    )
    .bind(eventId)
    .first<{ n: number }>();
  if (unmarked?.n) throw new Error(`Mark every confirmed player first (${unmarked.n} not marked yet).`);
  const kickoff = event.starts;
  const dayBefore = new Date(Date.parse(kickoff) - 24 * 3600 * 1000).toISOString();
  const late = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM rsvp_log WHERE event=? AND action='cancel' AND was='confirmed' AND at>=? AND at<?`,
    )
    .bind(eventId, dayBefore, kickoff)
    .first<{ n: number }>();
  const noShows = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM attendance a JOIN rsvps r ON r.id=a.rsvp
       WHERE a.event=? AND a.showed=0 AND r.session NOT IN (SELECT session FROM count_optouts)`,
    )
    .bind(eventId)
    .first<{ n: number }>();
  const actual = (late?.n ?? 0) + (noShows?.n ?? 0);

  const type = slot(event.starts);
  const sameType = (g: Finished) => g.sport === event.sport && slot(g.starts) === type;
  const before = (await finishedGames(db, owner, eventId)).filter(sameType);
  const oldRate = before.length >= MIN_GAMES ? rateOf(before) : null;

  await db
    .prepare(
      `INSERT INTO game_learning (event, actual_drops, closed_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(event) DO UPDATE SET actual_drops=excluded.actual_drops, closed_at=excluded.closed_at`,
    )
    .bind(eventId, actual)
    .run();

  const after = (await finishedGames(db, owner)).filter(sameType);
  const newRate = after.length >= MIN_GAMES ? rateOf(after) : null;
  const firstRate = oldRate === null && newRate !== null;
  if (newRate !== null && (firstRate || Math.abs(newRate - (oldRate ?? 0)) >= BIG_CHANGE)) {
    await db
      .prepare(
        "INSERT INTO rule_changes (owner, sport, slot, old_rate, new_rate, games) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(owner, event.sport, type, oldRate, newRate, after.length)
      .run();
  }
  return { actual, lateCancels: late?.n ?? 0, noShows: noShows?.n ?? 0, oldRate, newRate };
}
