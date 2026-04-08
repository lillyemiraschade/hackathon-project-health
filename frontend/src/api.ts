const API = "http://localhost:8000/api";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Patients
  listPatients: () => request("/patients/"),
  getPatient: (id: number) => request(`/patients/${id}`),
  enrollPatient: (data: any) => request("/patients/", { method: "POST", body: JSON.stringify(data) }),
  updatePatient: (id: number, data: any) => request(`/patients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  recordConsent: (id: number) => request(`/patients/${id}/consent`, { method: "POST" }),
  optOut: (id: number) => request(`/patients/${id}/opt-out`, { method: "POST" }),

  // Care Plans
  createCarePlan: (data: any) => request("/care-plans/", { method: "POST", body: JSON.stringify(data) }),
  getCarePlan: (id: number) => request(`/care-plans/${id}`),
  getPatientCarePlans: (patientId: number) => request(`/care-plans/patient/${patientId}`),

  // Check-ins
  getPatientCheckIns: (patientId: number) => request(`/check-ins/patient/${patientId}`),
  getDueCheckIns: () => request("/check-ins/due"),
  sendCheckIn: (id: number) => request(`/check-ins/${id}/send`, { method: "POST" }),
  respondToCheckIn: (id: number, data: any) => request(`/check-ins/${id}/respond`, { method: "POST", body: JSON.stringify(data) }),
  reviewCheckIn: (id: number) => request(`/check-ins/${id}/review`, { method: "POST" }),

  // Provider
  dashboard: () => request("/provider/dashboard"),
  stats: () => request("/provider/stats"),
  alerts: () => request("/provider/alerts"),
  timeline: () => request("/provider/timeline"),
  patientsEnriched: () => request("/provider/patients-enriched"),
  patientTimeline: (patientId: number) => request(`/provider/patient/${patientId}/timeline`),
  activityFeed: () => request("/provider/activity-feed"),
};

const WS_URL = "ws://localhost:8000";

export function connectProviderWS(onMessage: (msg: any) => void): WebSocket {
  const ws = new WebSocket(`${WS_URL}/ws/provider`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  ws.onclose = () => { setTimeout(() => connectProviderWS(onMessage), 3000); };
  return ws;
}
