"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Role, Module } from "@prisma/client";
import { allowedModules, canWriteModule, moduleInfo } from "@/lib/modules";

type User = { id: string; campusId: string; name: string; email: string; role: Role };
type RecordRow = { id: string; title: string; description: string; status: string; amount: string | null; dueDate: string | null; fields: Record<string, string>; createdAt: string };
type DashboardData = { campus: string; count: number; students: number; due: number | null; openTickets: number; recent: Array<RecordRow & { module: Module }> };
type ReportsData = { total: number; modules: Array<{ module: Module; count: number; statuses: Array<{ status: string; count: number }> }> };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fieldsByModule: Partial<Record<Module, Array<{ key: string; label: string; type?: string }>>> = {
  STUDENTS: [{ key: "program", label: "Program" }, { key: "year", label: "Year" }, { key: "email", label: "Email" }],
  ACADEMICS: [{ key: "faculty", label: "Faculty" }, { key: "room", label: "Room" }],
  ATTENDANCE: [{ key: "date", label: "Date", type: "date" }, { key: "attendance", label: "Attendance" }, { key: "faculty", label: "Faculty" }],
  TIMETABLE: [{ key: "class", label: "Class" }, { key: "faculty", label: "Faculty" }, { key: "room", label: "Room" }],
  FEES: [{ key: "student", label: "Student" }, { key: "term", label: "Term" }, { key: "due", label: "Due date", type: "date" }],
  HOSTEL: [{ key: "building", label: "Building" }, { key: "room", label: "Room" }],
  TRANSPORT: [{ key: "stops", label: "Stops" }, { key: "capacity", label: "Capacity" }],
  CERTIFICATES: [{ key: "type", label: "Certificate type" }, { key: "requestedBy", label: "Requested by" }],
  HELPDESK: [{ key: "priority", label: "Priority" }, { key: "assignee", label: "Assignee" }],
  NOTIFICATIONS: [{ key: "audience", label: "Audience" }, { key: "date", label: "Publish date", type: "date" }],
};

