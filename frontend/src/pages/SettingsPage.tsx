export default function SettingsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 700 }}>
        <div className="table-wrap" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Provider Profile</div>
          <div className="form-group">
            <label>Name</label>
            <input placeholder="Provider name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input placeholder="provider@clinic.com" />
          </div>
          <div className="form-group">
            <label>Clinic</label>
            <input placeholder="Clinic name" />
          </div>
          <button className="btn btn-primary btn-sm">Save</button>
        </div>

        <div className="table-wrap" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Notification Preferences</div>
          <div className="form-group">
            <label>Red flag alerts</label>
            <select defaultValue="immediate">
              <option value="immediate">Immediate (email + in-app)</option>
              <option value="digest">Hourly digest</option>
            </select>
          </div>
          <div className="form-group">
            <label>Check-in summaries</label>
            <select defaultValue="evening">
              <option value="evening">Evening digest</option>
              <option value="immediate">After each check-in</option>
              <option value="none">Off</option>
            </select>
          </div>
          <div className="form-group">
            <label>Missed check-in alerts</label>
            <select defaultValue="4h">
              <option value="4h">After 4 hours</option>
              <option value="8h">After 8 hours</option>
              <option value="24h">After 24 hours</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm">Save</button>
        </div>

        <div className="table-wrap" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Check-in Defaults</div>
          <div className="form-group">
            <label>Default medication check-in time</label>
            <input type="time" defaultValue="09:00" />
          </div>
          <div className="form-group">
            <label>Symptom check intervals</label>
            <input defaultValue="24h, 72h, 1 week" />
          </div>
          <div className="form-group">
            <label>Red flag follow-up interval (days)</label>
            <input type="number" defaultValue="3" min="1" max="14" />
          </div>
          <button className="btn btn-primary btn-sm">Save</button>
        </div>

        <div className="table-wrap" style={{ padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Integrations</div>
          <div className="form-group">
            <label>SMS Provider</label>
            <input defaultValue="Twilio (Mock Mode)" disabled style={{ background: "#f5efe6" }} />
          </div>
          <div className="form-group">
            <label>LLM Provider</label>
            <input defaultValue="Anthropic Claude" disabled style={{ background: "#f5efe6" }} />
          </div>
          <div className="form-group">
            <label>EHR Integration</label>
            <select defaultValue="none">
              <option value="none">Not connected (v2)</option>
              <option value="epic">Epic (FHIR)</option>
              <option value="athena">Athena</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
