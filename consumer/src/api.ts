const API = "http://localhost:8000/api";
const WS_URL = "ws://localhost:8000";
const TOKEN_KEY = "carecompanion_session_token";
const PATIENT_KEY = "carecompanion_patient_id";

// --- Session persistence ---
export function getSavedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getSavedPatientId(): number | null {
  const v = localStorage.getItem(PATIENT_KEY);
  return v ? parseInt(v, 10) : null;
}
export function saveSession(token: string, patientId: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PATIENT_KEY, String(patientId));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PATIENT_KEY);
}

// --- HTTP ---
function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getSavedToken();
  if (token) h["X-Session-Token"] = token;
  return h;
}

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Session
  startSession: (patientId: number) =>
    request("/consumer/session/start", { method: "POST", body: JSON.stringify({ patient_id: patientId }) }),
  resumeSession: (token: string) => request(`/consumer/session/${token}`),
  saveState: (token: string, state: any) =>
    request(`/consumer/session/${token}/state`, { method: "PUT", body: JSON.stringify(state) }),

  // Patient list (for switcher)
  listPatients: () => request("/consumer/patients"),

  // Existing
  getHome: (patientId: number) => request(`/consumer/${patientId}/home`),
  postEvent: (patientId: number, type: string, data?: any) =>
    request(`/consumer/${patientId}/event`, { method: "POST", body: JSON.stringify({ type, data }) }),
  getEvents: (patientId: number) => request(`/consumer/${patientId}/events`),
};

export function connectPatientWS(patientId: number, onMessage: (msg: any) => void): WebSocket {
  const ws = new WebSocket(`${WS_URL}/ws/patient/${patientId}`);
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
  ws.onclose = () => { setTimeout(() => connectPatientWS(patientId, onMessage), 3000); };
  return ws;
}
