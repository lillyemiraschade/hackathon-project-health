import { useEffect, useState } from "react";
import { api } from "../api";

const LANGS = [
  { code: "es", name: "Spanish", region: "Latin America", status: "Active", dialects: "Mexican, Caribbean, Central American" },
  { code: "zh", name: "Mandarin", region: "China", status: "Active", dialects: "Simplified, Traditional" },
  { code: "vi", name: "Vietnamese", region: "Vietnam", status: "Active", dialects: "Standard" },
  { code: "ar", name: "Arabic", region: "Middle East / N. Africa", status: "Active", dialects: "Levantine, Egyptian, MSA" },
  { code: "ht", name: "Haitian Creole", region: "Haiti", status: "Active", dialects: "Standard" },
];

export default function LanguagesPage() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.stats().then(setStats); }, []);

  const langCounts = stats?.language_breakdown || {};

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Languages</h1>
        <span style={{ fontSize: 13, color: "#888" }}>V1 language set — 5 languages</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Language</th><th>Code</th><th>Region</th><th>Dialects</th><th>Patients</th><th>Status</th></tr>
          </thead>
          <tbody>
            {LANGS.map(l => (
              <tr key={l.code}>
                <td style={{ fontWeight: 600 }}>{l.name}</td>
                <td style={{ fontFamily: "monospace" }}>{l.code}</td>
                <td>{l.region}</td>
                <td style={{ fontSize: 12 }}>{l.dialects}</td>
                <td><span className="badge badge-blue">{langCounts[l.code] || 0}</span></td>
                <td><span className="badge badge-green">{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Translation quality</div>
        <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          Every AI translation is logged with source text, target text, model version, and timestamp.
          10% of translated care plans are sampled for review by a licensed medical interpreter.
          Reviewer corrections feed into a prompt-level evaluation set for regression testing.
        </p>
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <div><span style={{ fontSize: 20, fontWeight: 700 }}>10%</span><br /><span style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>QA Sample Rate</span></div>
          <div><span style={{ fontSize: 20, fontWeight: 700 }}>6th</span><br /><span style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Grade reading level</span></div>
          <div><span style={{ fontSize: 20, fontWeight: 700 }}>AI</span><br /><span style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Labeled on all output</span></div>
        </div>
      </div>
    </div>
  );
}
