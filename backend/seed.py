"""Seed the database with demo data (no API calls needed)."""
from datetime import datetime, timedelta, timezone
from database import init_db, SessionLocal
from models import Patient, CarePlan, CheckIn

DEMO_CARE_PLAN = {
    "medications": [
        {
            "name": "Lisinopril",
            "dosage": "10mg",
            "frequency": "Once daily in the morning",
            "duration": "Ongoing",
            "instructions": "Take with water, on an empty stomach",
            "pill_description": "Blue oval pill, imprint L10"
        }
    ],
    "symptoms_to_watch": [
        {"symptom": "Dizziness or lightheadedness", "severity_scale": "1-10", "when_to_report": "If persistent or worsening"},
        {"symptom": "Dry cough", "severity_scale": "1-10", "when_to_report": "If it interferes with sleep or daily activities"}
    ],
    "red_flags": [
        {"condition": "Swelling of face, lips, or tongue", "action": "Call 911 immediately — possible angioedema"},
        {"condition": "Chest pain or severe headache", "action": "Go to ER immediately"},
        {"condition": "BP above 180/120", "action": "Call clinic immediately"}
    ],
    "follow_up_actions": [
        {"action": "Blood work (BMP) to check potassium and kidney function", "due_date": "1 week", "details": "Fasting blood draw"},
        {"action": "BP recheck appointment", "due_date": "2 weeks", "details": "Return to Dr. Reyes"}
    ],
    "lifestyle_changes": [
        {"change": "Low-sodium diet", "details": "Less than 2g sodium per day"},
        {"change": "Daily walking", "details": "30 minutes, 5 days per week"}
    ],
    "check_in_schedule": {
        "medication_reminders": ["8:00 AM"],
        "symptom_checks": ["24h", "72h", "1 week"],
        "follow_up_reminders": ["1 week: blood work", "2 weeks: BP recheck"]
    }
}

DEMO_TRANSLATED = {
    "medications": [
        {
            "name": "Lisinopril",
            "dosage": "10mg",
            "frequency": "[AI-translated] Una vez al dia por la manana",
            "duration": "Continuo",
            "instructions": "[AI-translated] Tomar con agua, con el estomago vacio",
            "pill_description": "Pastilla ovalada azul, con las letras L10"
        }
    ],
    "symptoms_to_watch": [
        {"symptom": "Mareos o sensacion de desmayo", "severity_scale": "1-10", "when_to_report": "Si no se quita o empeora"},
        {"symptom": "Tos seca", "severity_scale": "1-10", "when_to_report": "Si no le deja dormir o hacer sus actividades"}
    ],
    "red_flags": [
        {"condition": "Hinchazon de la cara, labios o lengua", "action": "Llame al 911 inmediatamente"},
        {"condition": "Dolor en el pecho o dolor de cabeza muy fuerte", "action": "Vaya a la sala de emergencias inmediatamente"},
        {"condition": "Presion arterial arriba de 180/120", "action": "Llame a la clinica inmediatamente"}
    ],
    "follow_up_actions": [
        {"action": "Analisis de sangre para revisar el potasio y los rinones", "due_date": "1 semana", "details": "Debe ir en ayunas"},
        {"action": "Cita para revisar la presion arterial", "due_date": "2 semanas", "details": "Regresar con el Dr. Reyes"}
    ],
    "lifestyle_changes": [
        {"change": "Dieta baja en sal", "details": "Menos de 2 gramos de sal al dia"},
        {"change": "Caminar todos los dias", "details": "30 minutos, 5 dias a la semana"}
    ]
}


def seed():
    init_db()
    db = SessionLocal()

    # Check if already seeded
    if db.query(Patient).count() > 0:
        print("Database already has data, skipping seed.")
        db.close()
        return

    now = datetime.now(timezone.utc)

    # Patient 1: Maria Garcia (Spanish)
    p1 = Patient(
        first_name="Maria", last_name="Garcia",
        phone="+15551234567", language="es", dialect="mexican",
        mrn="48291", provider_name="Dr. Reyes",
        provider_email="dr.reyes@clinic.example.com",
        preferred_channel="sms",
        consented_at=now,
    )
    db.add(p1)
    db.flush()

    cp1 = CarePlan(
        patient_id=p1.id,
        original_text="SOAP Note — Dr. Reyes. Hypertension follow-up. Start lisinopril 10mg daily.",
        parsed_plan=DEMO_CARE_PLAN,
        translated_plan=DEMO_TRANSLATED,
        visit_date=now - timedelta(days=2),
        provider_name="Dr. Reyes",
    )
    db.add(cp1)
    db.flush()

    # Generate check-ins
    for day in range(1, 8):
        ci = CheckIn(
            patient_id=p1.id, care_plan_id=cp1.id,
            scheduled_at=cp1.visit_date + timedelta(days=day, hours=9),
            status="completed" if day <= 2 else "scheduled",
            check_in_type="medication",
            goal="Confirm patient took lisinopril 10mg this morning",
        )
        if day <= 2:
            ci.completed_at = ci.scheduled_at + timedelta(hours=1)
            ci.patient_response = "Si, me tome la pastilla esta manana."
            ci.translated_response = "Yes, I took the pill this morning."
            ci.provider_summary = f"Patient: Maria Garcia, MRN 48291\nDay {day} medication check-in\nAdherence: confirmed\nNo concerns reported."
            ci.provider_reviewed = day == 1
        db.add(ci)

    # Symptom check-in (completed with hedge words)
    ci_symptom = CheckIn(
        patient_id=p1.id, care_plan_id=cp1.id,
        scheduled_at=cp1.visit_date + timedelta(hours=72),
        completed_at=cp1.visit_date + timedelta(hours=73),
        status="completed",
        check_in_type="symptom",
        goal="Check on symptoms: dizziness, dry cough",
        patient_response="Si estoy bien, creo... a veces me da un poco de mareo pero no se si es normal.",
        translated_response="I'm fine, I think... sometimes I get a little dizzy but I don't know if it's normal.",
        hedge_count=2,
        flags=["Warning: 2 hedge words - possible underreporting"],
        severity="warning",
        provider_summary="Patient: Maria Garcia, MRN 48291\nDay 3 symptom check-in\nSymptom: mild dizziness, patient uncertain if concerning. 2 hedge phrases detected.\nSuggested: reassure about common side effect or schedule BP check.",
        provider_reviewed=False,
    )
    db.add(ci_symptom)

    # Patient 2: Nguyen (Vietnamese)
    p2 = Patient(
        first_name="Linh", last_name="Nguyen",
        phone="+15559876543", language="vi",
        mrn="61842", provider_name="Dr. Chen",
        provider_email="dr.chen@clinic.example.com",
        preferred_channel="sms",
        consented_at=now,
    )
    db.add(p2)

    db.commit()
    print(f"Seeded {db.query(Patient).count()} patients, {db.query(CarePlan).count()} care plans, {db.query(CheckIn).count()} check-ins.")
    db.close()


if __name__ == "__main__":
    seed()
