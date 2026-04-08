/**
 * Full care plan preview — shows what the patient will see.
 * Used on provider dashboard after care plan ingestion.
 */
import { MedicationCard, RedFlagCard, TodoCard, LifestyleCard, SymptomWatchCard } from "./PatientCards";

interface Props {
  parsed: any;
  translated?: any;
  language?: string;
  patientName?: string;
}

export default function CarePlanPreview({ parsed, translated, language, patientName }: Props) {
  if (!parsed) return null;

  const t = translated || {};

  return (
    <div className="patient-card-preview">
      <div className="preview-label">
        &#128065; Patient view preview {patientName ? `— ${patientName}` : ""}
      </div>

      {/* RED FLAGS — pinned to top */}
      {parsed.red_flags?.length > 0 && (
        <div className="mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F6A8}"}</span>
            <h3 style={{ color: "var(--danger)", fontSize: 15 }}>
              {language === "es" ? "Vaya al hospital si ve esto" : "Go to the ER if you see this"}
            </h3>
          </div>
          {parsed.red_flags.map((rf: any, i: number) => (
            <RedFlagCard
              key={i}
              condition={rf.condition}
              action={rf.action}
              translated_condition={t.red_flags?.[i]?.condition}
              translated_action={t.red_flags?.[i]?.action}
              language={language}
            />
          ))}
        </div>
      )}

      {/* MEDICATIONS */}
      {parsed.medications?.length > 0 && (
        <div className="mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F48A}"}</span>
            <h3>{language === "es" ? "Sus medicamentos" : "Your medications"}</h3>
          </div>
          {parsed.medications.map((med: any, i: number) => (
            <MedicationCard
              key={i}
              name={med.name}
              dosage={med.dosage}
              frequency={med.frequency}
              instructions={med.instructions}
              pill_description={med.pill_description}
              translated_frequency={t.medications?.[i]?.frequency}
              translated_instructions={t.medications?.[i]?.instructions}
              language={language}
            />
          ))}
        </div>
      )}

      {/* SYMPTOMS TO WATCH */}
      {parsed.symptoms_to_watch?.length > 0 && (
        <div className="mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F440}"}</span>
            <h3>{language === "es" ? "Sintomas que vigilar" : "Symptoms to watch"}</h3>
          </div>
          {parsed.symptoms_to_watch.map((s: any, i: number) => (
            <SymptomWatchCard
              key={i}
              symptom={s.symptom}
              severity_scale={s.severity_scale}
              when_to_report={s.when_to_report}
              translated_symptom={t.symptoms_to_watch?.[i]?.symptom}
              translated_when={t.symptoms_to_watch?.[i]?.when_to_report}
              language={language}
            />
          ))}
        </div>
      )}

      {/* FOLLOW-UP TO-DO LIST */}
      {parsed.follow_up_actions?.length > 0 && (
        <div className="mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F4CB}"}</span>
            <h3>{language === "es" ? "Lo que debe hacer" : "Your to-do list"}</h3>
          </div>
          {parsed.follow_up_actions.map((a: any, i: number) => (
            <TodoCard
              key={i}
              action={a.action}
              due_date={a.due_date}
              details={a.details}
              translated_action={t.follow_up_actions?.[i]?.action}
              translated_details={t.follow_up_actions?.[i]?.details}
              language={language}
            />
          ))}
        </div>
      )}

      {/* LIFESTYLE / DIETARY */}
      {parsed.lifestyle_changes?.length > 0 && (
        <div className="mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F331}"}</span>
            <h3>{language === "es" ? "Cambios en su estilo de vida" : "Lifestyle changes"}</h3>
          </div>
          {parsed.lifestyle_changes.map((l: any, i: number) => (
            <LifestyleCard
              key={i}
              change={l.change}
              details={l.details}
              translated_change={t.lifestyle_changes?.[i]?.change}
              translated_details={t.lifestyle_changes?.[i]?.details}
              language={language}
            />
          ))}
        </div>
      )}

      <div className="text-xs text-muted" style={{ textAlign: "center", marginTop: 20, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
        All content is AI-translated and reviewed by your care team.
        {language === "es" && <><br/>Todo el contenido es traducido por IA y revisado por su equipo medico.</>}
      </div>
    </div>
  );
}
