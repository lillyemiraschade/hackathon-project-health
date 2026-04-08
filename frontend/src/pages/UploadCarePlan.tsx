import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import CarePlanPreview from "../components/CarePlanPreview";

const SAMPLE_NOTES = `SOAP Note — Dr. Reyes, Family Medicine
Date: 2026-04-07
Patient: Maria Garcia, DOB 1958-03-12, MRN 48291

SUBJECTIVE: Patient presents for follow-up of newly diagnosed hypertension. Reports occasional headaches in the morning. No chest pain, no shortness of breath. Diet includes high sodium intake. No regular exercise.

OBJECTIVE:
BP: 152/94 mmHg (elevated)
HR: 78 bpm, regular
Weight: 168 lbs

ASSESSMENT:
1. Essential hypertension, stage 2, newly diagnosed

PLAN:
1. Start lisinopril 10mg PO daily in the morning (blue oval pill, imprint "L10")
2. Low-sodium diet — less than 2g sodium per day
3. Walk 30 minutes daily, 5 days per week
4. Return for BP recheck in 2 weeks
5. Labs: BMP in 1 week to check potassium and kidney function

SYMPTOMS TO WATCH:
- Dizziness or lightheadedness (common side effect, report if persistent)
- Dry cough (common with ACE inhibitors)
- Swelling of face, lips, or tongue (EMERGENCY — go to ER immediately, this could be angioedema)

RED FLAGS:
- Facial/tongue swelling → call 911 immediately
- Chest pain or severe headache → go to ER
- BP reading above 180/120 if patient has home monitor → call clinic immediately`;

export default function UploadCarePlan() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { api.getPatient(Number(patientId)).then(setPatient).catch(() => {}); }, [patientId]);

  const submit = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const plan = await api.createCarePlan({ patient_id: Number(patientId), original_text: notes, visit_date: new Date().toISOString() });
      setResult(plan);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (result) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Care plan created</h1>
          <Link to={`/patient/${patientId}`} className="btn btn-primary">View patient &rarr;</Link>
        </div>
        <div style={{ background: "#e8f5e9", borderRadius: 12, padding: 14, fontSize: 12, color: "#2e7d32", marginBottom: 16 }}>
          Care plan parsed, translated, and check-in schedule generated. Preview below shows what the patient will see.
        </div>
        <CarePlanPreview
          parsed={result.parsed_plan}
          translated={result.translated_plan}
          language={patient?.language}
          patientName={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Upload visit notes</h1>
          {patient && <span style={{ fontSize: 13, color: "#888" }}>For {patient.first_name} {patient.last_name} — {patient.language.toUpperCase()}</span>}
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="card-title">Visit notes (English)</div>
          <button className="pill" onClick={() => setNotes(SAMPLE_NOTES)}>Load sample</button>
        </div>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={14} placeholder="Paste SOAP notes, discharge instructions, or medication list here..."
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading || !notes.trim()}>
          {loading ? "Parsing & translating..." : "Process care plan"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(`/patient/${patientId}`)}>Cancel</button>
      </div>

      {loading && (
        <div style={{ background: "#e3f2fd", borderRadius: 12, padding: 14, fontSize: 12, color: "#1565c0", marginTop: 14, lineHeight: 1.6 }}>
          AI is parsing visit notes, extracting medications, red flags, and follow-ups, translating at 6th-grade reading level,
          and generating visual instruction cards + check-in schedule. This takes 15-30 seconds...
        </div>
      )}
    </div>
  );
}
