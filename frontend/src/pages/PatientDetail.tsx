import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import CarePlanPreview from "../components/CarePlanPreview";

const LANG: Record<string, string> = { es: "Spanish", zh: "Mandarin", vi: "Vietnamese", ar: "Arabic", ht: "Haitian Creole" };
const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-gray", in_progress: "badge-blue", completed: "badge-green", missed: "badge-amber", escalated: "badge-red",
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plan" | "checkins" | "info">("plan");
  const [sending, setSending] = useState<number | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseResult, setResponseResult] = useState<any>(null);

  const load = () => { api.patientTimeline(Number(patientId)).then(setData).finally(() => setLoading(false)); };
  useEffect(load, [patientId]);

  if (loading) return <div className="page-content" style={{ color: "#999" }}>Loading...</div>;
  if (!data) return <div className="page-content">Patient not found</div>;

  const { patient, care_plan, check_ins } = data;
  const name = `${patient.first_name} ${patient.last_name}`;
  const alerts = check_ins?.filter((c: any) => c.severity === "red_flag" && !c.provider_reviewed) || [];

  const sendCheckIn = async (id: number) => {
    setSending(id);
    try { await api.sendCheckIn(id); load(); } finally { setSending(null); }
  };
  const submitResponse = async (id: number) => {
    if (!responseText.trim()) return;
    try {
      const r = await api.respondToCheckIn(id, { check_in_id: id, message: responseText });
      setResponseResult(r); setResponseText(""); load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ marginBottom: 0 }}>{name}</h1>
            <span className="badge badge-blue">{LANG[patient.language] || patient.language}</span>
            {patient.dialect && <span className="badge badge-gray">{patient.dialect}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            MRN {patient.mrn || "N/A"} &middot; {patient.provider_name || "No provider"} &middot; {patient.phone}
          </div>
        </div>
        <Link to={`/patient/${patient.id}/upload`} className="btn btn-primary">Upload care plan</Link>
      </div>

      {alerts.length > 0 && (
        <div className="red-flag-banner" style={{ marginBottom: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {alerts.length} unreviewed alert{alerts.length > 1 ? "s" : ""} for this patient
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e0dbd2", marginBottom: 16 }}>
        {(["plan", "checkins", "info"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: tab === t ? 600 : 500,
              color: tab === t ? "#4a7c59" : "#888", cursor: "pointer",
              borderBottom: `2px solid ${tab === t ? "#4a7c59" : "transparent"}`,
              marginBottom: -1, background: "none", border: "none", borderBottomStyle: "solid",
              borderBottomWidth: 2, fontFamily: "inherit",
            }}
          >
            {t === "plan" ? "Care Plan" : t === "checkins" ? `Check-ins (${check_ins?.length || 0})` : "Patient Info"}
          </button>
        ))}
      </div>

      {/* Care Plan tab */}
      {tab === "plan" && (
        care_plan ? (
          <>
            <div className="table-wrap" style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">Active care plan</div>
                <span style={{ fontSize: 11, color: "#999" }}>Created {new Date(care_plan.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.medications?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Medications</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.red_flags?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Red flags</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.follow_up_actions?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Follow-ups</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.lifestyle_changes?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Lifestyle</div></div>
              </div>
            </div>
            <CarePlanPreview parsed={care_plan.parsed_plan} translated={care_plan.translated_plan} language={patient.language} patientName={name} />
            <div className="table-wrap" style={{ padding: 16, marginTop: 14 }}>
              <details>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View raw parsed plan (English)</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: "#faf6f0", padding: 12, borderRadius: 8, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
                  {JSON.stringify(care_plan.parsed_plan, null, 2)}
                </pre>
              </details>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">&#128203;</div>
            <p>No active care plan. Upload visit notes to generate visual instruction cards.</p>
            <Link to={`/patient/${patient.id}/upload`} className="btn btn-primary" style={{ marginTop: 12 }}>Upload care plan</Link>
          </div>
        )
      )}

      {/* Check-ins tab */}
      {tab === "checkins" && (
        (!check_ins || check_ins.length === 0) ? (
          <div className="empty-state"><div className="empty-icon">&#128222;</div><p>No check-ins scheduled. Upload a care plan first.</p></div>
        ) : check_ins.map((ci: any) => (
          <div key={ci.id} className="table-wrap" style={{
            padding: 14, marginBottom: 10,
            borderLeft: `3px solid ${ci.severity === "red_flag" ? "#e74c3c" : ci.status === "completed" ? "#4a7c59" : ci.status === "in_progress" ? "#3B82F6" : "#e0dbd2"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${STATUS_BADGE[ci.status] || "badge-gray"}`}>{ci.status}</span>
                <span className="badge badge-blue">{ci.check_in_type}</span>
                <span style={{ fontSize: 11, color: "#999" }}>{new Date(ci.scheduled_at).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {ci.status === "scheduled" && (
                  <button className="btn btn-primary btn-sm" onClick={() => sendCheckIn(ci.id)} disabled={sending === ci.id}>
                    {sending === ci.id ? "Sending..." : "Send now"}
                  </button>
                )}
                {ci.status === "in_progress" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setRespondingTo(respondingTo === ci.id ? null : ci.id)}>
                    Simulate response
                  </button>
                )}
                {(ci.status === "completed" || ci.status === "escalated") && !ci.provider_reviewed && (
                  <button className="btn btn-primary btn-sm" onClick={async () => { await api.reviewCheckIn(ci.id); load(); }}>Mark reviewed</button>
                )}
                {ci.provider_reviewed && <span className="badge badge-green">Reviewed</span>}
              </div>
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>{ci.goal}</div>
            {ci.flags?.length > 0 && ci.flags.map((f: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: "#c62828", marginTop: 4 }}>{f}</div>
            ))}
            {ci.provider_summary && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Provider summary</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: "#faf6f0", padding: 10, borderRadius: 8, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
                  {ci.provider_summary}
                </pre>
              </details>
            )}
            {respondingTo === ci.id && (
              <div style={{ background: "#faf6f0", borderRadius: 10, padding: 14, marginTop: 10 }}>
                <label>Simulate patient response (in their language)</label>
                <textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={3}
                  placeholder={patient.language === "es" ? "e.g. Si, me tome la pastilla. Pero tengo un poco de mareo..." : "Type a simulated patient response..."} />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }} onClick={() => submitResponse(ci.id)} disabled={!responseText.trim()}>Submit response</button>
                {responseResult && (
                  <details open style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Analysis result</summary>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: "#fff", padding: 10, borderRadius: 8, marginTop: 6, maxHeight: 250, overflow: "auto" }}>
                      {JSON.stringify(responseResult, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Info tab */}
      {tab === "info" && (
        <div className="table-wrap" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Patient information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Name", name],
              ["MRN", patient.mrn || "—"],
              ["Phone", patient.phone],
              ["Language", `${LANG[patient.language] || patient.language}${patient.dialect ? ` (${patient.dialect})` : ""}`],
              ["Provider", patient.provider_name || "—"],
              ["Provider email", patient.provider_email || "—"],
              ["Channel", patient.preferred_channel?.toUpperCase()],
              ["Consented", patient.consented_at ? new Date(patient.consented_at).toLocaleString() : "Not yet"],
              ["Caregiver", patient.caregiver_name ? `${patient.caregiver_name} (${patient.caregiver_phone || "no phone"})` : "None"],
              ["Enrolled", new Date(patient.created_at).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#999", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
