"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GameLearning, Participant, RuleChange, SportEvent, Suggestion } from "../lib/types";

type Role = "organiser" | "player";
type Profile = { name: string; email: string; role: Role };

const sports = ["Padel", "Beach volleyball", "Basketball", "Beach tennis"];
const sportIcon: Record<string, string> = { Padel: "🎾", "Beach volleyball": "🏐", Basketball: "🏀", "Beach tennis": "🎾" };
const sportClass: Record<string, string> = { Padel: "s-padel", "Beach volleyball": "s-volley", Basketball: "s-basket", "Beach tennis": "s-tennis" };
const ACCESS = "Free to watch.";
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "Europe/Madrid" }).format(new Date(s));
const day = (s: string) => fmt(s, { weekday: "short", day: "numeric", month: "short" });
const time = (s: string) => fmt(s, { hour: "2-digit", minute: "2-digit" });
const when = (s: string) => `${day(s)} · ${time(s)}`;
const blank = { title: "", sport: "Padel", venue: "", starts: "", capacity: 8, description: "", price: "", bizum: "" };
const toLocalInput = (iso: string) => {
  const dt = new Date(iso);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const mapsLink = (venue: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, Barcelona`)}`;

export default function Home() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [view, setView] = useState("discover");
  const [sport, setSport] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [share, setShare] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [menu, setMenu] = useState(false);
  const [confirmDrop, setConfirmDrop] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  // ---- account ----
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [signup, setSignup] = useState<{ mode: "signup" | "login"; role: Role | ""; name: string; email: string; password: string; confirm: string; error: string; busy: boolean }>(() => ({ mode: "signup", role: typeof location !== "undefined" && new URLSearchParams(location.search).get("event") ? "player" : "", name: "", email: "", password: "", confirm: "", error: "", busy: false }));
  useEffect(() => {
    let active = true;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ user: Profile | null }>)
      .then((d) => {
        if (!active) return;
        if (d.user) {
          setProfile(d.user);
          if (d.user.role === "organiser") setView("organise");
        }
        setProfileReady(true);
      })
      .catch(() => active && setProfileReady(true));
    return () => { active = false; };
  }, []);
  async function finishSignup() {
    const f = signup;
    const fail = (message: string) => setSignup({ ...f, error: message, busy: false });
    if (f.mode === "signup") {
      if (!f.role) return fail("Choose how you'll use CourtSide.");
      if (!f.name.trim()) return fail("Enter your first name.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return fail("Enter a valid email address.");
    if (f.mode === "signup" && f.password.length < 8) return fail("Use a password of at least 8 characters.");
    if (f.mode === "signup" && f.password !== f.confirm) return fail("The passwords don't match.");
    if (f.mode === "login" && !f.password) return fail("Enter your password.");
    setSignup({ ...f, error: "", busy: true });
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: f.mode, role: f.role, name: f.name, email: f.email, password: f.password }),
      });
      const d = (await r.json()) as { user?: Profile; error?: string };
      if (!r.ok || !d.user) return fail(d.error || "Something went wrong. Try again.");
      setProfile(d.user);
      setSignup({ mode: "login", role: "", name: "", email: "", password: "", confirm: "", error: "", busy: false });
      setView(d.user.role === "organiser" ? "organise" : "discover");
      await refresh();
    } catch {
      fail("Couldn't reach CourtSide. Check your connection and try again.");
    }
  }
  async function logOut() {
    try {
      await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    } catch {}
    location.href = "/";
  }

  // ---- data ----
  const [roster, setRoster] = useState<{ event: string; participants: Participant[] } | null>(null);
  const [rosterError, setRosterError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [reserveInput, setReserveInput] = useState(0);
  const [choice, setChoice] = useState<{ choice: "accepted" | "edited" | "dismissed"; chosen: number } | null>(null);
  const [game, setGame] = useState<{ event: string; data: GameLearning | null } | null>(null);
  const [learning, setLearning] = useState<{ optedOut: boolean; suggestionsOn: boolean; changes: RuleChange[] } | null>(null);
  async function loadLearning() {
    const r = await fetch("/api/learning");
    if (r.ok) setLearning((await r.json()) as { optedOut: boolean; suggestionsOn: boolean; changes: RuleChange[] });
  }
  async function refresh() {
    const r = await fetch("/api/events");
    if (!r.ok) throw new Error("Could not load games.");
    const data = (await r.json()) as { events: SportEvent[] };
    setEvents(data.events);
    setLoaded(true);
    setNow(Date.now());
  }
  useEffect(() => {
    let active = true;
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load games.");
        return (await r.json()) as { events: SportEvent[] };
      })
      .then((data) => {
        if (!active) return;
        setEvents(data.events);
        setLoaded(true);
        setNow(Date.now());
        const id = new URLSearchParams(location.search).get("event");
        if (id) setSelected(id);
      })
      .catch((e) => active && setError(e.message));
    fetch("/api/learning")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setLearning(data as { optedOut: boolean; suggestionsOn: boolean; changes: RuleChange[] }); })
      .catch(() => undefined);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (compose || selected) { if (!dialog.current?.open) dialog.current?.showModal(); dialog.current?.scrollTo(0, 0); }
    else dialog.current?.close();
  }, [compose, selected, profile]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const event = events.find((item) => item.id === selected);
    if (!event?.mine) return;
    let active = true;
    fetch(`/api/participants?event=${encodeURIComponent(event.id)}`)
      .then(async (response) => {
        const result = (await response.json()) as { participants: Participant[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load the players.");
        if (active) { setRoster({ event: event.id, participants: result.participants }); setRosterError(""); }
      })
      .catch((e) => active && setRosterError(e instanceof Error ? e.message : "Could not load the players."));
    fetch(`/api/learning?event=${encodeURIComponent(event.id)}`)
      .then(async (r) => (r.ok ? ((await r.json()) as { game: GameLearning | null }) : null))
      .then((data) => { if (active && data) setGame({ event: event.id, data: data.game }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [selected, events]);
  useEffect(() => {
    if (!compose || editing || !form.starts || !Number.isInteger(form.capacity) || form.capacity < 1) return;
    let active = true;
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ sport: form.sport, starts: new Date(form.starts).toISOString(), capacity: String(form.capacity) });
      fetch(`/api/learning?${query}`)
        .then(async (r) => (r.ok ? ((await r.json()) as { suggestion: Suggestion }) : null))
        .then((data) => {
          if (!active || !data) return;
          setSuggestion(data.suggestion);
          setChoice(null);
          if (!data.suggestion.off && data.suggestion.ready) setReserveInput(data.suggestion.reserves);
        })
        .catch(() => undefined);
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [compose, editing, form.sport, form.starts, form.capacity]);

  async function action(url: string, data: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = (await r.json()) as { error?: string; state?: string; id: string };
      if (!r.ok) throw new Error(result.error || "Could not save.");
      await refresh();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  function close() {
    setSelected(null);
    setCompose(false);
    setShare("");
    setError("");
    setEditing(null);
    setRoster(null);
    setRosterError("");
    setSuggestion(null);
    setChoice(null);
    setGame(null);
    if (new URLSearchParams(location.search).get("event")) history.replaceState(null, "", "/");
  }
  async function rsvp(e: SportEvent, role: "play" | "watch", cancel = false) {
    const result = await action("/api/rsvp", { event: e.id, role, name: profile?.name || "Player", action: cancel ? "cancel" : "join" });
    if (result)
      setNotice(
        cancel
          ? role === "watch" ? "Okay, you're no longer watching." : "Done. Your spot goes to the next person on the waitlist."
          : result.state === "waitlisted"
            ? "You're on the waitlist. If someone drops, you move up automatically."
            : role === "watch" ? "See you there as a spectator." : "You're in! 🎉",
      );
  }
  function payload(f: typeof blank) {
    return {
      ...f,
      title: f.title.trim() || `${f.sport} game`,
      description: f.description.trim(),
      access: ACCESS,
      starts: new Date(f.starts).toISOString(),
    };
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.starts) return setError("Choose when the game starts.");
    if (form.venue.trim().length < 3) return setError("Add where you'll play.");
    const data = payload(form);
    const result = editing
      ? await action("/api/events", { id: editing, action: "edit", data }, "PATCH")
      : await action("/api/events", { ...data, publish: true });
    if (!result) return;
    if (!editing && choice && suggestion && !suggestion.off && suggestion.ready)
      await action("/api/learning", { action: "choice", event: result.id, ...choice });
    const id = editing || result.id;
    setShare("");
    setCompose(false);
    setEditing(null);
    setSuggestion(null);
    setChoice(null);
    setForm(blank);
    setView("organise");
    setSelected(id);
    setNotice(editing ? "Changes saved." : "Your game is live. Share the link with your players.");
  }
  async function repeatNextWeek(e: SportEvent) {
    setShare("");
    const next = new Date(Date.parse(e.starts) + 7 * 86400000).toISOString();
    const result = await action("/api/events", {
      title: e.title, sport: e.sport, venue: e.venue, capacity: e.capacity, description: e.description, access: e.access || ACCESS,
      price: e.price || "", bizum: e.bizum || "", starts: next, publish: true,
    });
    if (result) { setSelected(result.id); setNotice(`Next week's game is live: ${when(next)}.`); }
  }
  const link = (e: SportEvent) => `${location.origin}/?event=${encodeURIComponent(e.id)}`;
  const invite = (e: SportEvent) =>
    `${sportIcon[e.sport] || ""} ${e.title}\n${when(e.starts)} · ${e.venue}\n${Math.max(0, e.capacity - e.players)} of ${e.capacity} spots left${e.price ? ` · ${e.price} per player${e.bizum ? ` (Bizum ${e.bizum})` : ""}` : ""}\nJoin here: ${link(e)}`;
  const nudge = (e: SportEvent) =>
    `Quick check for ${e.title} (${when(e.starts)}): still coming? If you can't make it, tap "I can't make it" here so the next person gets your spot: ${link(e)}`;
  async function sendText(text: string) {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ text }); return; } catch { /* fall back to showing the text */ }
    }
    setShare(text);
  }

  // ---- derived ----
  const current = events.find((e) => e.id === selected);
  const upcoming = (e: SportEvent) => Date.parse(e.starts) > now;
  const list = events
    .filter((e) =>
      view === "organise" ? !!e.mine
        : view === "mine" ? ["confirmed", "waitlisted"].includes(e.myPlay || "") || e.myWatch === "confirmed" || (e.status === "cancelled" && (!!e.myPlay || !!e.myWatch))
          : e.status === "published" && upcoming(e))
    .filter((e) => view !== "discover" || sport === "All" || e.sport === sport)
    .sort((a, b) => (view === "organise" ? Number(!upcoming(a)) - Number(!upcoming(b)) : 0) || Date.parse(a.starts) - Date.parse(b.starts));
  const invited = typeof location !== "undefined" && !!new URLSearchParams(location.search).get("event");
  const invitedGame = invited ? events.find((e) => e.id === selected) : undefined;
  const tabs: [string, string, string][] = profile?.role === "organiser" ? [["organise", "My games", "📋"]] : [["discover", "Games", "🔎"], ["mine", "My games", "✅"]];

  if (!profileReady) return <main className="auth-shell"><div className="spinner" aria-label="Loading" /></main>;
  if (!profile)
    return (
      <main className="auth-shell">
        <form className="auth-card" noValidate onSubmit={(ev) => { ev.preventDefault(); finishSignup(); }}>
          <div className="brand">courtside<span>↗</span></div>
          <h1>{signup.mode === "login" ? "Welcome back" : invited ? "Join this game" : "Pickup games, sorted."}</h1>
          {invitedGame && <p className="invite-game">{sportIcon[invitedGame.sport]} <strong>{invitedGame.title}</strong><br />{when(invitedGame.starts)} · {invitedGame.venue}</p>}
          <p className="auth-sub">
            {signup.mode === "login" ? "Log in to see your games." : invited ? "Create an account in a few seconds and we'll take you straight to the game." : "Find a game in Barcelona or organise your own, without the group chat chaos."}
          </p>
          {signup.mode === "signup" && (
            <>
              <fieldset className="role-pick">
                <legend>I want to…</legend>
                {([
                  ["player", "🏐", "Play or watch", "Find games and grab a spot"],
                  ["organiser", "📋", "Organise games", "Create games and track who's in"],
                ] as const).map(([key, icon, label, hint]) => (
                  <button type="button" key={key} aria-pressed={signup.role === key} className={signup.role === key ? "role-option chosen" : "role-option"} onClick={() => setSignup({ ...signup, role: key, error: "" })}>
                    <span className="role-icon" aria-hidden="true">{icon}</span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </button>
                ))}
              </fieldset>
              <label>First name<input autoComplete="given-name" value={signup.name} maxLength={60} onChange={(ev) => setSignup({ ...signup, name: ev.target.value, error: "" })} /></label>
            </>
          )}
          <label>Email<input type="email" inputMode="email" autoComplete="email" value={signup.email} onChange={(ev) => setSignup({ ...signup, email: ev.target.value, error: "" })} /></label>
          <label>Password<input type="password" autoComplete={signup.mode === "signup" ? "new-password" : "current-password"} value={signup.password} onChange={(ev) => setSignup({ ...signup, password: ev.target.value, error: "" })} /></label>
          {signup.mode === "signup" && (
            <label>Confirm password<input type="password" autoComplete="new-password" value={signup.confirm} onChange={(ev) => setSignup({ ...signup, confirm: ev.target.value, error: "" })} /></label>
          )}
          {signup.error && <p className="form-error" role="alert">{signup.error}</p>}
          <button type="submit" className="btn primary block" disabled={signup.busy}>{signup.busy ? "One moment…" : signup.mode === "signup" ? "Create account" : "Log in"}</button>
          <p className="auth-switch">
            {signup.mode === "signup" ? "Already have an account? " : "New to CourtSide? "}
            <button type="button" className="link" onClick={() => setSignup({ ...signup, mode: signup.mode === "signup" ? "login" : "signup", error: "", password: "", confirm: "" })}>
              {signup.mode === "signup" ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </main>
    );

  const isOrganiser = profile.role === "organiser";
  return (
    <main className="app">
      <header className="topbar">
        <Link className="brand" href="/">courtside<span>↗</span></Link>
        <nav className="tabs-desktop" aria-label="Main navigation">
          {tabs.map(([key, label]) => (
            <button key={key} className={view === key ? "tab active" : "tab"} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>
        <div className="topbar-right">
          {isOrganiser && (
            <button className="btn primary hide-mobile" onClick={() => { setForm(blank); setEditing(null); setCompose(true); setSelected(null); setError(""); }}>＋ New game</button>
          )}
          <div className="account">
            <button className="avatar" aria-haspopup="menu" aria-expanded={menu} aria-label={`Account menu for ${profile.name}`} onClick={() => setMenu(!menu)}>{profile.name.slice(0, 1).toUpperCase()}</button>
            {menu && (
              <div className="menu" role="menu">
                <p className="menu-who"><strong>{profile.name}</strong><span>{profile.email}</span><span className="pill">{isOrganiser ? "Organiser" : "Player"}</span></p>
                <button role="menuitem" className="menu-item" onClick={logOut}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="page" onClick={() => menu && setMenu(false)}>
        <div className="page-head">
          <div>
            <h1>{view === "organise" ? `Hi ${profile.name} 👋` : view === "mine" ? "My games" : "Games in Barcelona"}</h1>
            <p className="sub">
              {view === "organise" ? "Your games, who's in and who has paid." : view === "mine" ? "Games you've joined or are waiting for." : "Pick a game and grab a spot."}
            </p>
          </div>
          <button className="btn ghost small" disabled={busy} onClick={() => refresh().catch(() => setError("Could not refresh."))}>↻ Refresh</button>
        </div>

        {view === "discover" && (
          <div className="chips" role="group" aria-label="Filter by sport">
            {["All", ...sports].map((s) => (
              <button key={s} className={sport === s ? "chip active" : "chip"} aria-pressed={sport === s} onClick={() => setSport(s)}>{s === "All" ? "All sports" : `${sportIcon[s]} ${s}`}</button>
            ))}
          </div>
        )}

        {!compose && !selected && error && <p role="alert" className="form-error">{error}</p>}

        {!loaded && !error ? (
          <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="card skeleton" />)}</div>
        ) : list.length === 0 ? (
          <div className="empty">
            {view === "organise" ? (
              <>
                <h2>Create your first game</h2>
                <ol className="steps">
                  <li><b>1</b>Create a game: sport, time, place, spots</li>
                  <li><b>2</b>Share the link in your group chat</li>
                  <li><b>3</b>See who&apos;s in, who&apos;s waiting and who has paid</li>
                </ol>
                <div className="row center">
                  <button className="btn primary" onClick={() => { setForm(blank); setCompose(true); }}>＋ New game</button>
                  {!events.some((e) => e.mine) && (
                    <button className="btn ghost" disabled={busy} onClick={async () => { if (await action("/api/examples", {})) setNotice("3 sample games added."); }}>Try with sample games</button>
                  )}
                </div>
              </>
            ) : view === "mine" ? (
              <>
                <h2>No games yet</h2>
                <p>Games you join show up here.</p>
                <button className="btn primary" onClick={() => setView("discover")}>Find a game</button>
              </>
            ) : (
              <>
                <h2>No open games {sport !== "All" ? `for ${sport}` : "right now"}</h2>
                <p>New games appear here as soon as organisers post them.</p>
                {sport !== "All" && <button className="btn ghost" onClick={() => setSport("All")}>Show all sports</button>}
              </>
            )}
          </div>
        ) : (
          <div className="grid">
            {list.map((e) => {
              const left = Math.max(0, e.capacity - e.players);
              const past = !upcoming(e);
              return (
                <button key={e.id} className={`card ${sportClass[e.sport] || ""}${past || e.status === "cancelled" ? " dim" : ""}`} onClick={() => setSelected(e.id)}>
                  <div className="card-top">
                    <span className="sport-tag">{sportIcon[e.sport]} {e.sport}</span>
                    {e.status === "cancelled" ? <span className="badge red">Cancelled</span>
                      : e.status === "draft" ? <span className="badge grey">Draft</span>
                        : past ? <span className="badge grey">Played</span>
                          : e.myPlay === "confirmed" ? <span className="badge green">You&apos;re in</span>
                            : e.myPlay === "waitlisted" ? <span className="badge amber">Waitlist #{e.myWaitPosition ?? "?"}</span>
                              : e.myWatch === "confirmed" ? <span className="badge grey">Watching</span>
                                : e.demo ? <span className="badge grey">Sample</span> : null}
                  </div>
                  <h3>{e.title}</h3>
                  <p className="when">{when(e.starts)}</p>
                  <p className="where">📍 {e.venue}</p>
                  <div className="spots">
                    <div className="bar"><span style={{ width: `${Math.min(100, (e.players / e.capacity) * 100)}%` }} /></div>
                    <div className="spots-line">
                      <span>{e.status === "cancelled" ? "Cancelled" : past ? `${e.players} played` : left > 0 ? `${left} spot${left === 1 ? "" : "s"} left` : `Full${e.waiting ? ` · ${e.waiting} waiting` : ""}`}</span>
                      {e.price ? <span className="price">{e.price}</span> : <span className="muted">{e.players}/{e.capacity}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isOrganiser && learning && (learning.changes.length > 0 || events.some((e) => e.mine)) && (
          <details className="insights">
            <summary>💡 Reserve suggestions <span className="muted">· learns from your finished games</span></summary>
            <p className="muted">After a game, mark who showed up. CourtSide counts drop-outs per game type (never per player) and suggests how many reserves to keep. You approve every suggestion.</p>
            <button className="btn ghost small" disabled={busy} onClick={async () => { if (await action("/api/learning", { action: "settings", suggestions: !learning.suggestionsOn })) { await loadLearning(); setNotice(learning.suggestionsOn ? "Suggestions off." : "Suggestions on."); } }}>
              {learning.suggestionsOn ? "Turn suggestions off" : "Turn suggestions on"}
            </button>
            <h4>Big changes to review</h4>
            {learning.changes.length === 0 ? (
              <p className="muted">Nothing yet. A change shows here when a game type&apos;s drop rate is first set or moves by 10 points or more.</p>
            ) : (
              <ul className="people">
                {learning.changes.map((c) => (
                  <li key={c.id}>
                    <div><strong>{c.sport}, {c.slot}</strong><span className="muted">Drop rate {c.old_rate == null ? "first set at" : `${Math.round(c.old_rate * 100)}% →`} {Math.round(c.new_rate * 100)}% after {c.games} games</span></div>
                    {c.reviewed_at ? <span className="badge grey">Reviewed</span> : (
                      <button className="btn ghost small" disabled={busy} onClick={async () => { if (await action("/api/learning", { action: "reviewed", id: c.id })) await loadLearning(); }}>Mark reviewed</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}
      </section>

      <nav className="tabs-mobile" aria-label="Main navigation">
        {tabs.map(([key, label, icon]) => (
          <button key={key} className={view === key ? "active" : ""} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}><span aria-hidden="true">{icon}</span>{label}</button>
        ))}
        {isOrganiser && <button className="new" onClick={() => { setForm(blank); setEditing(null); setCompose(true); setSelected(null); }}><span aria-hidden="true">＋</span>New game</button>}
      </nav>

      {notice && !compose && !selected && <div className="toast" role="status" aria-live="polite">{notice}</div>}

      <dialog ref={dialog} className="sheet" aria-labelledby="sheet-title" onCancel={close} onClose={() => { setCompose(false); setSelected(null); }}>
        <button className="close" onClick={close} aria-label="Close">×</button>
        {notice && (compose || selected) && <div className="toast" role="status" aria-live="polite">{notice}</div>}
        {compose ? (
          <form onSubmit={create} noValidate>
            <h2 id="sheet-title">{editing ? "Edit game" : "New game"}</h2>
            <fieldset className="sport-pick">
              <legend>Sport</legend>
              {sports.map((s) => (
                <button type="button" key={s} className={form.sport === s ? "chip active" : "chip"} aria-pressed={form.sport === s} onClick={() => setForm({ ...form, sport: s })}>{sportIcon[s]} {s}</button>
              ))}
            </fieldset>
            <label>When<input type="datetime-local" required min={now ? toLocalInput(new Date(now + 5 * 60000).toISOString()) : undefined} max="2030-12-31T23:59" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /></label>
            <label>Where<input required maxLength={160} value={form.venue} placeholder="e.g. Barceloneta beach, near the W hotel" onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
            <div className="two">
              <label>Spots
                <div className="stepper">
                  <button type="button" aria-label="Fewer spots" onClick={() => setForm({ ...form, capacity: Math.max(1, form.capacity - 1) })}>−</button>
                  <input type="number" min={1} max={200} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
                  <button type="button" aria-label="More spots" onClick={() => setForm({ ...form, capacity: Math.min(200, form.capacity + 1) })}>＋</button>
                </div>
              </label>
              <label><span className="lbl">Price per player <span className="opt">optional</span></span><input maxLength={20} value={form.price} placeholder="e.g. €5" onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            </div>
            {form.price.trim() && (
              <label><span className="lbl">Your Bizum number <span className="opt">optional</span></span><input inputMode="tel" maxLength={20} value={form.bizum} placeholder="e.g. 612 345 678" onChange={(e) => setForm({ ...form, bizum: e.target.value })} /></label>
            )}
            <label><span className="lbl">Game name <span className="opt">optional</span></span><input maxLength={100} value={form.title} placeholder={`${form.sport} game`} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label><span className="lbl">Notes for players <span className="opt">optional</span></span><textarea rows={3} maxLength={2000} value={form.description} placeholder="Level, what to bring, where exactly to meet" onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            {suggestion && !suggestion.off && suggestion.ready && (
              <div className="hint-card">
                <strong>💡 Keep {suggestion.reserves} reserve{suggestion.reserves === 1 ? "" : "s"}?</strong>
                <p className="muted">Games like this usually lose about {suggestion.predicted} of {form.capacity} players to late drops or no-shows ({suggestion.games} finished games).</p>
                <div className="row">
                  <input className="mini" aria-label="Reserves" type="number" min={0} max={50} value={reserveInput} onChange={(e) => setReserveInput(Number(e.target.value))} />
                  <button type="button" className="btn ghost small" onClick={() => setChoice({ choice: reserveInput === suggestion.reserves ? "accepted" : "edited", chosen: reserveInput })}>{reserveInput === suggestion.reserves ? "Accept" : "Use my number"}</button>
                  <button type="button" className="link" onClick={() => setChoice({ choice: "dismissed", chosen: 0 })}>Ignore</button>
                </div>
                {choice && <p className="muted">{choice.choice === "dismissed" ? "Ignored." : `Saved: ${choice.chosen} reserves.`}</p>}
              </div>
            )}
            {error && <p role="alert" className="form-error">{error}</p>}
            <button className="btn primary block" disabled={busy} type="submit">{busy ? "Saving…" : editing ? "Save changes" : "Create game"}</button>
          </form>
        ) : current ? (
          <div className="detail">
            <span className={`sport-tag ${sportClass[current.sport] || ""}`}>{sportIcon[current.sport]} {current.sport}{current.demo ? " · Sample" : ""}</span>
            <h2 id="sheet-title">{current.title}</h2>
            <div className="facts">
              <p>🗓 <strong>{day(current.starts)}</strong> at <strong>{time(current.starts)}</strong></p>
              <p>📍 <a href={mapsLink(current.venue)} target="_blank" rel="noreferrer">{current.venue}</a></p>
              {current.price && <p>💶 <strong>{current.price}</strong> per player{current.bizum ? <> · Bizum to <strong>{current.bizum}</strong></> : null}</p>}
            </div>

            {current.status === "cancelled" ? <p className="banner red">This game has been cancelled.</p>
              : current.status === "draft" ? <p className="banner grey">Draft: players can&apos;t see this yet.</p>
                : !upcoming(current) ? <p className="banner grey">This game has started. Sign-ups are closed.</p>
                  : current.myPlay === "confirmed" ? <p className="banner green">✓ You&apos;re in{current.price ? (current.myPaid ? " · Paid" : " · Not paid yet") : ""}</p>
                    : current.myPlay === "waitlisted" ? <p className="banner amber">You&apos;re #{current.myWaitPosition ?? "?"} on the waitlist. If someone drops, you move up automatically.</p>
                      : null}

            <div className="spots big">
              <div className="bar"><span style={{ width: `${Math.min(100, (current.players / current.capacity) * 100)}%` }} /></div>
              <div className="spots-line">
                <span><strong>{current.players}</strong> of {current.capacity} spots taken</span>
                <span className="muted">{[current.waiting ? `${current.waiting} waiting` : "", current.spectators ? `${current.spectators} watching` : ""].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            {current.names && (
              <div className="whos-in">
                <h4>Who&apos;s in</h4>
                <div className="faces">{current.names.split("|").map((n, i) => <span key={i} className="face" title={n}>{n}</span>)}</div>
              </div>
            )}
            {current.description && <p className="notes">{current.description}</p>}

            {!current.mine && !isOrganiser && current.status === "published" && upcoming(current) && (
              <div className="cta">
                {["confirmed", "waitlisted"].includes(current.myPlay || "") ? (
                  confirmDrop === current.id ? (
                    <div className="confirm">
                      <p>{current.myPlay === "waitlisted" ? "Leave the waitlist?" : `Give your spot to the next person?${current.myPaid ? " Sort out your refund with the organiser." : ""}`}</p>
                      <div className="row center">
                        <button className="btn danger small" disabled={busy} onClick={async () => { setConfirmDrop(null); await rsvp(current, "play", true); }}>Yes, {current.myPlay === "waitlisted" ? "leave" : "I can't make it"}</button>
                        <button className="btn ghost small" onClick={() => setConfirmDrop(null)}>Keep my spot</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn danger-ghost block" disabled={busy} onClick={() => setConfirmDrop(current.id)}>{current.myPlay === "waitlisted" ? "Leave the waitlist" : "I can't make it"}</button>
                  )
                ) : (
                  <button className="btn primary block" disabled={busy} onClick={() => rsvp(current, "play")}>{current.players >= current.capacity ? "Join the waitlist" : "Join game"}</button>
                )}
                {!["confirmed", "waitlisted"].includes(current.myPlay || "") && (
                  <button className="link" disabled={busy} onClick={() => rsvp(current, "watch", current.myWatch === "confirmed")}>{current.myWatch === "confirmed" ? "Stop watching" : "Just coming to watch? Let them know"}</button>
                )}
                <p className="fine">
                  CourtSide counts drop-outs per game type (never by name) to suggest reserves.{" "}
                  {learning?.optedOut ? "Your sign-ups are left out." : (
                    <button className="link small" disabled={busy} onClick={async () => { if (await action("/api/learning", { action: "optout" })) { await loadLearning(); setNotice("Your sign-ups are now left out of the counts."); } }}>Leave my sign-ups out</button>
                  )}
                </p>
              </div>
            )}

            {!!current.mine && (
              <div className="organiser">
                {current.status === "draft" && (
                  <button className="btn primary block" disabled={busy} onClick={async () => { if (await action("/api/events", { id: current.id, action: "publish" }, "PATCH")) setNotice("Your game is live."); }}>Publish game</button>
                )}
                {current.status === "published" && upcoming(current) && (
                  <div className="row">
                    <button className="btn primary grow" onClick={() => sendText(invite(current))}>📤 Share invite</button>
                    <button className="btn ghost grow" onClick={() => sendText(nudge(current))}>⏰ Ask &quot;still coming?&quot;</button>
                  </div>
                )}
                {share && (
                  <div className="share">
                    <textarea rows={5} value={share} onChange={(e) => setShare(e.target.value)} aria-label="Message to share" />
                    <button className="btn ghost small" onClick={async () => { try { await navigator.clipboard.writeText(share); setNotice("Copied. Paste it in your group chat."); } catch { setError("Copy didn't work. Select the text and copy it."); } }}>Copy message</button>
                  </div>
                )}

                <h4>Players</h4>
                {rosterError ? <p role="alert" className="form-error">{rosterError}</p>
                  : roster?.event !== current.id ? <p className="muted">Loading…</p>
                    : roster.participants.length === 0 ? <p className="muted">No one yet. Share the invite to get people in.</p>
                      : (
                        <ul className="people">
                          {roster.participants.map((p) => (
                            <li key={p.id}>
                              <div>
                                <strong>{p.name || "Player"}</strong>
                                <span className="muted">{p.role === "watch" ? "Watching" : p.state === "waitlisted" ? "Waitlist" : "In"}</span>
                              </div>
                              <div className="row">
                                {p.role === "play" && p.state === "confirmed" && (
                                  <button className={p.paid ? "toggle on" : "toggle"} disabled={busy || current.status === "cancelled"} aria-pressed={p.paid === true} aria-label={`${p.name || "Player"}: ${p.paid ? "paid" : "not paid"}`}
                                    onClick={async () => { if (await action(`/api/participants?event=${encodeURIComponent(current.id)}`, { id: p.id, paid: !p.paid }, "PATCH")) setNotice(`${p.name || "Player"} marked ${p.paid ? "not paid" : "paid"}.`); }}>
                                    {p.paid ? "Paid ✓" : "Not paid"}
                                  </button>
                                )}
                                {p.role === "play" && p.state === "confirmed" && current.status === "published" && !upcoming(current) && !(game?.event === current.id && game.data?.closed_at) && (
                                  <button className={p.showed === false ? "toggle off" : p.showed ? "toggle on" : "toggle"} disabled={busy} aria-label={`${p.name || "Player"}: ${p.showed == null ? "attendance not recorded" : p.showed ? "showed up" : "did not show"}`}
                                    onClick={async () => { const next = p.showed !== true; if (await action("/api/learning", { action: "attendance", event: current.id, rsvp: p.id, showed: next })) setNotice(`${p.name || "Player"}: ${next ? "showed up" : "didn't show"}.`); }}>
                                    {p.showed == null ? "Showed up?" : p.showed ? "Showed up ✓" : "Didn't show"}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                {game?.event === current.id && game.data?.chosen_reserves != null && game.data.choice !== "dismissed" && (
                  <p className="muted">Reserves you chose: {game.data.chosen_reserves} (suggested {game.data.suggested_reserves}).</p>
                )}
                {current.status === "published" && !upcoming(current) && (
                  game?.event === current.id && game.data?.closed_at ? (
                    <p className="banner green">Attendance saved: {game.data.actual_drops} player{game.data.actual_drops === 1 ? "" : "s"} lost to late drops or no-shows{game.data.predicted_drops != null ? ` (predicted ${game.data.predicted_drops})` : ""}.</p>
                  ) : (
                    <div className="hint-card">
                      <strong>After the game: who showed up?</strong>
                      <p className="muted">Tap each player (once = showed up, twice = didn&apos;t show), then finish. Never shown per player.</p>
                      <button className="btn primary small" disabled={busy} onClick={async () => {
                        const result = (await action("/api/learning", { action: "close", event: current.id })) as unknown as { result?: { lateCancels: number; noShows: number } } | null;
                        if (result?.result) setNotice(`Saved: ${result.result.lateCancels} late drops + ${result.result.noShows} no-shows.`);
                      }}>Finish attendance</button>
                    </div>
                  )
                )}

                <div className="row more">
                  {current.status !== "cancelled" && upcoming(current) && (
                    <button className="btn ghost small" onClick={() => {
                      setShare("");
                      setEditing(current.id);
                      setForm({ title: current.title, sport: current.sport, venue: current.venue, starts: toLocalInput(current.starts), capacity: current.capacity, description: current.description, price: current.price || "", bizum: current.bizum || "" });
                      setSelected(null);
                      setCompose(true);
                    }}>✏️ Edit</button>
                  )}
                  {current.status !== "cancelled" && <button className="btn ghost small" disabled={busy} onClick={() => repeatNextWeek(current)}>🔁 Repeat next week</button>}
                </div>
                {current.status !== "cancelled" && (
                  <details className="danger-zone">
                    <summary>Cancel this game</summary>
                    <p className="muted">Everyone&apos;s spot is released. This can&apos;t be undone.</p>
                    <button className="btn danger small" disabled={busy} onClick={async () => { if (await action("/api/events", { id: current.id, action: "cancel" }, "PATCH")) setNotice("Game cancelled."); }}>Yes, cancel the game</button>
                  </details>
                )}
              </div>
            )}
            {error && <p role="alert" className="form-error">{error}</p>}
          </div>
        ) : (
          <div className="detail">
            <h2 id="sheet-title">{loaded ? "Game not found" : "Loading…"}</h2>
            {loaded && <p className="muted">It may have been cancelled or removed.</p>}
            <button className="btn ghost" onClick={close}>Back to games</button>
          </div>
        )}
      </dialog>
    </main>
  );
}
