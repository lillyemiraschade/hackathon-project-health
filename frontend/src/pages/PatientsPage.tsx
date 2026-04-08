import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";

const LANG: Record<string, string> = { es: "Spanish", zh: "Mandarin", vi: "Vietnamese", ar: "Arabic", ht: "Haitian Creole" };
const STATUS_BADGE: Record<string, string> = {
  "On Track": "badge-green", "Needs Attention": "badge-amber", "Alert": "badge-red", "Non-Responsive": "badge-amber",
};

export default function PatientsPage() {
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Sync from URL query param when it changes
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    api.patientsEnriched().then(d => setPatients(d.patients || [])).finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p => {
    if (filter === "alerts" && p.status !== "Alert") return false;
    if (filter === "attention" && p.status !== "Needs Attention" && p.status !== "Non-Responsive") return false;
    if (filter === "ontrack" && p.status !== "On Track") return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        p.patient.first_name, p.patient.last_name, p.patient.mrn,
        p.patient.provider_name, p.condition, p.rx,
        LANG[p.patient.language] || p.patient.language,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Patients</h1>
        <Link to="/enroll" className="btn btn-primary">+ Enroll patient</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div className="search-wrap" style={{ maxWidth: 280 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, opacity: 0.4, marginRight: 8 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["all", "ontrack", "attention", "alerts"].map(f => (
          <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "ontrack" ? "On Track" : f === "attention" ? "Needs Attn" : "Alerts"}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: "#999" }}>Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>MRN</th>
                <th>Language</th>
                <th>Status</th>
                <th>Adherence</th>
                <th>Last check-in</th>
                <th>Condition</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.patient.id} onClick={() => window.location.href = `/patient/${p.patient.id}`}>
                  <td style={{ fontWeight: 600 }}>{p.patient.first_name} {p.patient.last_name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.patient.mrn || "—"}</td>
                  <td><span className="badge badge-blue">{LANG[p.patient.language] || p.patient.language}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[p.status] || "badge-gray"}`}>{p.status}</span></td>
                  <td>{p.adherence || "—"}</td>
                  <td style={{ fontSize: 12, color: "#888" }}>{p.last_checkin ? new Date(p.last_checkin).toLocaleDateString() : "—"}</td>
                  <td style={{ fontSize: 12 }}>{p.condition || "—"}</td>
                  <td><Link to={`/patient/${p.patient.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#999", padding: 32 }}>No patients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
