/**
 * Visual instruction cards — what the patient sees.
 * Provider dashboard previews these so they can review before sending.
 */

// --- Medication Card ---
interface MedCardProps {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  pill_description?: string;
  translated_name?: string;
  translated_frequency?: string;
  translated_instructions?: string;
  language?: string;
}

const PILL_COLORS: Record<string, string> = {
  blue: "#3b82f6", white: "#e2e8f0", pink: "#f472b6", red: "#ef4444",
  yellow: "#facc15", orange: "#fb923c", green: "#22c55e", brown: "#92400e",
  purple: "#a855f7", gray: "#94a3b8", grey: "#94a3b8",
};

function parsePillColor(description: string): string {
  const lower = description.toLowerCase();
  for (const [name, hex] of Object.entries(PILL_COLORS)) {
    if (lower.includes(name)) return hex;
  }
  return "#94a3b8";
}

function parsePillShape(description: string): React.CSSProperties {
  const lower = description.toLowerCase();
  if (lower.includes("round") || lower.includes("circular")) return { borderRadius: "50%", width: 28, height: 28 };
  if (lower.includes("oval") || lower.includes("oblong")) return { borderRadius: 10, width: 36, height: 20 };
  return { borderRadius: 4, width: 30, height: 22 }; // tablet default
}

