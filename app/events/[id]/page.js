"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, formatWhen } from "@/lib/client";
import { useAuth } from "../../components/AuthProvider";
import { eventFacts } from "../../components/EventRow";
import Map from "../../components/Map";
import { directionsUrl } from "@/lib/maps-config";
import ReportButton from "../../components/ReportButton";

export default function EventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { me } = useAuth();
  const [e, setE] = useState(null);
  const [groups, setGroups] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [shareAccess, setShareAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState("");
  const [group, setGroup] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    api(`/api/events/${id}`).then((r) => { setE(r.event); setGroups(r.myGroups); }).catch((x) => setErr(x.message));
  }, [id, me?.id]);
  useEffect(() => {
    if (me?.prefs?.access?.notes) setAccessRequest(me.prefs.access.notes);
  }, [me]);

  async function call(path, body, done) {
    setErr("");
    setMsg("");
    try {
      const r = await api(path, { method: "POST", body });
      if (r.event) setE(r.event);
      if (done) setMsg(done);
    } catch (x) {
      setErr(x.message);
    }
  }

  if (!e) return <div className="page narrow">{err ? <div className="alert">{err}</div> : <p className="muted">Loading…</p>}</div>;
  const started = new Date(e.startsAt).getTime() - 3600 * 1000 < Date.now();
  const ended = new Date(e.endsAt).getTime() < Date.now();

  return (
    <div className="page">
      <p><Link href="/events">All events</Link></p>
      <div className="side">
        <div className="stack">
          <h1>{e.title}</h1>
          {e.status === "cancelled" && <div className="alert">This event was cancelled.</div>}
          <p style={{ fontSize: "1.1rem" }}>{formatWhen(e.startsAt, e.endsAt)}</p>
          <p className="muted">
            Hosted by {e.organizerName} ({e.orgType}) {e.verified && <span className="badge">Verified host</span>}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{e.description}</p>
          <div>{e.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>

          <section className="panel">
            <h2>Before you go</h2>
            <div className="facts" style={{ fontSize: "1rem", color: "var(--ink)" }}>{eventFacts(e).map((f) => <span key={f}>{f}</span>)}</div>
            {e.locationName && <p style={{ marginTop: 12 }}><b>Where:</b> {e.locationName}</p>}
            {e.transport?.notes && <p><b>Getting there:</b> {e.transport.notes}</p>}
            {e.accessibility?.notes && <p><b>Access:</b> {e.accessibility.notes}</p>}
            {e.capacity && <p><b>Spots:</b> {Math.max(0, e.capacity - e.attendeeCount)} of {e.capacity} left</p>}
            {e.lat != null && (
              <>
                <Map short label="Event location" items={[{ id: e.id, lat: e.lat, lng: e.lng, label: e.title, kind: "event" }]} />
                <a className="btn ghost small" style={{ marginTop: 10 }} href={directionsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer">Get directions in Google Maps</a>
              </>
            )}
          </section>

          {e.organizer && (
            <section className="panel">
              <h2>Host view</h2>
              <div className="grid2">
                <div><span className="stat">{e.organizer.attendees.length}</span>registered</div>
                <div><span className="stat">{e.organizer.checkedInCount}</span>checked in</div>
                <div><span className="stat">{e.organizer.averageRating ?? "–"}</span>average rating ({e.organizer.feedbackCount})</div>
              </div>
              {e.organizer.attendees.some((a) => a.accessRequest) && (
                <>
                  <h3 style={{ marginTop: 16 }}>Access requests</h3>
                  <ul className="rows">
                    {e.organizer.attendees.filter((a) => a.accessRequest).map((a) => <li key={a.displayName}><b>{a.displayName}:</b> {a.accessRequest}</li>)}
                  </ul>
                </>
              )}
              {e.organizer.comments.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Comments</h3>
                  <ul className="rows">{e.organizer.comments.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </>
              )}
              {e.status !== "cancelled" && (
                <button className="btn danger small" style={{ marginTop: 12 }} onClick={async () => {
                  if (!confirm("Cancel this event for everyone?")) return;
                  await api(`/api/events/${e.id}`, { method: "DELETE" });
                  router.push("/events");
                }}>Cancel event</button>
              )}
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="panel stack">
            {!me ? (
              <>
                <h2>Going?</h2>
                <p className="muted">Sign in to register. You'll register as your display name.</p>
                <Link className="btn" href="/login">Sign in</Link>
              </>
            ) : e.registration ? (
              <>
                <h2>You're registered</h2>
                {e.onlineLink && <p><b>Join link:</b> <a href={e.onlineLink} target="_blank" rel="noreferrer">{e.onlineLink}</a></p>}
                {e.registration.accessRequest && <p className="small">You shared with the host: “{e.registration.accessRequest}”</p>}
                {e.registration.checkedIn ? (
                  <span className="badge">Checked in</span>
                ) : (
                  (started || e.timing === "self-paced") && !ended && <button className="btn" onClick={() => call(`/api/events/${e.id}/checkin`, {}, "Checked in. Enjoy!")}>Check in</button>
                )}
                {!ended && <button className="btn ghost" onClick={() => call(`/api/events/${e.id}/rsvp`, { going: false }, "Registration cancelled.")}>Cancel my registration</button>}
              </>
            ) : e.status === "published" && !ended ? (
              <>
                <h2>Register</h2>
                <label className="check">
                  <input type="checkbox" checked={shareAccess} onChange={(x) => setShareAccess(x.target.checked)} /> Share an access need with the host
                  <span className="hint">Only the host sees this, and only if you check this box.</span>
                </label>
                {shareAccess && <input type="text" aria-label="Access need" value={accessRequest} onChange={(x) => setAccessRequest(x.target.value)} maxLength={300} placeholder="Step-free seating, interpreter, quiet space…" />}
                <button className="btn" onClick={() => call(`/api/events/${e.id}/rsvp`, { going: true, shareAccess, accessRequest }, "You're registered.")}>Register</button>
                <p className="small muted">{e.attendeeCount} registered so far.</p>
              </>
            ) : null}
            {msg && <div className="notice" role="status">{msg}</div>}
            {err && <div className="alert" role="alert">{err}</div>}
          </section>

          {me && e.registration && ended && (
            <section className="panel stack">
              <h2>How was it?</h2>
              {e.myFeedback ? (
                <p>Thanks for your feedback. <Link href="/connections">Keep in touch with people you met</Link>, or <Link href="/profile">update your preferences</Link>.</p>
              ) : (
                <>
                  <div className="row" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} role="radio" aria-checked={rating === n} className={`btn small ${rating === n ? "on" : "ghost"}`} onClick={() => setRating(n)}>{n}</button>
                    ))}
                  </div>
                  <textarea aria-label="Comment for the host" value={comment} onChange={(x) => setComment(x.target.value)} maxLength={500} placeholder="Optional note for the host" />
                  <button className="btn" disabled={!rating} onClick={() => call(`/api/events/${e.id}/feedback`, { rating, comment }, "Feedback sent.")}>Send feedback</button>
                </>
              )}
            </section>
          )}

          {me && groups.length > 0 && e.status === "published" && (
            <section className="panel stack">
              <h2>Suggest to a group</h2>
              <select aria-label="Group" value={group} onChange={(x) => setGroup(x.target.value)}>
                <option value="">Choose a group</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button className="btn ghost" disabled={!group} onClick={() => call(`/api/groups/${group}/events`, { eventId: e.id }, "Suggested. Each member decides for themselves.")}>Suggest event</button>
            </section>
          )}
          {me && !e.isOrganizer && <ReportButton kind="event" id={e.id} label="Report this event" />}
        </aside>
      </div>
    </div>
  );
}
