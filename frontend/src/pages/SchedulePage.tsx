import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const TYPE_COLORS: Record<string, string> = {
  medication: "#3B82F6", symptom: "#F59E0B", follow_up: "#10B981",
};

export default function SchedulePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Promise.all([api.timeline(), api.patientsEnriched()])
      .then(([t, p]) => { setEvents(t.events || []); setPatients(p.patients || []); })
      .finally(() => setLoading(false));
  }, []);

  // Also show upcoming scheduled check-ins from all patients
  const allCheckins: any[] = [];
  patients.forEach(p => {
    (p.recent_check_ins || []).forEach((ci: any) => {
      allCheckins.push({ ...ci, patient_name: `${p.patient.first_name} ${p.patient.last_name}` });
    });
  });

  const scheduled = allCheckins
    .filter(c => filter === "all" || c.check_in_type === filter)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Schedule</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "medication", "symptom", "follow_up"].map(f => (
          <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f.replace("_", " ").replace(/^./, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: "#999" }}>Loading...</div> : (
        <>
          {/* Today's events */}
          {events.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Today's events</div>
              {events.map((ev, i) => {
                const t = new Date(ev.time);
                return (
                  <div className="timeline-item" key={i} style={{ marginBottom: 10 }}>
                    <span className="timeline-time">{t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <div className="timeline-dot" style={{ background: ev.color }} />
                    <div className="timeline-card" style={{ borderLeft: `3px solid ${ev.color}` }}>
                      <div className="timeline-card-title">{ev.title}</div>
                      <div className="timeline-card-sub">{ev.patient_name} — {ev.subtitle}</div>
                      <span className={`badge ${ev.status === "completed" ? "badge-green" : ev.status === "escalated" ? "badge-red" : "badge-gray"}`} style={{ marginTop: 4 }}>
                        {ev.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full check-in table */}
          <div className="card-title" style={{ marginBottom: 10 }}>All scheduled check-ins</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Patient</th><th>Type</th><th>Scheduled</th><th>Goal</th><th>Status</th></tr>
              </thead>
              <tbody>
                {scheduled.map((ci, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{ci.patient_name}</td>
                    <td>
                      <span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: TYPE_COLORS[ci.check_in_type] || "#999", marginRight: 6
                      }} />
                      {ci.check_in_type}
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(ci.scheduled_at).toLocaleString()}</td>
                    <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ci.goal || "—"}</td>
                    <td>
                      <span className={`badge ${ci.status === "completed" ? "badge-green" : ci.status === "escalated" ? "badge-red" : ci.status === "in_progress" ? "badge-blue" : "badge-gray"}`}>
                        {ci.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {scheduled.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#999", padding: 32 }}>No check-ins found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
