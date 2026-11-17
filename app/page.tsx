"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GameLearning, Participant, RuleChange, SportEvent, Suggestion } from "../lib/types";

type Role = "organiser" | "player";
type Profile = { name: string; email: string; role: Role };

const sports = ["Beach volleyball", "Beach padel", "Basketball", "Beach tennis"];
// Older games were saved as "Padel"; they are beach padel games, so show them that way.
const sportName = (s: string) => (s === "Padel" ? "Beach padel" : s);
const sportClass: Record<string, string> = { "Beach volleyball": "s-volley", "Beach padel": "s-padel", Basketball: "s-basket", "Beach tennis": "s-tennis" };
const sportKey = (s: string) => sportClass[sportName(s)] || "";
// Emoji only go into the WhatsApp invite text, never into the interface.
const inviteEmoji: Record<string, string> = { "Beach volleyball": "🏐", "Beach padel": "🎾", Basketball: "🏀", "Beach tennis": "🎾" };
const iconPaths: Record<string, string> = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  pin: "M12 21s-7-5.8-7-11a7 7 0 0 1 14 0c0 5.2-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  euro: "M17 6.6A6.5 6.5 0 1 0 17 17.4M4 10h9M4 14h9",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  plus: "M12 5v14M5 12h14",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  share: "M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  repeat: "M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4",
  pen: "M3 21l3.5-1L19 7.5 16.5 5 4 17.5zM14.5 7l2.5 2.5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  check: "M5 12.5l4.5 4.5L19 7",
  arrow: "M7 17L17 7M8 7h9v9",
  whistle: "M3 12a5 5 0 0 0 9.6 2H21v-4h-9.5A5 5 0 0 0 3 12zM12 10V6",
};
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}
function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--sea)" />
        <rect x="6.5" y="9.5" width="19" height="13" rx="1" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.4" />
        <path d="M16 9.5v13" stroke="#fff" strokeOpacity=".6" strokeWidth="1.4" />
        <circle cx="22" cy="10" r="4.2" fill="var(--buoy)" />
      </svg>
      <span className="wordmark">CourtSide</span>
    </span>
  );
}
// Top-down beach court with the net and a ball in play. Pure decoration.
function Court() {
  return (
    <svg className="court-art" viewBox="0 0 400 300" role="img" aria-label="Drawing of a beach court seen from above">
      <defs>
        <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#c9b48a" opacity=".55" /><circle cx="4" cy="4" r=".6" fill="#fff" opacity=".5" /></pattern>
      </defs>
      <rect width="400" height="300" fill="var(--sand)" />
      <rect width="400" height="300" fill="url(#grain)" />
      <path d="M0 262 C80 246 150 272 230 258 S350 244 400 252 V300 H0z" fill="var(--sea-soft)" />
      <path d="M0 276 C90 262 160 286 240 272 S350 262 400 268 V300 H0z" fill="var(--sea)" opacity=".9" />
      <rect x="60" y="40" width="280" height="190" fill="none" stroke="#fff" strokeWidth="4" />
      <line x1="200" y1="28" x2="200" y2="242" stroke="var(--ink)" strokeWidth="3" strokeDasharray="2 5" />
      <circle cx="200" cy="28" r="5" fill="var(--ink)" /><circle cx="200" cy="242" r="5" fill="var(--ink)" />
      <g className="players">
        <circle cx="120" cy="95" r="9" fill="var(--ink)" /><circle cx="135" cy="175" r="9" fill="var(--ink)" />
        <circle cx="270" cy="110" r="9" fill="#fff" stroke="var(--ink)" strokeWidth="3" /><circle cx="285" cy="185" r="9" fill="#fff" stroke="var(--ink)" strokeWidth="3" />
      </g>
      <g className="ball-arc"><path d="M135 165 Q 200 30 262 112" fill="none" stroke="var(--ink)" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 6" /><circle className="ball" cx="232" cy="72" r="11" fill="var(--buoy)" stroke="var(--ink)" strokeWidth="2.5" /></g>
    </svg>
  );
}
// Spots drawn as slots on a team sheet: filled = taken, open = free.
function Slots({ taken, capacity }: { taken: number; capacity: number }) {
  if (capacity > 16)
    return <div className="bar"><span style={{ width: `${Math.min(100, (taken / capacity) * 100)}%` }} /></div>;
  return (
    <div className="slots" aria-hidden="true">
      {Array.from({ length: capacity }, (_, i) => <span key={i} className={i < taken ? "slot on" : "slot"} />)}
    </div>
  );
}
const ACCESS = "Free to watch.";
// Organisers sometimes type just "7"; show it as "€7".
const money = (p: string) => (/^\d+([.,]\d{1,2})?$/.test(p.trim()) ? `€${p.trim()}` : p);
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "Europe/Madrid" }).format(new Date(s));
const day = (s: string) => fmt(s, { weekday: "short", day: "numeric", month: "short" });
const time = (s: string) => fmt(s, { hour: "2-digit", minute: "2-digit" });
const when = (s: string) => `${day(s)} · ${time(s)}`;
const blank = { title: "", sport: "Beach volleyball", venue: "", starts: "", capacity: 8, description: "", price: "", bizum: "" };
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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUndo, setAiUndo] = useState<string | null>(null);
  const aiRequest = useRef(0);
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
  function resetAi() {
    aiRequest.current++;
    setAiUndo(null);
    setAiBusy(false);
  }
  function close() {
    resetAi();
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
            : role === "watch" ? "See you there as a spectator." : "You're in. See you on court.",
      );
  }
  async function aiDraft() {
    if (form.venue.trim().length < 3) return setError("Add where you'll play first, then the AI can write the notes.");
    const request = ++aiRequest.current;
    const before = form.description;
    setAiBusy(true);
    setError("");
    try {
      const r = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title.trim().length >= 3 ? form.title.trim() : `${form.sport} game`, sport: form.sport, venue: form.venue, description: before }) });
      const result = (await r.json()) as { error?: string; description?: string };
      if (request !== aiRequest.current) return;
      if (!r.ok || !result.description) throw new Error(result.error || "The AI couldn't write a draft.");
      const draft = result.description;
      setAiUndo(before);
      setForm((f) => ({ ...f, description: draft }));
      setNotice("AI draft added. Read it and edit before saving.");
    } catch (e) {
      if (request === aiRequest.current) setError(e instanceof Error ? e.message : "The AI couldn't write a draft.");
    } finally {
      if (request === aiRequest.current) setAiBusy(false);
    }
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
    setForm(blank); resetAi();
    setView("organise");
    setSelected(id);
    setNotice(editing ? "Changes saved." : "Your game is live. Share the link with your players.");
  }
  async function repeatNextWeek(e: SportEvent) {
    setShare("");
    const next = new Date(Date.parse(e.starts) + 7 * 86400000).toISOString();
    const result = await action("/api/events", {
      title: e.title, sport: sportName(e.sport), venue: e.venue, capacity: e.capacity, description: e.description, access: e.access || ACCESS,
      price: e.price || "", bizum: e.bizum || "", starts: next, publish: true,
    });
    if (result) { setSelected(result.id); setNotice(`Next week's game is live: ${when(next)}.`); }
  }
  const link = (e: SportEvent) => `${location.origin}/?event=${encodeURIComponent(e.id)}`;
  const invite = (e: SportEvent) =>
    `${inviteEmoji[sportName(e.sport)] || ""} ${e.title}\n${when(e.starts)} · ${e.venue}\n${Math.max(0, e.capacity - e.players)} of ${e.capacity} spots left${e.price ? ` · ${money(e.price)} per player${e.bizum ? ` (Bizum ${e.bizum})` : ""}` : ""}\nJoin here: ${link(e)}`;
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
    .filter((e) => view !== "discover" || sport === "All" || sportName(e.sport) === sport)
    .sort((a, b) => (view === "organise" ? Number(!upcoming(a)) - Number(!upcoming(b)) : 0) || Date.parse(a.starts) - Date.parse(b.starts));
  const invited = typeof location !== "undefined" && !!new URLSearchParams(location.search).get("event");
  const invitedGame = invited ? events.find((e) => e.id === selected) : undefined;
  const tabs: [string, string, string][] = profile?.role === "organiser" ? [["organise", "My games", "list"]] : [["discover", "Games", "search"], ["mine", "My games", "check"]];
  // Real numbers for the scoreboard under the headline. Nothing here is estimated.
  const openGames = events.filter((e) => e.status === "published" && upcoming(e));
  const mineUpcoming = events.filter((e) => e.mine && !e.demo && e.status === "published" && upcoming(e));
  const joined = events.filter((e) => upcoming(e) && e.status === "published" && (e.myPlay === "confirmed" || e.myWatch === "confirmed"));
  const waitlists = events.filter((e) => upcoming(e) && e.status === "published" && e.myPlay === "waitlisted");
  const score: [number, string][] =
    profile?.role === "organiser"
      ? [[mineUpcoming.length, mineUpcoming.length === 1 ? "upcoming game" : "upcoming games"], [mineUpcoming.reduce((n, e) => n + e.players, 0), "players in"], [mineUpcoming.reduce((n, e) => n + (e.waiting || 0), 0), "on waitlists"]]
      : view === "mine"
        ? [[joined.length, joined.length === 1 ? "game joined" : "games joined"], [waitlists.length, waitlists.length === 1 ? "waitlist" : "waitlists"]]
        : [[openGames.length, openGames.length === 1 ? "open game" : "open games"], [openGames.reduce((n, e) => n + Math.max(0, e.capacity - e.players), 0), "spots free"], [new Set(openGames.map((e) => sportName(e.sport))).size, "sports with games"]];
  const preview = [...openGames].filter((e) => !e.demo).sort((a, b) => Date.parse(a.starts) - Date.parse(b.starts))[0];


  const dateTile = (s: string) => (
    <span className="date-tile">
      <span>{fmt(s, { weekday: "short" })}</span>
      <strong>{fmt(s, { day: "numeric" })}</strong>
      <span>{fmt(s, { month: "short" })}</span>
    </span>
  );
  const gameCard = (e: SportEvent, i: number, interactive = true) => {
    const left = Math.max(0, e.capacity - e.players);
    const past = !upcoming(e);
    const badge = e.status === "cancelled" ? <span className="badge red">Cancelled</span>
      : e.status === "draft" ? <span className="badge grey">Draft</span>
        : past ? <span className="badge grey">Played</span>
          : e.myPlay === "confirmed" ? <span className="badge green"><Icon name="check" size={13} />You&apos;re in</span>
            : e.myPlay === "waitlisted" ? <span className="badge amber">Waitlist #{e.myWaitPosition ?? "?"}</span>
              : e.myWatch === "confirmed" ? <span className="badge grey">Watching</span>
                : e.demo ? <span className="badge grey">Sample</span> : null;
    const body = (
      <>
        <div className="card-top">
          <span className="sport-tag"><i className="dot" />{sportName(e.sport)}</span>
          {badge}
        </div>
        <div className="card-main">
          {dateTile(e.starts)}
          <div className="card-text">
            <h3>{e.title}</h3>
            <p className="when"><Icon name="clock" size={15} />{time(e.starts)}</p>
            <p className="where"><Icon name="pin" size={15} />{e.venue}</p>
          </div>
        </div>
        <div className="spots">
          <Slots taken={e.players} capacity={e.capacity} />
          <div className="spots-line">
            <span>{e.status === "cancelled" ? "Cancelled" : past ? `${e.players} played` : left > 0 ? `${left} of ${e.capacity} spots free` : `Full${e.waiting ? `, ${e.waiting} waiting` : ""}`}</span>
            {e.price ? <span className="price">{money(e.price)}</span> : null}
          </div>
        </div>
      </>
    );
    const cls = `card ${sportKey(e.sport)}${past || e.status === "cancelled" ? " dim" : ""}`;
    return interactive
      ? <button key={e.id} className={cls} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} onClick={() => setSelected(e.id)}>{body}</button>
      : <div key={e.id} className={`${cls} still`}>{body}</div>;
  };
  const footer = (
    <footer className="site-footer">
      <div className="foot-brand"><Logo /><p>The home for niche sports games in Barcelona.</p></div>
      <p className="foot-note">CourtSide never ranks or bans a player for missing games. Payments go straight to the organiser, not through us.</p>
    </footer>
  );

  if (!profileReady) return <main className="loading"><div className="spinner" aria-label="Loading" /></main>;
  if (!profile)
    return (
      <main className="site">
        <header className="site-header">
          <Link className="brand" href="/" aria-label="CourtSide home"><Logo /></Link>
          {!invited && <nav className="head-links" aria-label="Page sections"><a href="#how">How it works</a></nav>}
          <button type="button" className="btn ghost small" onClick={() => setSignup({ ...signup, mode: signup.mode === "signup" ? "login" : "signup", error: "", password: "", confirm: "" })}>
            {signup.mode === "signup" ? "Log in" : "Create account"}
          </button>
        </header>
        <section className="auth-hero">
          <div className="auth-copy">
            <h1>{invited ? <>You&apos;ve been invited to a game.</> : <>Niche sports, <span className="hl">properly organised.</span></>}</h1>
            <p className="lede">CourtSide is the home for beach volley, beach padel and street basketball games in Barcelona. Organisers share one link in their group. Players find a game and grab a spot.</p>
            {invitedGame ? (
              <div className="invite-preview">{gameCard(invitedGame, 0, false)}</div>
            ) : (
              <ul className="points">
                <li><Icon name="share" /><span><strong>One link for the whole group.</strong> Paste it in WhatsApp. People join to play or to watch.</span></li>
                <li><Icon name="users" /><span><strong>A waitlist that runs itself.</strong> When someone drops out, the next person moves in.</span></li>
                <li><Icon name="search" /><span><strong>Every game in one place.</strong> Find a game without knowing anyone in the group.</span></li>
              </ul>
            )}
          </div>
          <form className="auth-card" noValidate onSubmit={(ev) => { ev.preventDefault(); finishSignup(); }}>
            <h2>{signup.mode === "login" ? "Welcome back" : invited ? "Join this game" : "Create your account"}</h2>
            <p className="auth-sub">{signup.mode === "login" ? "Log in to see your games." : invited ? "It takes a few seconds, then we take you straight to the game." : "Choose how you will use CourtSide."}</p>
            {signup.mode === "signup" && (
              <>
                <fieldset className="role-pick">
                  <legend>I want to</legend>
                  {([
                    ["player", "search", "Play or watch", "Find games and grab a spot"],
                    ["organiser", "list", "Organise games", "Create games and track who's in"],
                  ] as const).map(([key, icon, label, hint]) => (
                    <button type="button" key={key} aria-pressed={signup.role === key} className={signup.role === key ? "role-option chosen" : "role-option"} onClick={() => setSignup({ ...signup, role: key, error: "" })}>
                      <span className="role-icon"><Icon name={icon} size={20} /></span>
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
        </section>
        {!invited && (
          <section className="court-band" id="how" aria-label="How CourtSide works">
            <Court />
            <div className="court-band-copy">
              <h2>Built for the games big apps ignore.</h2>
              <p>Football and club courts have their own apps. Beach volley, beach padel and street basketball live in WhatsApp groups, so if you are not in the group, you never hear about the game. CourtSide gives those games a home.</p>
              {preview && (
                <div className="next-up">
                  <p className="label">Next open game</p>
                  {gameCard(preview, 0, false)}
                </div>
              )}
            </div>
          </section>
        )}
        {footer}
      </main>
    );

  const isOrganiser = profile.role === "organiser";
  const newGame = () => { setForm(blank); resetAi(); setEditing(null); setCompose(true); setSelected(null); setError(""); };
  return (
    <main className="site app">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="CourtSide home"><Logo /></Link>
        <nav className="tabs-desktop" aria-label="Main navigation">
          {tabs.map(([key, label]) => (
            <button key={key} className={view === key ? "tab active" : "tab"} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>
        <div className="topbar-right">
          {isOrganiser && <button className="btn primary hide-mobile" onClick={newGame}><Icon name="plus" size={17} />New game</button>}
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

      <div onClick={() => menu && setMenu(false)}>
        <section className={view === "mine" ? "hero compact" : "hero"}>
          <div className="hero-copy">
            <h1>
              {view === "organise" ? <>Welcome back, <span className="hl">{profile.name}.</span></>
                : view === "mine" ? <>Your games</>
                  : <>Niche sports games in Barcelona, <span className="hl">all in one place.</span></>}
            </h1>
            <p className="lede">
              {view === "organise" ? "Share one link in your group chat. CourtSide keeps the list, the waitlist and who has paid."
                : view === "mine" ? "Games you have joined, and the ones you are waiting for."
                  : "Beach volley, beach padel, street basketball and beach tennis, run by local organisers. Join in a tap. If a game is full, you are next in line when someone drops out."}
            </p>
            {loaded && (
              <dl className="scoreboard">
                {score.map(([n, label]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}
              </dl>
            )}
          </div>
          {view !== "mine" && <div className="hero-art"><Court /></div>}
        </section>

        <section className="board">
          <div className="board-head">
            <h2>{view === "organise" ? "Your games" : view === "mine" ? "Joined and waiting" : "Open games"}</h2>
            <button className="btn ghost small" disabled={busy} onClick={() => refresh().catch(() => setError("Could not refresh."))}><Icon name="refresh" size={16} />Refresh</button>
          </div>

          {view === "discover" && (
            <div className="chips" role="group" aria-label="Filter by sport">
              {["All", ...sports].map((s) => (
                <button key={s} className={`chip ${s === "All" ? "" : sportClass[s]}${sport === s ? " active" : ""}`} aria-pressed={sport === s} onClick={() => setSport(s)}>
                  {s !== "All" && <i className="dot" />}{s === "All" ? "All sports" : s}
                </button>
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
                  <h3>Create your first game</h3>
                  <ol className="steps">
                    <li><Icon name="pen" />Create a game: sport, time, place and spots</li>
                    <li><Icon name="share" />Share the link in your group chat</li>
                    <li><Icon name="users" />See who&apos;s in, who&apos;s waiting and who has paid</li>
                  </ol>
                  <div className="row center">
                    <button className="btn primary" onClick={newGame}><Icon name="plus" size={17} />New game</button>
                    {!events.some((e) => e.mine) && (
                      <button className="btn ghost" disabled={busy} onClick={async () => { if (await action("/api/examples", {})) setNotice("3 sample games added."); }}>Try with sample games</button>
                    )}
                  </div>
                </>
              ) : view === "mine" ? (
                <>
                  <h3>No games yet</h3>
                  <p>Games you join show up here.</p>
                  <button className="btn primary" onClick={() => setView("discover")}>Find a game</button>
                </>
              ) : (
                <>
                  <h3>No open games {sport !== "All" ? `for ${sport.toLowerCase()}` : "right now"}</h3>
                  <p>New games appear here as soon as organisers post them.</p>
                  {sport !== "All" && <button className="btn ghost" onClick={() => setSport("All")}>Show all sports</button>}
                </>
              )}
            </div>
          ) : (
            <div className="grid">{list.map((e, i) => gameCard(e, i))}</div>
          )}

          {isOrganiser && learning && (learning.changes.length > 0 || events.some((e) => e.mine)) && (
            <details className="insights">
              <summary><span><strong>Reserve suggestions</strong><span className="muted">Learns from your finished games</span></span></summary>
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
                      <div><strong>{sportName(c.sport)}, {c.slot}</strong><span className="muted">Drop rate {c.old_rate == null ? "first set at" : `${Math.round(c.old_rate * 100)}% →`} {Math.round(c.new_rate * 100)}% after {c.games} games</span></div>
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
        {footer}
      </div>

      <nav className="tabs-mobile" aria-label="Main navigation">
        {tabs.map(([key, label, icon]) => (
          <button key={key} className={view === key ? "active" : ""} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}><Icon name={icon} size={22} />{label}</button>
        ))}
        {isOrganiser && <button className="new" onClick={newGame}><span className="new-dot"><Icon name="plus" size={20} /></span>New game</button>}
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
                <button type="button" key={s} className={`chip ${sportClass[s]}${form.sport === s ? " active" : ""}`} aria-pressed={form.sport === s} onClick={() => setForm({ ...form, sport: s })}><i className="dot" />{s}</button>
              ))}
            </fieldset>
            <label>When<input type="datetime-local" required min={now ? toLocalInput(new Date(now + 5 * 60000).toISOString()) : undefined} max="2030-12-31T23:59" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /></label>
            <label>Where<input required maxLength={160} value={form.venue} placeholder="e.g. Barceloneta beach, near the W hotel" onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
            <div className="two">
              <label>Spots
                <div className="stepper">
                  <button type="button" aria-label="Fewer spots" onClick={() => setForm({ ...form, capacity: Math.max(1, form.capacity - 1) })}>−</button>
                  <input type="number" min={1} max={200} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
                  <button type="button" aria-label="More spots" onClick={() => setForm({ ...form, capacity: Math.min(200, form.capacity + 1) })}>+</button>
                </div>
              </label>
              <label><span className="lbl">Price per player <span className="opt">optional</span></span><input maxLength={20} value={form.price} placeholder="e.g. €5" onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            </div>
            {form.price.trim() && (
              <label><span className="lbl">Your Bizum number <span className="opt">optional</span></span><input inputMode="tel" maxLength={20} value={form.bizum} placeholder="e.g. 612 345 678" onChange={(e) => setForm({ ...form, bizum: e.target.value })} /></label>
            )}
            <label><span className="lbl">Game name <span className="opt">optional</span></span><input maxLength={100} value={form.title} placeholder={`${form.sport} game`} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label><span className="lbl">Notes for players <span className="opt">optional</span></span><textarea rows={3} maxLength={2000} disabled={aiBusy} value={form.description} placeholder="Level, what to bring, where exactly to meet" onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="ai-row">
              <button type="button" className="btn ghost small" disabled={aiBusy || busy} onClick={aiDraft}><Icon name="pen" size={16} />{aiBusy ? "Writing…" : "Draft notes with AI"}</button>
              {aiUndo !== null && <button type="button" className="link small" onClick={() => { setForm((f) => ({ ...f, description: aiUndo })); setAiUndo(null); }}>Undo</button>}
              <span className="muted ai-note">{aiUndo !== null ? "AI draft. Check every detail before saving." : "Uses your sport, place and notes. Nothing is saved until you do."}</span>
            </div>
            {suggestion && !suggestion.off && suggestion.ready && (
              <div className="hint-card">
                <strong>Keep {suggestion.reserves} reserve{suggestion.reserves === 1 ? "" : "s"}?</strong>
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
            <button className="btn primary block" disabled={busy || aiBusy} type="submit">{busy ? "Saving…" : editing ? "Save changes" : "Create game"}</button>
          </form>
        ) : current ? (
          <div className={`detail ${sportKey(current.sport)}`}>
            <span className="sport-tag"><i className="dot" />{sportName(current.sport)}{current.demo ? ", sample game" : ""}</span>
            <h2 id="sheet-title">{current.title}</h2>
            <div className="facts">
              <p><Icon name="calendar" /><span><strong>{day(current.starts)}</strong> at <strong>{time(current.starts)}</strong></span></p>
              <p><Icon name="pin" /><a href={mapsLink(current.venue)} target="_blank" rel="noreferrer">{current.venue}</a></p>
              {current.price && <p><Icon name="euro" /><span><strong>{money(current.price)}</strong> per player{current.bizum ? <>, Bizum to <strong>{current.bizum}</strong></> : null}</span></p>}
            </div>

            {current.status === "cancelled" ? <p className="banner red">This game has been cancelled.</p>
              : current.status === "draft" ? <p className="banner grey">Draft: players can&apos;t see this yet.</p>
                : !upcoming(current) ? <p className="banner grey">This game has started. Sign-ups are closed.</p>
                  : current.myPlay === "confirmed" ? <p className="banner green"><Icon name="check" />You&apos;re in{current.price ? (current.myPaid ? ", paid" : ", not paid yet") : ""}</p>
                    : current.myPlay === "waitlisted" ? <p className="banner amber">You&apos;re #{current.myWaitPosition ?? "?"} on the waitlist. If someone drops, you move up automatically.</p>
                      : null}

            <div className="spots big">
              <Slots taken={current.players} capacity={current.capacity} />
              <div className="spots-line">
                <span><strong>{current.players}</strong> of {current.capacity} spots taken</span>
                <span className="muted">{[current.waiting ? `${current.waiting} waiting` : "", current.spectators ? `${current.spectators} watching` : ""].filter(Boolean).join(", ")}</span>
              </div>
            </div>
            {current.names && (
              <div className="whos-in">
                <h4>Who&apos;s in</h4>
                <div className="faces">{current.names.split("|").map((n, i) => <span key={i} className="face" title={n}><i>{n.slice(0, 1).toUpperCase()}</i>{n}</span>)}</div>
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
                    <button className="btn primary grow" onClick={() => sendText(invite(current))}><Icon name="share" size={17} />Share invite</button>
                    <button className="btn ghost grow" onClick={() => sendText(nudge(current))}><Icon name="clock" size={17} />Ask &quot;still coming?&quot;</button>
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
                                    {p.paid ? "Paid" : "Not paid"}
                                  </button>
                                )}
                                {p.role === "play" && p.state === "confirmed" && current.status === "published" && !upcoming(current) && !(game?.event === current.id && game.data?.closed_at) && (
                                  <button className={p.showed === false ? "toggle off" : p.showed ? "toggle on" : "toggle"} disabled={busy} aria-label={`${p.name || "Player"}: ${p.showed == null ? "attendance not recorded" : p.showed ? "showed up" : "did not show"}`}
                                    onClick={async () => { const next = p.showed !== true; if (await action("/api/learning", { action: "attendance", event: current.id, rsvp: p.id, showed: next })) setNotice(`${p.name || "Player"}: ${next ? "showed up" : "didn't show"}.`); }}>
                                    {p.showed == null ? "Showed up?" : p.showed ? "Showed up" : "Didn't show"}
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
                      resetAi(); setForm({ title: current.title, sport: sportName(current.sport), venue: current.venue, starts: toLocalInput(current.starts), capacity: current.capacity, description: current.description, price: current.price || "", bizum: current.bizum || "" });
                      setSelected(null);
                      setCompose(true);
                    }}><Icon name="edit" size={16} />Edit</button>
                  )}
                  {current.status !== "cancelled" && <button className="btn ghost small" disabled={busy} onClick={() => repeatNextWeek(current)}><Icon name="repeat" size={16} />Repeat next week</button>}
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