export function MedicationCard({ name, dosage, frequency, instructions, pill_description, translated_frequency, translated_instructions, language }: MedCardProps) {
  const color = parsePillColor(pill_description || "");
  const shape = parsePillShape(pill_description || "");
  const showTranslated = language && language !== "en";

  return (
    <div className="visual-card">
      <div className="vc-icon" style={{ background: "#eff6ff" }}>
        <div style={{ ...shape, background: color, border: "1.5px solid rgba(0,0,0,0.12)" }} />
      </div>
      <div className="vc-body">
        <div className="vc-title">{name} — {dosage}</div>
        {showTranslated && translated_frequency ? (
          <>
            <div className="vc-subtitle">{translated_frequency}</div>
            <div className="text-xs text-muted mt-1">{frequency}</div>
          </>
        ) : (
          <div className="vc-subtitle">{frequency}</div>
        )}
        {showTranslated && translated_instructions ? (
          <div className="vc-subtitle mt-1" style={{ fontStyle: "italic" }}>{translated_instructions}</div>
        ) : (
          <div className="vc-subtitle mt-1" style={{ fontStyle: "italic" }}>{instructions}</div>
        )}
        {pill_description && (
          <div className="mt-2 flex-center gap-2">
            <div style={{ ...shape, background: color, border: "1.5px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
            <span className="text-xs text-muted">{pill_description}</span>
          </div>
        )}
        <div className="vc-time">&#9200; {frequency}</div>
      </div>
    </div>
  );
}


// --- Red Flag Card ---
interface RedFlagProps {
  condition: string;
  action: string;
  translated_condition?: string;
  translated_action?: string;
  icon?: string;
  language?: string;
}

const RED_FLAG_ICONS: Record<string, string> = {
  swelling: "\u{1F6A8}",
  chest: "\u{2764}\u{FE0F}\u{200D}\u{1F525}",
  breathing: "\u{1F4A8}",
  fever: "\u{1F321}\u{FE0F}",
  bleeding: "\u{1FA78}",
  pain: "\u{26A0}\u{FE0F}",
  default: "\u{1F6A8}",
};

function pickRedFlagIcon(condition: string): string {
  const lower = condition.toLowerCase();
  for (const [key, icon] of Object.entries(RED_FLAG_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return RED_FLAG_ICONS.default;
}

export function RedFlagCard({ condition, action, translated_condition, translated_action, language }: RedFlagProps) {
  const icon = pickRedFlagIcon(condition);
  const showTranslated = language && language !== "en";

  return (
    <div className="red-flag-card">
      <div className="rf-icon">{icon}</div>
      <div style={{ flex: 1 }}>
        {showTranslated && translated_condition ? (
          <>
            <div className="rf-title">{translated_condition}</div>
            <div className="text-xs text-muted mt-1">{condition}</div>
          </>
        ) : (
          <div className="rf-title">{condition}</div>
        )}
        {showTranslated && translated_action ? (
          <div className="rf-action">{translated_action}</div>
        ) : (
          <div className="rf-action">{action}</div>
        )}
      </div>
    </div>
  );
}


// --- To-Do / Follow-Up Card ---
interface TodoCardProps {
  action: string;
  due_date?: string;
  details?: string;
  translated_action?: string;
  translated_details?: string;
  icon?: string;
  language?: string;
}

export function TodoCard({ action, due_date, details, translated_action, translated_details, icon, language }: TodoCardProps) {
  const showTranslated = language && language !== "en";
  return (
    <div className="visual-card">
      <div className="vc-icon" style={{ background: "#f0fdf4" }}>
        {icon || "\u{1F4CB}"}
      </div>
      <div className="vc-body">
        {showTranslated && translated_action ? (
          <>
            <div className="vc-title">{translated_action}</div>
            <div className="text-xs text-muted">{action}</div>
          </>
        ) : (
          <div className="vc-title">{action}</div>
        )}
        {showTranslated && translated_details ? (
          <div className="vc-subtitle">{translated_details}</div>
        ) : details ? (
          <div className="vc-subtitle">{details}</div>
        ) : null}
        {due_date && <div className="vc-time">&#128197; {due_date}</div>}
      </div>
    </div>
  );
}


// --- Lifestyle / Dietary Card ---
interface LifestyleCardProps {
  change: string;
  details: string;
  translated_change?: string;
  translated_details?: string;
  language?: string;
}

const LIFESTYLE_ICONS: Record<string, string> = {
  diet: "\u{1F957}",
  sodium: "\u{1F9C2}",
  salt: "\u{1F9C2}",
  walk: "\u{1F6B6}",
  exercise: "\u{1F3CB}\u{FE0F}",
  sleep: "\u{1F634}",
  rest: "\u{1F6CF}\u{FE0F}",
  water: "\u{1F4A7}",
  stretch: "\u{1F9D8}",
  massage: "\u{1F486}",
  movement: "\u{1F3C3}",
  default: "\u{2705}",
};

function pickLifestyleIcon(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, icon] of Object.entries(LIFESTYLE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return LIFESTYLE_ICONS.default;
}

export function LifestyleCard({ change, details, translated_change, translated_details, language }: LifestyleCardProps) {
  const icon = pickLifestyleIcon(change);
  const showTranslated = language && language !== "en";

  return (
    <div className="visual-card">
      <div className="vc-icon" style={{ background: "#fefce8" }}>{icon}</div>
      <div className="vc-body">
        {showTranslated && translated_change ? (
          <>
            <div className="vc-title">{translated_change}</div>
            <div className="text-xs text-muted">{change}</div>
          </>
        ) : (
          <div className="vc-title">{change}</div>
        )}
        {showTranslated && translated_details ? (
          <div className="vc-subtitle">{translated_details}</div>
        ) : (
          <div className="vc-subtitle">{details}</div>
        )}
      </div>
    </div>
  );
}


// --- Symptom Watch Card ---
interface SymptomCardProps {
  symptom: string;
  severity_scale?: string;
  when_to_report?: string;
  translated_symptom?: string;
  translated_when?: string;
  language?: string;
}

export function SymptomWatchCard({ symptom, when_to_report, translated_symptom, translated_when, language }: SymptomCardProps) {
  const showTranslated = language && language !== "en";
  return (
    <div className="visual-card">
      <div className="vc-icon" style={{ background: var_warning_bg }}>{"\u{1F440}"}</div>
      <div className="vc-body">
        {showTranslated && translated_symptom ? (
          <>
            <div className="vc-title">{translated_symptom}</div>
            <div className="text-xs text-muted">{symptom}</div>
          </>
        ) : (
          <div className="vc-title">{symptom}</div>
        )}
        {showTranslated && translated_when ? (
          <div className="vc-subtitle">{translated_when}</div>
        ) : when_to_report ? (
          <div className="vc-subtitle">{when_to_report}</div>
        ) : null}
      </div>
    </div>
  );
}

const var_warning_bg = "#fffbeb";
