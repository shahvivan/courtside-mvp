"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Participant, SportEvent } from "../lib/types";

const sports = ["Beach volleyball", "Padel", "Basketball", "Beach tennis"];
const date = (s: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(s));
const blank = {
  title: "",
  sport: "Beach volleyball",
  venue: "",
  starts: "",
  capacity: 12,
  description: "",
  access: "Free to watch. Spectator interest does not reserve a seat.",
};

export default function Home() {
  const [events, setEvents] = useState<SportEvent[]>([]),
    [view, setView] = useState("discover"),
    [sport, setSport] = useState("All sports"),
    [search, setSearch] = useState(""),
    [day, setDay] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [compose, setCompose] = useState(false),
    [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [share, setShare] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [name, setName] = useState("");
  const [roster, setRoster] = useState<{ event: string; participants: Participant[] } | null>(null);
  const [rosterError, setRosterError] = useState("");
  async function assist() {
    setBusy(true);
    setError("");
    setAiDraft("");
    try {
      const r = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await r.json()) as {
        description: string;
        error?: string;
      };
      if (!r.ok) throw new Error(result.error);
      setAiDraft(result.description);
      setNotice(
        "Local AI suggestion ready. Check every claim before using it.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI unavailable.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const r = await fetch("/api/events");
    if (!r.ok) throw new Error("Could not load events.");
    const data = (await r.json()) as { events: SportEvent[] };
    setEvents(data.events);
    setLoaded(true);
  }
  async function reload() {
    setBusy(true);
    setError("");
    try {
      await refresh();
      setNow(Date.now());
      setNotice("Latest RSVP, waitlist and payment statuses loaded.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not refresh events.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load events.");
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
      .catch((e) => {
        if (active) setError(e.message);
      });
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (compose || selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [compose, selected]);
  useEffect(() => {
    const event = events.find((item) => item.id === selected);
    if (!event?.mine) return;
    let active = true;
    fetch(`/api/participants?event=${encodeURIComponent(event.id)}`)
      .then(async (response) => {
        const result = await response.json() as { participants: Participant[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load the roster.");
        if (active) {
          setRoster({ event: event.id, participants: result.participants });
          setRosterError("");
        }
      })
      .catch((error) => {
        if (active) setRosterError(error instanceof Error ? error.message : "Could not load the roster.");
      });
    return () => { active = false; };
  }, [selected, events]);
  async function action(url: string, data: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await r.json()) as {
        error?: string;
        state?: string;
        id: string;
      };
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
    setAiDraft("");
    setEditing(null);
    setRoster(null);
    setRosterError("");
  }
  async function rsvp(e: SportEvent, role: string, cancel = false) {
    if (!cancel && !name.trim()) {
      setError("Enter your first name before joining.");
      return;
    }
    const result = await action("/api/rsvp", {
      event: e.id,
      role,
      name: name.trim(),
      action: cancel ? "cancel" : "join",
    });
    if (result)
      setNotice(
        cancel
          ? "Your RSVP is cancelled. If you held a player place, the first waiting player moves up automatically."
          : result.state === "waitlisted"
            ? "You are on the player waitlist. A place is not confirmed yet."
            : role === "watch"
              ? "Your interest is saved. This does not reserve a seat."
              : "Your player place is saved for this pilot event.",
      );
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, starts: new Date(form.starts).toISOString() };
    const result = await action(
      "/api/events",
      editing ? { id: editing, action: "edit", data: payload } : payload,
      editing ? "PATCH" : "POST",
    );
    if (result) {
      setCompose(false);
      setSelected(editing || result.id);
      setEditing(null);
      setForm(blank);
      setView("organise");
      setNotice("Draft saved. Review the details before publishing.");
    }
  }
  function template() {
    if (!form.title.trim() || !form.venue.trim()) {
      setError("Add an event title and venue before using the writing helper.");
      return;
    }
    setForm({
      ...form,
      description: `${form.title.trim()} brings people together for ${form.sport.toLowerCase()} at ${form.venue.trim()}. There are ${form.capacity} player places. You can also register interest in watching. Please confirm equipment, skill level and the meeting point with the organiser before attending.`,
    });
    setNotice(
      "Template added using your details. Review and edit it before saving.",
    );
    setError("");
  }
  function invitation(e: SportEvent) {
    setShare(
      `Come ${e.sport.toLowerCase() === "basketball" ? "shoot hoops" : "join us"} at ${e.title}. ${date(e.starts)} (Barcelona time). ${e.venue}. ${Math.max(0, e.capacity - e.players)} player places left. Prefer to watch? Register spectator interest. Pilot event, confirm details with the organiser.\n${location.origin}/?event=${encodeURIComponent(e.id)}`,
    );
  }
  function exportEvents() {
    const mine = events.filter((e) => e.mine);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            notice:
              "Pilot records. RSVPs are not attendance or demand validation.",
            events: mine,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courtside-pilot-events.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const current = events.find((e) => e.id === selected);
  const filtered = events.filter(
    (e) =>
      (view === "organise"
        ? !!e.mine
        : view === "mine"
          ? ["confirmed", "waitlisted"].includes(e.myPlay || "") ||
            e.myWatch === "confirmed" ||
            (e.status === "cancelled" && (!!e.myPlay || !!e.myWatch))
          : e.status === "published" && Date.parse(e.starts) > now) &&
      (sport === "All sports" || e.sport === sport) &&
      `${e.title} ${e.venue}`.toLowerCase().includes(search.toLowerCase()) &&
      (!day ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Madrid",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(e.starts)) === day),
  );
  const title =
    view === "organise"
      ? "Your events"
      : view === "mine"
        ? "My RSVPs"
        : "Find a game";
  return (
    <main>
      <header>
        <Link className="brand" href="/">
          courtside<span>↗</span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["discover", "Discover"],
            ["mine", "My RSVPs"],
            ["organise", "Organise"],
          ].map(([key, label]) => (
            <button
              className={view === key ? "nav active" : "nav"}
              aria-current={view === key ? "page" : undefined}
              key={key}
              onClick={() => {
                setView(key);
                setSport("All sports");
                setSearch("");
                setDay("");
              }}
            >
              {label}
            </button>
          ))}
          <a className="nav review-link" href="/review/index.html">Evidence review ↗</a>
        </nav>
        <button
          onClick={() => {
            setCompose(true);
            setSelected(null);
            setError("");
          }}
        >
          Create event <span aria-hidden="true">＋</span>
        </button>
      </header>
      <div className="pilot-bar">
        PRIVATE PILOT{" "}
        <span>
          Saved to the app database. No venue bookings or money transfers.
        </span>
      </div>
      <section id="events">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {view === "organise"
                ? "ORGANISER WORKSPACE"
                : view === "mine" ? "YOUR PLACES AND WAITLISTS" : "BARCELONA SPORTS"}
            </p>
            <h1 className="workspace-title">{title}</h1>
            <p className="workspace-summary">
              {view === "organise"
                ? "Create a game, manage its roster and record payments made directly to you."
                : view === "mine"
                  ? "Check your place, view payment status or let the organiser know you cannot make it."
                  : "Choose a game to play or watch. Full games use a first-in, first-out player waitlist."}
            </p>
          </div>
          <div className="workspace-actions">
            <button className="secondary" disabled={busy} onClick={reload}>Refresh status</button>
          {view === "organise" && (
            <button className="secondary" onClick={exportEvents}>
              Export pilot data ↗
            </button>
          )}
          </div>
        </div>
        {view === "organise" && (
          <p className="notice">
            Only events created in this browser session appear here. Clearing
            cookies removes your management access. Player and spectator counts
            are RSVP intentions, not attendance.
          </p>
        )}
        <div className="filters">
          <label>
            Sport
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              {["All sports", ...sports].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Find a game
            <input
              placeholder="Event or neighbourhood"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Barcelona date
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          {(sport !== "All sports" || search || day) && (
            <button
              className="text-button"
              onClick={() => {
                setSport("All sports");
                setSearch("");
                setDay("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {!compose && !selected && error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p role="status" aria-live="polite" className="notice">
          {notice}
        </p>
        {!loaded && !error ? (
          <p>Loading your games…</p>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="empty-mark">↗</span>
            <h3>
              {events.length === 0 ? "Create your first game" : "No matching games"}
            </h3>
            <p>
              {events.length === 0
                ? "Try three clearly labelled sample events or create your first event."
                : "Try another filter, explore a game, or create an event of your own."}
            </p>
            {events.length === 0 && (
              <button
                disabled={busy}
                onClick={async () => {
                  if (await action("/api/examples", {}))
                    setNotice(
                      "Three fictional examples loaded. You can manage them under Organise.",
                    );
                }}
              >
                Load sample events
              </button>
            )}
            <button className="secondary" onClick={() => setCompose(true)}>
              Create an event
            </button>
          </div>
        ) : (
          <div className="event-grid">
            {filtered.map((e, i) => (
              <article key={e.id} style={{ animationDelay: `${i * 45}ms` }}>
                <div className="event-meta">
                  {e.sport.toUpperCase()}{" "}
                  <span>
                    {e.demo ? "SAMPLE · " : ""}{e.status === "published" ? "OPEN" : e.status.toUpperCase()}
                  </span>
                </div>
                <h3>
                  <button
                    className="title-button"
                    onClick={() => setSelected(e.id)}
                  >
                    {e.title}
                  </button>
                </h3>
                <p>
                  {date(e.starts)} · Barcelona time
                  <br />
                  {e.venue}
                </p>
                <div className="count-line">
                  <span>
                    {e.players}/{e.capacity} players
                  </span>
                  <span>{e.spectators} watching</span>
                </div>
                <div className="capacity-track">
                  <span
                    style={{
                      width: `${Math.min(100, (e.players / e.capacity) * 100)}%`,
                    }}
                  />
                </div>
                {e.waiting > 0 && <p>{e.waiting} on the player waitlist</p>}
                {e.myPlay === "confirmed" && <p className="rsvp-state">Your player place is confirmed</p>}
                {e.myPlay === "waitlisted" && <p className="rsvp-state">Your waitlist position: {e.myWaitPosition ?? "pending"}</p>}
                {e.myWatch === "confirmed" && <p className="notice">Your spectator interest is saved</p>}
                <button
                  className="text-button"
                  onClick={() => setSelected(e.id)}
                >
                  {view === "organise" ? "Manage event" : view === "mine" ? "View my RSVP" : "View game & join"} ↗
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer>
        <Link className="brand" href="/">
          courtside↗
        </Link>
        <p>Barcelona sports pilot · Built to test an idea, together.</p>
        <p>
          No verified identities, money transfers or venue reservations. Use fictional
          details during testing.
        </p>
      </footer>
      <dialog
        ref={dialog}
        aria-labelledby="event-dialog-title"
        onCancel={close}
        onClose={() => {
          setCompose(false);
          setSelected(null);
        }}
      >
        <div className="dialog-head">
          <span className="eyebrow">
            {compose ? "ORGANISER STUDIO" : "EVENT DETAILS"}
          </span>
          <button className="close" onClick={close} aria-label="Close dialog">
            ×
          </button>
        </div>
        {compose ? (
          <form onSubmit={create}>
            <h2 id="event-dialog-title">{editing ? "Edit event draft" : "Create an event"}</h2>
            <p className="notice">
              Create a pilot listing. Save a draft, check the details, then
              publish to discovery.
            </p>
            <label>
              Event title
              <input
                required
                minLength={3}
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Sunday sand social"
              />
            </label>
            <div className="form-grid">
              <label>
                Sport
                <select
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                >
                  {sports.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Player places
                <input
                  type="number"
                  required
                  min={1}
                  max={200}
                  step={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label>
              Venue or meeting point
              <input
                required
                minLength={3}
                maxLength={160}
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Barceloneta beach, exact meeting point"
              />
            </label>
            <label>
              Starts at, your device time (
              {Intl.DateTimeFormat().resolvedOptions().timeZone})
              <input
                required
                type="datetime-local"
                value={form.starts}
                onChange={(e) => setForm({ ...form, starts: e.target.value })}
              />
            </label>
            <p className="notice">
              Event pages display Barcelona time. This form uses your device
              timezone.
            </p>
            <label>
              What should players know?
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Level, equipment, meeting point and what to expect."
              />
            </label>
            <button type="button" className="secondary" onClick={template}>
              Help me write this ✦
            </button>
            <p className="notice">
              Instant template using your entered details. Or try the local AI
              assistant below. Review all wording.
            </p>
            <label>
              Information for spectators
              <textarea
                required
                minLength={3}
                maxLength={300}
                rows={2}
                value={form.access}
                onChange={(e) => setForm({ ...form, access: e.target.value })}
              />
            </label>
            <p className="notice">
              No admission fees collected. Do not include private contact
              details. Venue access and permits must be checked separately
              before any real event.
            </p>
            <button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save draft →"}
            </button>
          </form>
        ) : current ? (
          <div>
            <span className="tag">
              {current.demo ? "SAMPLE EVENT · " : ""}{current.status.toUpperCase()}
            </span>
            <h2 id="event-dialog-title">{current.title}</h2>
            <p>{date(current.starts)} · Barcelona time</p>
            <p>{current.venue}</p>
            <p className="description">{current.description}</p>
            <div className="detail-counts">
              <div>
                <strong>
                  {current.players}
                  <small> / {current.capacity}</small>
                </strong>
                <span>players confirmed</span>
              </div>
              <div>
                <strong>{current.spectators}</strong>
                <span>spectator interest</span>
              </div>
              <div>
                <strong>{current.waiting}</strong>
                <span>players waiting</span>
              </div>
            </div>
            <h3>Come to play</h3>
            <button className="text-button" disabled={busy} onClick={reload}>Refresh my status</button>
            <p>
              {current.myPlay === "confirmed"
                ? "Your player place is saved."
                : current.myPlay === "waitlisted"
                  ? `You are number ${current.myWaitPosition ?? "—"} on the waitlist. When a player cancels, the first waiting player moves up automatically. Check back here for your status; no notifications are sent.`
                  : `${Math.max(0, current.capacity - current.players)} player places available. Full games use a waitlist.`}
            </p>
            {current.myPlay === "confirmed" && (
              <div className="payment-state">
                <strong>Payment to organiser: {current.myPaid ? "marked paid" : "not marked paid"}</strong>
                <p>The organiser records this manually. CourtSide is free and never collects or transfers money. Confirm any amount or correction directly with the organiser.</p>
              </div>
            )}
            <h3>Come to watch</h3>
            <p>{current.access}</p>
            <p className="notice">
              Spectator interest is separate from player capacity and does not
              reserve admission.
            </p>
            {current.status === "published" &&
              Date.parse(current.starts) > now && (
                <>
                {(!["confirmed", "waitlisted"].includes(current.myPlay || "") || current.myWatch !== "confirmed") && (
                  <label className="join-name">
                    Your first name, for the organiser’s roster
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={60}
                      autoComplete="given-name"
                      placeholder="First name"
                    />
                    <span className="notice">Use a fictional name when testing. Your RSVP belongs to this browser; clearing cookies loses access.</span>
                  </label>
                )}
                <div className="actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      rsvp(
                        current,
                        "play",
                        ["confirmed", "waitlisted"].includes(
                          current.myPlay || "",
                        ),
                      )
                    }
                  >
                    {["confirmed", "waitlisted"].includes(current.myPlay || "")
                      ? current.myPlay === "waitlisted" ? "Leave the waitlist" : "I can’t make it"
                      : current.players >= current.capacity
                        ? "Join player waitlist"
                        : "Join to play"}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      rsvp(current, "watch", current.myWatch === "confirmed")
                    }
                  >
                    {current.myWatch === "confirmed"
                      ? "Cancel my spectator interest"
                      : "Come watch"}
                  </button>
                </div>
                {["confirmed", "waitlisted"].includes(current.myPlay || "") && (
                  <p className="notice">Leaving frees your place. Rejoining starts a new RSVP at the back of any waitlist, with payment status reset. Arrange any refunds directly with the organiser.</p>
                )}
                </>
              )}
            {current.status === "published" &&
              Date.parse(current.starts) <= now && (
                <p className="notice">
                  This event has started. Registrations are closed.
                </p>
              )}
            {current.status === "cancelled" && (
              <p className="error">This event has been cancelled.</p>
            )}
            {!!current.mine && (
              <div className="owner-tools">
                <h3>Organiser controls</h3>
                <p className="notice">Only the browser that created this event can see and manage its roster. This is not a shared organiser account.</p>
                <div className="roster">
                  <h4>Player and spectator roster</h4>
                  <p className="notice">Mark payments received outside CourtSide. These are manual records, not payment verification or collection.</p>
                  {rosterError ? <p role="alert" className="error">{rosterError}</p>
                    : roster?.event !== current.id ? <p>Loading roster…</p>
                    : roster.participants.length === 0 ? <p className="notice">No active RSVPs yet. Publish the event and share its invitation.</p>
                    : <ul className="roster-list">
                        {roster.participants.map((participant) => (
                          <li key={participant.id}>
                            <div>
                              <strong>{participant.name || "Name not recorded"}</strong>
                              <span>{participant.role === "watch" ? "Spectator interest" : participant.state === "waitlisted" ? "Player · waitlisted" : "Player · confirmed"}</span>
                            </div>
                            {participant.role === "play" && participant.state === "confirmed" ? (
                              <button
                                className={participant.paid ? "payment-toggle paid" : "payment-toggle secondary"}
                                disabled={busy || current.status === "cancelled"}
                                aria-label={`${participant.name || "Player"}: ${participant.paid ? "paid" : "not paid"}. Mark ${participant.paid ? "not paid" : "paid"}`}
                                aria-pressed={participant.paid === true}
                                onClick={async () => {
                                  const result = await action(`/api/participants?event=${encodeURIComponent(current.id)}`, { id: participant.id, paid: !participant.paid }, "PATCH");
                                  if (result) setNotice(`${participant.name || "Player"} marked ${participant.paid ? "not paid" : "paid"}. No money was moved.`);
                                }}
                              >
                                {participant.paid ? "Paid ✓" : "Not paid"}
                              </button>
                            ) : <span className="notice">Payment not tracked</span>}
                          </li>
                        ))}
                      </ul>}
                </div>
                {current.status === "draft" && (
                  <>
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditing(current.id);
                        const dt = new Date(current.starts);
                        const local = new Date(
                          dt.getTime() - dt.getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16);
                        setForm({
                          title: current.title,
                          sport: current.sport,
                          venue: current.venue,
                          starts: local,
                          capacity: current.capacity,
                          description: current.description,
                          access: current.access,
                        });
                        setSelected(null);
                        setCompose(true);
                        setNotice("Editing saved draft.");
                      }}
                    >
                      Edit draft
                    </button>
                    <p className="notice">
                      Publishing lists this event in this pilot. Review venue,
                      time and description first.
                    </p>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await action(
                            "/api/events",
                            { id: current.id, action: "publish" },
                            "PATCH",
                          )
                        )
                          setNotice("Event published to pilot discovery.");
                      }}
                    >
                      Publish reviewed draft
                    </button>
                  </>
                )}
                {current.status === "published" && (
                  <button
                    className="secondary"
                    onClick={() => invitation(current)}
                  >
                    Prepare invitation
                  </button>
                )}
                {current.status !== "cancelled" && (
                  <details>
                    <summary>Cancel this event</summary>
                    <p>
                      This closes both RSVP flows and cancels existing
                      registrations.
                    </p>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await action(
                            "/api/events",
                            { id: current.id, action: "cancel" },
                            "PATCH",
                          )
                        )
                          setNotice(
                            "Event cancelled and registrations closed.",
                          );
                      }}
                    >
                      Confirm event cancellation
                    </button>
                  </details>
                )}
              </div>
            )}
            {share && (
              <div className="share-box">
                <label>
                  Invitation draft
                  <textarea
                    rows={6}
                    value={share}
                    onChange={(e) => setShare(e.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(share);
                      setNotice("Invitation copied. Nothing was sent.");
                    } catch {
                      setError(
                        "Copy unavailable. Select and copy the invitation text.",
                      );
                    }
                  }}
                >
                  Copy invitation
                </button>
                <p className="notice">
                  Template draft, not live AI. Review before sharing. A
                  localhost link only opens on this laptop.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 id="event-dialog-title">{loaded ? "Event unavailable" : "Loading event…"}</h2>
            <p>It may be private, cancelled, or no longer available.</p>
          </div>
        )}
        {compose && (
          <div className="owner-tools">
            <h3>Draft with local AI ✦</h3>
            <p className="notice">
              Uses the existing model on this laptop. Only the title, sport,
              venue and description go to it. No automatic publishing.
            </p>
            <button
              type="button"
              disabled={busy}
              className="secondary"
              onClick={assist}
            >
              {busy ? "Working…" : "Suggest event description"}
            </button>
            {aiDraft && (
              <div className="share-box">
                <label>
                  Review the AI suggestion
                  <textarea
                    rows={5}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => {
                    setForm({ ...form, description: aiDraft });
                    setAiDraft("");
                    setNotice(
                      "Suggestion applied. Check the event details before saving.",
                    );
                  }}
                >
                  Use reviewed suggestion
                </button>
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </dialog>
    </main>
  );
}
