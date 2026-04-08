import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function AlertsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => { api.alerts().then(setData).finally(() => setLoading(false)); };
  useEffect(load, []);

  const alerts = data?.alerts || [];

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Red Flag Alerts</h1>
        <span style={{ fontSize: 13, color: "#888" }}>{alerts.length} unreviewed</span>
      </div>

      {loading ? <div style={{ color: "#999" }}>Loading...</div> : alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#9989;</div>
          <p>No unreviewed alerts. All clear.</p>
        </div>
      ) : alerts.map((a: any) => (
        <div key={a.check_in.id} className="alert-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>&#128680;</span>
                <strong>{a.patient_name}</strong>
                <span className="badge badge-gray">MRN {a.mrn || "N/A"}</span>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#555", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
                {a.check_in.provider_summary || "No summary available"}
              </pre>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0, marginLeft: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={async () => { await api.reviewCheckIn(a.check_in.id); load(); }}>
                Mark reviewed
              </button>
              <Link to={`/patient/${a.check_in.patient_id}`} className="btn btn-ghost btn-sm">View patient</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
