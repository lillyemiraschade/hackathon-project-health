import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { icons } from "./icons";
import Dashboard from "./pages/Dashboard";
import PatientsPage from "./pages/PatientsPage";
import AlertsPage from "./pages/AlertsPage";
import SchedulePage from "./pages/SchedulePage";
import CarePlansPage from "./pages/CarePlansPage";
import LanguagesPage from "./pages/LanguagesPage";
import SettingsPage from "./pages/SettingsPage";
import EnrollPatient from "./pages/EnrollPatient";
import UploadCarePlan from "./pages/UploadCarePlan";
import PatientDetail from "./pages/PatientDetail";

const NAV = [
  { section: "General" },
  { path: "/", label: "Dashboard", icon: icons.dashboard },
  { path: "/schedule", label: "Schedule", icon: icons.schedule },
  { path: "/patients", label: "Patients", icon: icons.patients },
  { path: "/stats", label: "Statistics & reports", icon: icons.stats },
  { path: "/languages", label: "Languages", icon: icons.languages },
  { path: "/care-plans", label: "Care Plans", icon: icons.carePlans },
  { section: "Tools" },
  { path: "/alerts", label: "Alerts", icon: icons.alerts },
  { path: "/enroll", label: "Enroll patient", icon: icons.plus },
  { path: "/settings", label: "Settings", icon: icons.settings },
];

function Sidebar() {
  const loc = useLocation();
  const isActive = (path: string) => {
    if (path === "/") return loc.pathname === "/";
    return loc.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="logo-row">
        <div className="logo-dot" />
        <span className="logo-text">carebridge</span>
      </div>

      {NAV.map((item, i) => {
        if ("section" in item && !("path" in item)) {
          return <div className="nav-section" key={i}>{item.section}</div>;
        }
        const n = item as { path: string; label: string; icon: JSX.Element };
        return (
          <Link key={n.path} to={n.path} className={`nav-item ${isActive(n.path) ? "active" : ""}`}>
            {n.icon}
            {n.label}
          </Link>
        );
      })}

      <div className="sidebar-spacer" />
      <Link to="/" className="nav-item">
        {icons.logout}
        Log out
      </Link>
    </aside>
  );
}

function TopBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/patients?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="top-bar">
      <form className="search-wrap" onSubmit={handleSearch}>
        {icons.search}
        <input
          placeholder="Search patients, care plans..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </form>
      <div className="top-tabs">
        {[
          { to: "/patients", label: "Patients" },
          { to: "/care-plans", label: "Care Plans" },
          { to: "/alerts", label: "Alerts" },
          { to: "/schedule", label: "Check-Ins" },
        ].map(t => (
          <Link key={t.to} to={t.to} className={`top-tab ${loc.pathname === t.to ? "active" : ""}`}>{t.label}</Link>
        ))}
      </div>
      <div className="top-right">
        <Link to="/alerts"><div className="notif-badge">!</div></Link>
        <div className="avatar-circle">DR</div>
      </div>
    </div>
  );
}

function LayoutWithTopBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 28px 0" }}><TopBar /></div>
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <Sidebar />
        <Routes>
          {/* Dashboard has its own layout (with right sidebar) */}
          <Route path="/" element={<LayoutWithTopBar><Dashboard /></LayoutWithTopBar>} />

          {/* Other pages use standard page layout */}
          <Route path="/patients" element={<LayoutWithTopBar><PatientsPage /></LayoutWithTopBar>} />
          <Route path="/alerts" element={<LayoutWithTopBar><AlertsPage /></LayoutWithTopBar>} />
          <Route path="/schedule" element={<LayoutWithTopBar><SchedulePage /></LayoutWithTopBar>} />
          <Route path="/care-plans" element={<LayoutWithTopBar><CarePlansPage /></LayoutWithTopBar>} />
          <Route path="/languages" element={<LayoutWithTopBar><LanguagesPage /></LayoutWithTopBar>} />
          <Route path="/stats" element={<LayoutWithTopBar><SchedulePage /></LayoutWithTopBar>} />
          <Route path="/settings" element={<LayoutWithTopBar><SettingsPage /></LayoutWithTopBar>} />
          <Route path="/enroll" element={<LayoutWithTopBar><EnrollPatient /></LayoutWithTopBar>} />
          <Route path="/patient/:patientId/upload" element={<LayoutWithTopBar><UploadCarePlan /></LayoutWithTopBar>} />
          <Route path="/patient/:patientId" element={<LayoutWithTopBar><PatientDetail /></LayoutWithTopBar>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