export default function Workspace({ user }: { user: User }) {
  const modules = allowedModules[user.role];
  const [selected, setSelected] = useState<Module | "OVERVIEW">("OVERVIEW");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (selected === "OVERVIEW") {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load dashboard");
        setDashboard(data);
      } else if (selected === "REPORTS") {
        const res = await fetch("/api/reports", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load reports");
        setReports(data);
      } else {
        const res = await fetch(`/api/records/${selected}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load records");
        setRecords(data.records);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load data"); }
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); }, [notice]);

  async function signOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      window.location.assign("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out. Please try again.");
    }
  }
  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === "OVERVIEW") return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries((fieldsByModule[selected] || []).map(field => [field.key, String(form.get(field.key) || "")]));
    const payload = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      status: String(form.get("status") || "Open"),
      amount: form.get("amount") ? Number(form.get("amount")) : null,
      fields,
      dueDate: form.get("due") ? new Date(`${String(form.get("due"))}T00:00:00.000Z`).toISOString() : null,
    };
    try {
      const response = await fetch(`/api/records/${selected}${editing ? `?id=${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save");
      setShowForm(false); setEditing(null); setNotice(editing ? "Record updated" : "Record created");
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save"); }
    finally { setSaving(false); }
  }
  async function deleteRecord(record: RecordRow) {
    if (!window.confirm(`Delete “${record.title}”? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/records/${selected}?id=${record.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete");
      setNotice("Record deleted");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete");
    }
  }
  async function askAssistant(event: React.FormEvent) {
    event.preventDefault(); setAsking(true); setAnswer("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: ask }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant is unavailable");
      setAnswer(data.answer);
    } catch (err) { setAnswer(err instanceof Error ? err.message : "Assistant is unavailable"); }
    finally { setAsking(false); }
  }
  const visibleRecords = useMemo(() => records.filter(record => `${record.title} ${record.description} ${record.status}`.toLowerCase().includes(search.toLowerCase())), [records, search]);
  const label = selected === "OVERVIEW" ? "Overview" : moduleInfo[selected].label;

  return <div className="app-shell">
    <aside className="sidebar">
      <a href="/workspace" className="brand"><span className="brand-mark">C</span> CampusIQ</a>
      <div className="campus-switch"><span className="campus-dot" /><div><b>{dashboard?.campus || "Northstar University"}</b><small>Campus workspace</small></div><span className="chevron">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav">
        <button className={`nav-item ${selected === "OVERVIEW" ? "active" : ""}`} onClick={() => { setSelected("OVERVIEW"); setSearch(""); }}><span>◫</span> Overview</button>
        {modules.map(module => <button key={module} className={`nav-item ${selected === module ? "active" : ""}`} onClick={() => { setSelected(module); setSearch(""); }}><span>{moduleInfo[module].icon}</span>{moduleInfo[module].label}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✦</span><b>Need a hand?</b><p>Our campus support team is here for you.</p><button onClick={() => setSelected("HELPDESK")} disabled={!modules.includes("HELPDESK")}>Visit helpdesk <span>→</span></button></div>
        <div className="user-profile"><span className="avatar">{user.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div className="user-meta"><b>{user.name}</b><small>{user.role.replaceAll("_", " ").toLowerCase()}</small></div><button className="icon-button" title="Sign out" onClick={signOut}>↗</button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Campus <span>/</span> <b>{label}</b></div><div className="top-actions"><span className="live-label"><i /> All systems normal</span><button className="icon-button notification-button" title="Notifications" onClick={() => setSelected(modules.includes("NOTIFICATIONS") ? "NOTIFICATIONS" : "OVERVIEW")}>♧</button><span className="avatar small-avatar">{user.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span></div></header>
      <div className="content">
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        {notice && <div className="success-banner" role="status">{notice}</div>}
        {selected === "OVERVIEW" ? <Overview user={user} dashboard={dashboard} modules={modules} loading={loading} setSelected={setSelected} ask={ask} setAsk={setAsk} answer={answer} asking={asking} askAssistant={askAssistant} /> :
          selected === "REPORTS" ? <ReportsView reports={reports} loading={loading} /> :
          <section className="module-section">
            <div className="page-heading"><div><p className="eyebrow">CAMPUS OPERATIONS</p><h1>{label}</h1><p className="muted">{moduleInfo[selected].description}</p></div>
              {canCreate(user.role, selected) && <button className="button primary" onClick={() => { setEditing(null); setShowForm(true); }}>＋ Add record</button>}</div>
            <div className="table-toolbar"><div className="search-box"><span>⌕</span><input placeholder={`Search ${label.toLowerCase()}…`} value={search} onChange={event => setSearch(event.target.value)} /></div><button className="button secondary" onClick={() => void loadData()}>↻ Refresh</button><span className="record-count">{records.length} records</span></div>
            <div className="record-list">
              {loading ? <div className="loading-card"><span className="spinner" /> Loading {label.toLowerCase()}…</div> : visibleRecords.length ? <div className="table-wrap"><table><thead><tr><th>RECORD</th><th>DETAILS</th><th>STATUS</th>{selected === "FEES" && <th>AMOUNT</th>}<th>UPDATED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visibleRecords.map(record => <tr key={record.id}><td><b>{record.title}</b>{record.dueDate && <small>Due {new Date(record.dueDate).toLocaleDateString()}</small>}</td><td>{record.description}<small>{Object.entries(record.fields || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" · ")}</small></td><td><span className={`status ${statusClass(record.status)}`}>{record.status}</span></td>{selected === "FEES" && <td>{record.amount ? currency.format(Number(record.amount)) : "—"}</td>}<td>{new Date(record.createdAt).toLocaleDateString()}</td><td><div className="row-actions">{canCreate(user.role, selected) && <button onClick={() => { setEditing(record); setShowForm(true); }} aria-label={`Edit ${record.title}`}>Edit</button>}{canCreate(user.role, selected) && <button onClick={() => void deleteRecord(record)} aria-label={`Delete ${record.title}`}>Delete</button>}</div></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon">{moduleInfo[selected].icon}</div><h3>{search ? "No matching records" : "Nothing here yet"}</h3><p>{search ? "Try another search term." : "Add a record to get this workflow started."}</p>{!search && canCreate(user.role, selected) && <button className="button primary" onClick={() => setShowForm(true)}>＋ Add first record</button>}</div>}
            </div>
            {showForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="record-form-title"><div className="modal-heading"><div><p className="eyebrow">{label.toUpperCase()}</p><h2 id="record-form-title">{editing ? "Edit record" : "Add record"}</h2></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={saveRecord} className="record-form">
              <label>Title<input name="title" required minLength={2} maxLength={140} defaultValue={editing?.title} placeholder="Give this record a name" /></label>
              <label>Description<textarea name="description" maxLength={1000} defaultValue={editing?.description} rows={3} placeholder="Add helpful context" /></label>
              <div className="form-grid">{(fieldsByModule[selected] || []).map(field => <label key={field.key}>{field.label}<input name={field.key} type={field.type || "text"} defaultValue={editing?.fields?.[field.key]} /></label>)}</div>
              {selected === "FEES" && <label>Amount (₹)<input name="amount" type="number" min="0" step="0.01" defaultValue={editing?.amount || ""} /></label>}
              <label>Status<select name="status" defaultValue={editing?.status || statusOptions(selected)[0]}>{statusOptions(selected).map(status => <option key={status}>{status}</option>)}</select></label>
              <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create record"}</button></div>
            </form></section></div>}
          </section>}
        <footer>CampusIQ <span>·</span> A better-connected campus <span className="footer-right">Secure workspace · {user.email}</span></footer>
      </div>
    </main>
  </div>;
}

function canCreate(role: Role, module: Module) {
  return canWriteModule(role, module);
}

function statusClass(status: string) {
  const lower = status.toLowerCase();
  if (["active", "enrolled", "paid", "published", "recorded", "allocated", "on route", "resolved"].includes(lower)) return "status-green";
  if (["due", "open", "pending review", "application review", "in progress"].includes(lower)) return "status-amber";
  return "status-blue";
}

function statusOptions(module: Module) {
  if (module === "FEES") return ["Due", "Paid", "Overdue", "Waived"];
  if (module === "HELPDESK") return ["Open", "In progress", "Resolved", "Closed"];
  if (module === "STUDENTS") return ["Application review", "Enrolled", "Waitlisted", "Graduated"];
  if (module === "CERTIFICATES") return ["Pending review", "In progress", "Issued", "Rejected"];
  if (module === "ATTENDANCE") return ["Recorded", "Draft", "Requires review"];
  if (module === "NOTIFICATIONS") return ["Draft", "Published", "Archived"];
  if (module === "HOSTEL") return ["Requested", "Allocated", "Maintenance"];
  if (module === "TRANSPORT") return ["On route", "Scheduled", "Delayed", "Cancelled"];
  return ["Active", "Scheduled", "Completed"];
}

function ReportsView({ reports, loading }: { reports: ReportsData | null; loading: boolean }) {
  const max = Math.max(1, ...(reports?.modules.map(item => item.count) || []));
  return <section className="module-section">
    <div className="page-heading"><div><p className="eyebrow">CAMPUS OPERATIONS</p><h1>Reports & analytics</h1><p className="muted">Live summary of the workflows available to your role.</p></div></div>
    {loading ? <div className="record-list"><div className="loading-card"><span className="spinner" /> Building your report…</div></div> : !reports?.modules.length ? <div className="record-list"><div className="empty-state"><div className="empty-icon">▥</div><h3>No report data yet</h3><p>Records appear in reports as your campus workflows are used.</p></div></div> :
      <div className="reports-layout"><section className="panel report-panel"><div className="panel-heading"><div><h2>Records by workflow</h2><p>{reports.total} visible records in this workspace</p></div></div><div className="report-bars">{reports.modules.map(item => <div className="report-bar-row" key={item.module}><div><b>{moduleInfo[item.module].label}</b><span>{item.count}</span></div><div className="bar-track"><i style={{ width: `${Math.max(item.count ? 5 : 0, item.count / max * 100)}%` }} /></div></div>)}</div></section>
        <section className="panel report-panel"><div className="panel-heading"><div><h2>Workflow status</h2><p>Status counts across accessible records</p></div></div><div className="report-status-list">{reports.modules.map(item => <div key={item.module} className="report-status-group"><b>{moduleInfo[item.module].label}</b><div>{item.statuses.length ? item.statuses.map(status => <span key={status.status} className={`status ${statusClass(status.status)}`}>{status.status} <strong>{status.count}</strong></span>) : <small>No status activity</small>}</div></div>)}</div></section>
      </div>}
  </section>;
}

function Overview({ user, dashboard, modules, loading, setSelected, ask, setAsk, answer, asking, askAssistant }: {
  user: User; dashboard: DashboardData | null; modules: Module[]; loading: boolean;
  setSelected: (module: Module | "OVERVIEW") => void; ask: string; setAsk: (value: string) => void;
  answer: string; asking: boolean; askAssistant: (event: React.FormEvent) => void;
}) {
  const cards = [
    { label: "STUDENTS", value: dashboard?.students ?? "—", note: "Enrolled & in review", icon: "◉", color: "blue" },
    { label: "OUTSTANDING FEES", value: dashboard?.due == null ? "—" : currency.format(dashboard.due), note: "Across active invoices", icon: "₹", color: "gold" },
    { label: "OPEN REQUESTS", value: dashboard?.openTickets ?? "—", note: "Helpdesk tickets", icon: "⌁", color: "purple" },
    { label: "CAMPUS RECORDS", value: dashboard?.count ?? "—", note: "Across your workspace", icon: "▤", color: "green" },
  ];
  return <section>
    <div className="welcome-row"><div><p className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase()} <span className="date-spark">✦</span></p><h1>Good afternoon, {user.name.split(" ")[0]}</h1><p className="muted">Here’s what’s happening at {dashboard?.campus || "your campus"} today.</p></div><button className="button secondary" onClick={() => setSelected("NOTIFICATIONS")} disabled={!modules.includes("NOTIFICATIONS")}>◌ View announcements</button></div>
    <div className="metric-grid">{cards.map(card => <article className="metric-card" key={card.label}><div className="metric-top"><span>{card.label}</span><i className={`metric-icon ${card.color}`}>{card.icon}</i></div><strong>{loading ? "···" : card.value}</strong><small>{card.note}</small><div className={`sparkline ${card.color}`}><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></article>)}</div>
    <div className="overview-grid">
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Campus activity</h2><p>Latest updates from across your campus</p></div><button className="text-button" onClick={() => setSelected(modules[0] || "OVERVIEW")}>Explore workspace →</button></div>
        {loading ? <div className="loading-card"><span className="spinner" /> Loading activity…</div> : dashboard?.recent.length ? <div className="activity-list">{dashboard.recent.map((record, i) => <button className="activity-item" key={record.id} onClick={() => { if (modules.includes(record.module)) setSelected(record.module); }}><span className={`activity-icon activity-${i % 4}`}>{["◉", "✓", "₹", "▤"][i % 4]}</span><span className="activity-copy"><b>{record.title}</b><small>{record.description || "Campus record"} <span>·</span> {new Date(record.createdAt).toLocaleDateString()}</small></span><span className={`status ${statusClass(record.status)}`}>{record.status}</span></button>)}</div> : <div className="empty-inline">No campus activity yet. Create a record from any workspace.</div>}
      </section>
      <section className="panel assistant-panel"><div className="assistant-heading"><span className="assistant-star">✦</span><div><h2>CampusIQ assistant</h2><p>Ask a question or get an idea started.</p></div><span className="beta">BETA</span></div><div className="assistant-suggestions"><span>Try asking</span><button onClick={() => setAsk("Suggest three ways to improve campus attendance.")}>How can we improve attendance?</button><button onClick={() => setAsk("What should a campus operations dashboard track each week?")}>What should we focus on?</button></div><form className="assistant-form" onSubmit={askAssistant}><input aria-label="Ask CampusIQ" minLength={3} maxLength={1000} required value={ask} onChange={event => setAsk(event.target.value)} placeholder="Ask anything about campus operations…" /><button disabled={asking || ask.trim().length < 3} aria-label="Send question">{asking ? "…" : "↑"}</button></form>{answer && <div className="assistant-answer" role="status">{answer}</div>}<p className="ai-note">AI responses may be inaccurate. No campus data is shared with the assistant.</p></section>
    </div>
    <div className="panel quick-panel"><div className="panel-heading"><div><h2>Your workspace</h2><p>Jump into the campus workflows available to you.</p></div></div><div className="quick-grid">{modules.slice(0, 6).map(module => <button className="quick-link" key={module} onClick={() => setSelected(module)}><span>{moduleInfo[module].icon}</span><div><b>{moduleInfo[module].label}</b><small>{moduleInfo[module].description}</small></div><i>→</i></button>)}</div></div>
  </section>;
}
