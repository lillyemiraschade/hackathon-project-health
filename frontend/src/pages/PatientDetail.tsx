import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api, connectProviderWS } from "../api";
import CarePlanPreview from "../components/CarePlanPreview";

const LANG: Record<string, string> = { es: "Spanish", zh: "Mandarin", vi: "Vietnamese", ar: "Arabic", ht: "Haitian Creole" };
const LANGUAGES = [
  { code: "es", label: "Spanish", dialects: ["mexican", "caribbean", "central_american"] },
  { code: "zh", label: "Mandarin", dialects: ["simplified", "traditional"] },
  { code: "vi", label: "Vietnamese", dialects: [] },
  { code: "ar", label: "Arabic", dialects: ["levantine", "egyptian", "msa"] },
  { code: "ht", label: "Haitian Creole", dialects: [] },
];
const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-gray", in_progress: "badge-blue", completed: "badge-green", missed: "badge-amber", escalated: "badge-red",
};

const EVENT_ICONS: Record<string, string> = {
  task_completed: "\u2705", flag_triggered: "\u{1F6A8}", call_started: "\u{1F4DE}",
  call_ended: "\u{1F4F4}", doc_viewed: "\u{1F4C4}", symptom_reported: "\u{2764}\u{FE0F}",
};
const EVENT_COLORS: Record<string, string> = {
  task_completed: "#4a7c59", flag_triggered: "#e74c3c", call_started: "#3B82F6",
  call_ended: "#6B7280", doc_viewed: "#8B5CF6", symptom_reported: "#F59E0B",
};
const EVENT_LABELS: Record<string, string> = {
  task_completed: "Task completed", flag_triggered: "Red flag triggered", call_started: "Call started",
  call_ended: "Call ended", doc_viewed: "Document viewed", symptom_reported: "Symptom reported",
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plan" | "checkins" | "info" | "activity">("plan");
  const [sending, setSending] = useState<number | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseResult, setResponseResult] = useState<any>(null);
  const [planLang, setPlanLang] = useState<"translated" | "english">("translated");
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [newEventFlash, setNewEventFlash] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = () => { api.patientTimeline(Number(patientId)).then(d => {
    setData(d);
    setLiveEvents(d.patient_events || []);
  }).finally(() => setLoading(false)); };
  useEffect(load, [patientId]);

  // WebSocket — listen for live events from this patient
  useEffect(() => {
    wsRef.current = connectProviderWS((msg) => {
      if (msg.type === "patient_event" && msg.patient_id === Number(patientId)) {
        setLiveEvents(prev => [{
          id: Date.now(),
          event_type: msg.event_type,
          event_data: msg.event_data,
          created_at: msg.created_at,
        }, ...prev]);
        // Flash the activity tab
        setNewEventFlash(true);
        setTimeout(() => setNewEventFlash(false), 3000);
      }
    });
    return () => { wsRef.current?.close(); };
  }, [patientId]);

  // Initialize edit form when data loads
  useEffect(() => {
    if (data?.patient) {
      const p = data.patient;
      setEditForm({
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        phone: p.phone || "",
        language: p.language || "es",
        dialect: p.dialect || "",
        mrn: p.mrn || "",
        provider_name: p.provider_name || "",
        provider_email: p.provider_email || "",
        caregiver_name: p.caregiver_name || "",
        caregiver_phone: p.caregiver_phone || "",
        preferred_channel: p.preferred_channel || "sms",
      });
    }
  }, [data]);

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

  const setField = (key: string) => (e: any) => setEditForm((f: any) => ({ ...f, [key]: e.target.value }));
  const savePatient = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.updatePatient(patient.id, editForm);
      setSaveMsg("Saved");
      load();
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e: any) { setSaveMsg("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const selectedLangObj = LANGUAGES.find(l => l.code === editForm?.language);

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
        {(["plan", "checkins", "activity", "info"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "activity") setNewEventFlash(false); }}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: tab === t ? 600 : 500,
              color: tab === t ? "#4a7c59" : "#888", cursor: "pointer",
              borderBottom: `2px solid ${tab === t ? "#4a7c59" : "transparent"}`,
              marginBottom: -1, background: "none", border: "none", borderBottomStyle: "solid",
              borderBottomWidth: 2, fontFamily: "inherit", position: "relative",
            }}
          >
            {t === "plan" ? "Care Plan" : t === "checkins" ? `Check-ins (${check_ins?.length || 0})` : t === "activity" ? "Activity" : "Patient Info"}
            {t === "activity" && newEventFlash && tab !== "activity" && (
              <span style={{
                position: "absolute", top: 6, right: 4,
                width: 8, height: 8, borderRadius: "50%",
                background: "#e74c3c", animation: "pulse 1s infinite",
              }} />
            )}
            {t === "activity" && liveEvents.length > 0 && (
              <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>({liveEvents.length})</span>
            )}
          </button>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}`}</style>

      {/* ═══ Care Plan tab ═══ */}
      {tab === "plan" && (
        care_plan ? (
          <>
            <div className="table-wrap" style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">Active care plan</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Language toggle */}
                  <div style={{
                    display: "flex", background: "#ede7dd", borderRadius: 10, padding: 2, gap: 2,
                  }}>
                    <button
                      onClick={() => setPlanLang("english")}
                      style={{
                        padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600,
                        fontFamily: "inherit", cursor: "pointer",
                        background: planLang === "english" ? "#fff" : "transparent",
                        color: planLang === "english" ? "#2a2a2a" : "#888",
                        boxShadow: planLang === "english" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setPlanLang("translated")}
                      style={{
                        padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600,
                        fontFamily: "inherit", cursor: "pointer",
                        background: planLang === "translated" ? "#fff" : "transparent",
                        color: planLang === "translated" ? "#2a2a2a" : "#888",
                        boxShadow: planLang === "translated" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      {LANG[patient.language] || patient.language}
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "#999" }}>
                    Created {new Date(care_plan.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.medications?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Medications</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.red_flags?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Red flags</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.follow_up_actions?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Follow-ups</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{care_plan.parsed_plan?.lifestyle_changes?.length || 0}</div><div style={{ fontSize: 10, color: "#999" }}>Lifestyle</div></div>
              </div>
            </div>

            {/* Show English-only or bilingual based on toggle */}
            <CarePlanPreview
              parsed={care_plan.parsed_plan}
              translated={planLang === "translated" ? care_plan.translated_plan : undefined}
              language={planLang === "translated" ? patient.language : "en"}
              patientName={name}
            />

            <div className="table-wrap" style={{ padding: 16, marginTop: 14 }}>
              <details>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View raw parsed plan (English)</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: "#faf6f0", padding: 12, borderRadius: 8, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
                  {JSON.stringify(care_plan.parsed_plan, null, 2)}
                </pre>
              </details>
              {care_plan.translated_plan && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View raw translated plan ({LANG[patient.language] || patient.language})</summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, background: "#faf6f0", padding: 12, borderRadius: 8, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
                    {JSON.stringify(care_plan.translated_plan, null, 2)}
                  </pre>
                </details>
              )}
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

      {/* ═══ Check-ins tab ═══ */}
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

      {/* ═══ Activity tab ═══ */}
      {tab === "activity" && (
        <div>
          {/* Task completion summary */}
          {(() => {
            const taskEvents = liveEvents.filter(e => e.event_type === "task_completed" && e.event_data?.completed);
            const completedTasks = new Set(taskEvents.map(e => e.event_data?.task));
            const allTasks = ["pill", "walk", "bp"];
            const taskLabels: Record<string, string> = { pill: "Medication taken", walk: "Walk completed", bp: "Blood pressure measured" };
            const taskIcons: Record<string, string> = { pill: "\u{1F48A}", walk: "\u{1F6B6}", bp: "\u{1FA93}" };
            return (
              <div className="table-wrap" style={{ padding: 16, marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Today's tasks</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {allTasks.map(task => {
                    const done = completedTasks.has(task);
                    return (
                      <div key={task} style={{
                        flex: 1, padding: "12px 14px", borderRadius: 12,
                        background: done ? "#e8f5e9" : "#faf6f0",
                        border: `1px solid ${done ? "#a5d6a7" : "#e0dbd2"}`,
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{taskIcons[task]}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: done ? "#2e7d32" : "#888" }}>{taskLabels[task]}</div>
                        <div style={{
                          marginTop: 6, fontSize: 10, fontWeight: 700,
                          color: done ? "#4a7c59" : "#bbb",
                          textTransform: "uppercase", letterSpacing: "0.1em",
                        }}>
                          {done ? "\u2713 Done" : "Pending"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Event timeline */}
          <div className="table-wrap" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="card-title">Event log</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#4a7c59", display: "inline-block",
                  animation: "pulse 2s infinite",
                }} />
                <span style={{ fontSize: 11, color: "#999" }}>Live</span>
              </div>
            </div>

            {liveEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#999", fontSize: 13 }}>
                No activity yet. Events appear here in real-time when the patient uses the app.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {liveEvents.map((ev, i) => {
                  const ago = ev.created_at ? new Date(ev.created_at) : null;
                  const agoMin = ago ? Math.max(0, Math.round((Date.now() - ago.getTime()) / 60000)) : null;
                  const agoStr = agoMin !== null ? (agoMin < 1 ? "just now" : agoMin < 60 ? `${agoMin}m ago` : `${Math.round(agoMin / 60)}h ago`) : "";
                  const color = EVENT_COLORS[ev.event_type] || "#999";
                  const icon = EVENT_ICONS[ev.event_type] || "\u{1F4CB}";
                  const label = EVENT_LABELS[ev.event_type] || ev.event_type.replace(/_/g, " ");
                  const detail = ev.event_data?.task
                    ? `Task: ${ev.event_data.task}${ev.event_data.completed === false ? " (unchecked)" : ""}`
                    : ev.event_data?.doc ? `Doc: ${ev.event_data.doc}`
                    : ev.event_data?.symptom ? `Symptom: ${ev.event_data.symptom}`
                    : ev.event_data?.steps ? `Steps completed: ${ev.event_data.steps}`
                    : null;

                  return (
                    <div key={ev.id || i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px",
                      borderRadius: 10, background: i === 0 && newEventFlash ? "#e8f5e9" : "transparent",
                      transition: "background 0.5s",
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#2a2a2a" }}>{label}</div>
                        {detail && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{detail}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: "#999", whiteSpace: "nowrap", flexShrink: 0 }}>{agoStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Patient Info tab (editable) ═══ */}
      {tab === "info" && editForm && (
        <div>
          <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="card-title">Patient details</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {saveMsg && <span style={{ fontSize: 12, color: saveMsg === "Saved" ? "#4a7c59" : "#e74c3c", fontWeight: 600 }}>{saveMsg}</span>}
                <button className="btn btn-primary btn-sm" onClick={savePatient} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>First name</label>
                <input value={editForm.first_name} onChange={setField("first_name")} />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input value={editForm.last_name} onChange={setField("last_name")} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Phone</label>
                <input value={editForm.phone} onChange={setField("phone")} />
              </div>
              <div className="form-group">
                <label>MRN</label>
                <input value={editForm.mrn} onChange={setField("mrn")} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Language</label>
                <select value={editForm.language} onChange={setField("language")}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Dialect</label>
                {selectedLangObj && selectedLangObj.dialects.length > 0 ? (
                  <select value={editForm.dialect} onChange={setField("dialect")}>
                    <option value="">Auto-detect</option>
                    {selectedLangObj.dialects.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input value={editForm.dialect} onChange={setField("dialect")} placeholder="Optional" />
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Preferred channel</label>
              <select value={editForm.preferred_channel} onChange={setField("preferred_channel")}>
                <option value="sms">SMS</option>
                <option value="voice">Voice call</option>
                <option value="web">Web app</option>
              </select>
            </div>
          </div>

          <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Provider</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Provider name</label>
                <input value={editForm.provider_name} onChange={setField("provider_name")} />
              </div>
              <div className="form-group">
                <label>Provider email</label>
                <input value={editForm.provider_email} onChange={setField("provider_email")} />
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Caregiver</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Caregiver name</label>
                <input value={editForm.caregiver_name} onChange={setField("caregiver_name")} />
              </div>
              <div className="form-group">
                <label>Caregiver phone</label>
                <input value={editForm.caregiver_phone} onChange={setField("caregiver_phone")} />
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ padding: 20 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>System info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#999", fontWeight: 600 }}>Consented</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{patient.consented_at ? new Date(patient.consented_at).toLocaleString() : "Not yet"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#999", fontWeight: 600 }}>Enrolled</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(patient.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#999", fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{patient.opted_out ? "Opted out" : "Active"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#999", fontWeight: 600 }}>Patient ID</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>{patient.id}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
