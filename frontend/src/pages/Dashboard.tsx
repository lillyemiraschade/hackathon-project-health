import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const LANG_LABELS: Record<string, string> = {
  es: "Spanish", zh: "Mandarin", vi: "Vietnamese", ar: "Arabic", ht: "Haitian Creole",
};
const AVATAR_COLORS = ["#e8b4a2","#c5d4a0","#dcc8f0","#f0c96b","#b4d4e8","#f0b4c5","#c8e8b4"];
const STATUS_CLASS: Record<string, string> = {
  "On Track": "green", "Needs Attention": "amber", "Alert": "red", "Non-Responsive": "amber",
};

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.patientsEnriched(), api.timeline()])
      .then(([s, p, t]) => {
        setStats(s);
        setPatients(p.patients || []);
        setTimeline(t.events || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="main-area" style={{justifyContent:"center",alignItems:"center"}}><span style={{color:"#999"}}>Loading dashboard...</span></div>;

  const p = patients[selected];
  const langBreakdown = stats?.language_breakdown || {};
  const chartData = (stats?.recent_checkins_by_hour || []).slice(7, 17);
  const maxChart = Math.max(...chartData.map((d: any) => d.count), 1);

  const onTrackPct = stats?.total_patients ? Math.round((stats.patients_on_track / stats.total_patients) * 100) : 0;
  const attnPct = stats?.total_patients ? Math.round((stats.patients_needing_attention / stats.total_patients) * 100) : 0;
  const alertPct = stats?.total_patients ? Math.round((stats.patients_with_alerts / stats.total_patients) * 100) : 0;

  return (
    <div className="shell" style={{ flex: 1, height: "100%" }}>
      <main className="main-area">
        {/* Greeting */}
        <h1 className="greeting">Good morning, Dr. Reyes</h1>
        <p className="greeting-sub">
          You have <b>{stats?.total_patients || 0} LEP patients</b> with active care plans today.{" "}
          <b>{stats?.patients_with_alerts || 0} alerts</b> need your attention.
        </p>

        {/* Stat Cards Row 1 */}
        <div className="card-row">
          <div className="card" style={{ background: "#f0c4b3" }}>
            <div className="card-title">Patients:</div>
            <div className="stat-row">
              <div className="stat-block"><span className="stat-num">{stats?.total_patients || 0}</span><span className="stat-label">ACTIVE</span></div>
              <div className="stat-block"><span className="stat-num">{stats?.patients_on_track || 0}</span><span className="stat-label">ON TRACK</span></div>
              <div className="stat-block"><span className="stat-num">{stats?.patients_with_alerts || 0}</span><span className="stat-label">ALERTS</span></div>
            </div>
            <div className="mini-bar">
              <span style={{ width: `${onTrackPct}%`, background: "#4a7c59" }} />
              <span style={{ width: `${attnPct}%`, background: "#f0c96b" }} />
              <span style={{ width: `${alertPct}%`, background: "#e74c3c" }} />
            </div>
            <div className="legend">
              <span><span className="legend-dot" style={{ background: "#4a7c59" }} />On Track</span>
              <span><span className="legend-dot" style={{ background: "#f0c96b" }} />Needs Attn</span>
              <span><span className="legend-dot" style={{ background: "#e74c3c" }} />Alert</span>
            </div>
          </div>
          <div className="card card-wide" style={{ background: "#cdd6a8" }}>
            <div className="card-title">Check-in summary:</div>
            <div className="stat-row">
              <div className="stat-block"><span className="stat-num">{stats?.completed_checkins || 0}</span><span className="stat-label">COMPLETED</span></div>
              <div className="stat-block"><span className="stat-num">{stats?.total_checkins || 0}</span><span className="stat-label">TOTAL</span></div>
              <div className="stat-block"><span className="stat-num">{Math.round((stats?.avg_response_rate || 0) * 100)}%</span><span className="stat-label">RESPONSE RATE</span></div>
            </div>
            <div className="mini-chart">
              {chartData.map((d: any, i: number) => (
                <div className="mini-chart-col" key={i}>
                  <div className="mini-chart-bar" style={{ height: Math.max(4, (d.count / maxChart) * 55) }} />
                  {i % 2 === 0 && <span className="mini-chart-label">{(d.hour || 7 + i).toString().padStart(2, "0")}:00</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat Cards Row 2 */}
        <div className="card-row">
          <div className="card" style={{ background: "#f5efe6" }}>
            <div className="card-title">By language:</div>
            <div className="stat-row">
              {Object.entries(langBreakdown).map(([lang, count]) => (
                <div className="stat-block" key={lang}>
                  <span className="stat-num">{count as number}</span>
                  <span className="stat-label">{(LANG_LABELS[lang] || lang).toUpperCase()}</span>
                </div>
              ))}
              {Object.keys(langBreakdown).length === 0 && (
                <div className="stat-block"><span className="stat-num">0</span><span className="stat-label">NO DATA</span></div>
              )}
            </div>
          </div>
          <div className="card" style={{ background: "#f5efe6" }}>
            <div className="card-title">Check-in breakdown:</div>
            <div className="stat-row">
              <div className="stat-block"><span className="stat-num">{stats?.completed_checkins || 0}</span><span className="stat-label">COMPLETED</span></div>
              <div className="stat-block"><span className="stat-num">{stats?.missed_checkins || 0}</span><span className="stat-label">MISSED</span></div>
              <div className="stat-block"><span className="stat-num">{(stats?.total_checkins || 0) - (stats?.completed_checkins || 0) - (stats?.missed_checkins || 0)}</span><span className="stat-label">SCHEDULED</span></div>
            </div>
          </div>
        </div>

        {/* Patient List + Visit Details */}
        <div className="bottom-row">
          <div className="patient-list">
            <div className="patient-list-header">
              <span className="card-title">Patient's list</span>
              <Link to="/patients" className="pill">View all</Link>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {patients.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">&#128101;</div>
                  <p>No patients enrolled yet.</p>
                  <Link to="/enroll" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Enroll patient</Link>
                </div>
              ) : patients.map((pt, i) => (
                <button
                  key={pt.patient.id}
                  className={`patient-row ${i === selected ? "active" : ""}`}
                  onClick={() => setSelected(i)}
                >
                  <div className="pt-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {getInitials(`${pt.patient.first_name} ${pt.patient.last_name}`)}
                  </div>
                  <div className="pt-info">
                    <div className="pt-name">{pt.patient.first_name} {pt.patient.last_name}</div>
                    <div className="pt-type">{pt.status === "Alert" ? "Red Flag Alert" : pt.condition || "Follow-Up"}</div>
                  </div>
                  <span className="pt-time">{LANG_LABELS[pt.patient.language] || pt.patient.language}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visit details panel */}
          <div className="visit-details">
            {!p ? (
              <div className="empty-state">
                <div className="empty-icon">&#128203;</div>
                <p>Select a patient to view details</p>
              </div>
            ) : (
              <>
                <div className="visit-header">
                  <span className="card-title">Patient details</span>
                  <span className="mrn-badge">{p.patient.mrn ? `MRN-${p.patient.mrn}` : "No MRN"}</span>
                </div>
                <div className="visit-meta">
                  <b>{p.patient.first_name} {p.patient.last_name}</b> — {LANG_LABELS[p.patient.language] || p.patient.language}
                </div>
                <div className="visit-grid">
                  <div className="visit-tag">
                    <span className="visit-tag-label">Status</span>
                    <span className={`visit-tag-value ${STATUS_CLASS[p.status] || ""}`}>{p.status}</span>
                  </div>
                  <div className="visit-tag">
                    <span className="visit-tag-label">Adherence</span>
                    <span className="visit-tag-value">{p.adherence || "N/A"}</span>
                  </div>
                  <div className="visit-tag">
                    <span className="visit-tag-label">Last Check-In</span>
                    <span className="visit-tag-value">{p.last_checkin ? new Date(p.last_checkin).toLocaleDateString() : "None"}</span>
                  </div>
                  <div className="visit-tag">
                    <span className="visit-tag-label">Condition</span>
                    <span className="visit-tag-value">{p.condition || "—"}</span>
                  </div>
                </div>
                {p.rx && (
                  <div>
                    <div className="visit-section-label">Prescription</div>
                    <div className="visit-section-value">{p.rx}</div>
                  </div>
                )}
                {p.observation && (
                  <div>
                    <div className="visit-section-label">Observation</div>
                    <div className="visit-section-value">{p.observation}</div>
                  </div>
                )}
                {p.has_alert && (
                  <div className="red-flag-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Red Flag — Review and consider follow-up
                  </div>
                )}
                <Link to={`/patient/${p.patient.id}`} className="view-all-btn">View all details &rarr;</Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="right-bar">
        <Calendar />
        <button className="add-event-btn" onClick={() => window.location.href = "/enroll"}>+ Enroll patient</button>

        <div className="timeline-header">
          <span>Today</span>
          <span className="timeline-sublabel">Timeline</span>
          <Link to="/schedule" className="pill">All</Link>
        </div>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 12, color: "#999", padding: "8px 0" }}>No events scheduled today.</div>
        ) : timeline.slice(0, 6).map((ev, i) => {
          const t = new Date(ev.time);
          const timeStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div className="timeline-item" key={i}>
              <span className="timeline-time">{timeStr}</span>
              <div className="timeline-dot" style={{ background: ev.color }} />
              <div className="timeline-card" style={{ borderLeft: `3px solid ${ev.color}` }}>
                <div className="timeline-card-title">{ev.title}</div>
                <div className="timeline-card-sub">{ev.patient_name}</div>
              </div>
            </div>
          );
        })}
      </aside>
    </div>
  );
}

function Calendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ["MO","TU","WE","TH","FR","SA","SU"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="cal-header">
        <button className="cal-arrow">&larr;</button>
        <span>{monthName}</span>
        <button className="cal-arrow">&rarr;</button>
      </div>
      <div className="cal-grid">
        {days.map(d => <span className="cal-day-header" key={d}>{d}</span>)}
        {cells.map((d, i) => (
          <span key={i} className={`cal-day ${d === null ? "empty" : ""} ${d === today ? "today" : ""}`}>
            {d}
          </span>
        ))}
      </div>
    </>
  );
}
