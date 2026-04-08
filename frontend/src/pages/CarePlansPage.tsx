import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import CarePlanPreview from "../components/CarePlanPreview";

const LANG: Record<string, string> = { es: "Spanish", zh: "Mandarin", vi: "Vietnamese", ar: "Arabic", ht: "Haitian Creole" };

export default function CarePlansPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.patientsEnriched().then(d => setPatients(d.patients || [])).finally(() => setLoading(false));
  }, []);

  const withPlans = patients.filter(p => p.care_plan);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Care Plans</h1>
        <span style={{ fontSize: 13, color: "#888" }}>{withPlans.length} active plans</span>
      </div>

      {loading ? <div style={{ color: "#999" }}>Loading...</div> : withPlans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128203;</div>
          <p>No active care plans. Enroll a patient and upload visit notes to create one.</p>
          <Link to="/enroll" className="btn btn-primary" style={{ marginTop: 12 }}>Enroll patient</Link>
        </div>
      ) : withPlans.map(p => (
        <div key={p.patient.id} style={{ marginBottom: 16 }}>
          <div
            className="table-wrap"
            style={{ padding: "14px 18px", cursor: "pointer" }}
            onClick={() => setExpanded(expanded === p.patient.id ? null : p.patient.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600 }}>{p.patient.first_name} {p.patient.last_name}</span>
                <span className="badge badge-blue" style={{ marginLeft: 8 }}>{LANG[p.patient.language] || p.patient.language}</span>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 12 }}>
                  {p.care_plan?.parsed_plan?.medications?.length || 0} medications,{" "}
                  {p.care_plan?.parsed_plan?.red_flags?.length || 0} red flags
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#999" }}>
                  Created {p.care_plan?.created_at ? new Date(p.care_plan.created_at).toLocaleDateString() : "—"}
                </span>
                <Link to={`/patient/${p.patient.id}`} className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>View patient</Link>
                <span style={{ fontSize: 16 }}>{expanded === p.patient.id ? "▼" : "▶"}</span>
              </div>
            </div>
          </div>
          {expanded === p.patient.id && p.care_plan && (
            <div style={{ marginTop: 8 }}>
              <CarePlanPreview
                parsed={p.care_plan.parsed_plan}
                translated={p.care_plan.translated_plan}
                language={p.patient.language}
                patientName={`${p.patient.first_name} ${p.patient.last_name}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
