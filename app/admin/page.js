"use client";
import { useCallback, useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { useAuth } from "../components/AuthProvider";
import Gate from "../components/Gate";

function Queue() {
  const { me } = useAuth();
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => api("/api/admin/queue").then(setQ).catch((e) => setErr(e.message)), []);
  useEffect(() => {
    if (me.isAdmin) load();
  }, [load, me.isAdmin]);

  if (!me.isAdmin) return <div className="empty">Only moderators can open the review queue. Add your email to ADMIN_EMAILS in .env.local.</div>;
  if (err) return <div className="alert">{err}</div>;
  if (!q) return <p className="muted">Loading…</p>;

  async function act(type, id, decision) {
    await api("/api/admin/action", { method: "POST", body: { type, id, decision } });
    load();
  }

  const Section = ({ title, items, render, emptyText }) => (
    <section className="panel">
      <h2>{title} <span className="small muted">({items.length})</span></h2>
      {items.length === 0 ? <p className="muted">{emptyText}</p> : <ul className="rows">{items.map(render)}</ul>}
    </section>
  );

  return (
    <div className="stack">
      <p className="muted">Nothing here is removed automatically for good. A person makes every final call.</p>
      <Section title="Thoughts waiting for review" items={q.thoughts} emptyText="All clear." render={(t) => (
        <li key={t.id} className="stack">
          <p style={{ margin: 0 }}>{t.text}</p>
          <div className="row">
            {t.flags.map((f) => <span key={f} className="badge warm">{f}</span>)}
            {t.reportCount > 0 && <span className="badge plain">{t.reportCount} reports</span>}
            <span className="small muted">{timeAgo(t.createdAt)}</span>
          </div>
          {t.support && <div className="notice warm small">The writer may be struggling. The app already showed them crisis resources. Consider approving if it's safe; removing a cry for help can feel like rejection.</div>}
          <div className="row">
            <button className="btn small" onClick={() => act("thought", t.id, "approve")}>Publish</button>
            <button className="btn danger small" onClick={() => act("thought", t.id, "remove")}>Remove</button>
          </div>
        </li>
      )} />
      <Section title="Replies waiting for review" items={q.replies} emptyText="All clear." render={(r) => (
        <li key={r.id} className="stack">
          <p style={{ margin: 0 }}>{r.text}</p>
          <div className="row">{r.flags.map((f) => <span key={f} className="badge warm">{f}</span>)}</div>
          <div className="row">
            <button className="btn small" onClick={() => act("reply", r.id, "approve")}>Publish</button>
            <button className="btn danger small" onClick={() => act("reply", r.id, "remove")}>Remove</button>
          </div>
        </li>
      )} />
      <Section title="Reports" items={q.reports} emptyText="No open reports." render={(r) => (
        <li key={r.id} className="stack">
          <div><span className="badge plain">{r.kind}</span> <b>{r.reason}</b> <span className="small muted">{timeAgo(r.createdAt)}</span></div>
          <p style={{ margin: 0 }} className="muted">“{r.excerpt}”</p>
          <div className="row">
            <button className="btn danger small" onClick={() => act("report", r.id, "remove")}>Remove content</button>
            <button className="btn ghost small" onClick={() => act("report", r.id, "dismiss")}>Dismiss</button>
          </div>
        </li>
      )} />
      <Section title="Host applications" items={q.organizers} emptyText="No pending applications." render={(o) => (
        <li key={o.id} className="stack">
          <div><b>{o.orgName}</b> <span className="small muted">({o.orgType}), account {o.displayName}</span></div>
          <p style={{ margin: 0 }}>{o.about}</p>
          {o.website && <a href={o.website} target="_blank" rel="noreferrer">{o.website}</a>}
          <div className="row">
            <button className="btn small" onClick={() => act("organizer", o.id, "approve")}>Verify host</button>
            <button className="btn ghost small" onClick={() => act("organizer", o.id, "reject")}>Decline</button>
          </div>
        </li>
      )} />
    </div>
  );
}

export default function Page() {
  return (
    <div className="page narrow">
      <h1>Review queue</h1>
      <Gate what="review content"><Queue /></Gate>
    </div>
  );
}
