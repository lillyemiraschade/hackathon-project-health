import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const LANGUAGES = [
  { code: "es", label: "Spanish", dialects: ["mexican", "caribbean", "central_american"] },
  { code: "zh", label: "Mandarin", dialects: ["simplified", "traditional"] },
  { code: "vi", label: "Vietnamese", dialects: [] },
  { code: "ar", label: "Arabic", dialects: ["levantine", "egyptian", "msa"] },
  { code: "ht", label: "Haitian Creole", dialects: [] },
];

export default function EnrollPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", language: "es", dialect: "",
    mrn: "", provider_name: "", provider_email: "",
    caregiver_name: "", caregiver_phone: "", preferred_channel: "sms",
  });

  const set = (f: string) => (e: any) => setForm(s => ({ ...s, [f]: e.target.value }));
  const selectedLang = LANGUAGES.find(l => l.code === form.language);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await api.enrollPatient(form);
      await api.recordConsent(p.id);
      navigate(`/patient/${p.id}/upload`);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-content">
      <div className="page-header"><h1>Enroll patient</h1></div>

      <form onSubmit={submit} style={{ maxWidth: 640 }}>
        <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Patient details</div>
          <div className="form-grid">
            <div className="form-group"><label>First name *</label><input required value={form.first_name} onChange={set("first_name")} /></div>
            <div className="form-group"><label>Last name *</label><input required value={form.last_name} onChange={set("last_name")} /></div>
          </div>
          <div className="form-grid">
            <div className="form-group"><label>Phone *</label><input required type="tel" value={form.phone} onChange={set("phone")} placeholder="+1..." /></div>
            <div className="form-group"><label>MRN</label><input value={form.mrn} onChange={set("mrn")} /></div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Language *</label>
              <select value={form.language} onChange={set("language")}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Dialect</label>
              {selectedLang && selectedLang.dialects.length > 0 ? (
                <select value={form.dialect} onChange={set("dialect")}>
                  <option value="">Auto-detect</option>
                  {selectedLang.dialects.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : <input value={form.dialect} onChange={set("dialect")} placeholder="Optional" />}
            </div>
          </div>
          <div className="form-group">
            <label>Preferred channel</label>
            <select value={form.preferred_channel} onChange={set("preferred_channel")}>
              <option value="sms">SMS</option>
              <option value="voice">Voice call</option>
              <option value="web">Web app</option>
            </select>
          </div>
        </div>

        <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Provider</div>
          <div className="form-grid">
            <div className="form-group"><label>Provider name</label><input value={form.provider_name} onChange={set("provider_name")} /></div>
            <div className="form-group"><label>Provider email</label><input type="email" value={form.provider_email} onChange={set("provider_email")} /></div>
          </div>
        </div>

        <div className="table-wrap" style={{ padding: 20, marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Caregiver (optional)</div>
          <div className="form-grid">
            <div className="form-group"><label>Name</label><input value={form.caregiver_name} onChange={set("caregiver_name")} /></div>
            <div className="form-group"><label>Phone</label><input type="tel" value={form.caregiver_phone} onChange={set("caregiver_phone")} /></div>
          </div>
        </div>

        <div style={{ background: "#e8f5e9", borderRadius: 12, padding: 14, fontSize: 12, color: "#2e7d32", marginBottom: 14, lineHeight: 1.6 }}>
          By enrolling, the patient consents to receive AI-assisted health check-ins in their preferred language.
          All messages are AI-generated and reviewed by the care team. The patient may opt out at any time.
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Enrolling..." : "Enroll & upload care plan"}
        </button>
      </form>
    </div>
  );
}
