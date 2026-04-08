from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import base64
import os

from database import get_db
from models import CheckIn, CarePlan, Patient, CheckInImage, AuditLog
from schemas import CheckInOut, CheckInResponse
from services.translation import (
    generate_check_in_message,
    analyze_patient_response,
)
from services.image_analysis import analyze_image
from services.notifications import send_sms, send_provider_email

router = APIRouter(prefix="/api/check-ins", tags=["check-ins"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/patient/{patient_id}", response_model=list[CheckInOut])
def get_patient_check_ins(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(CheckIn)
        .filter(CheckIn.patient_id == patient_id)
        .order_by(CheckIn.scheduled_at.desc())
        .all()
    )


@router.get("/due", response_model=list[CheckInOut])
def get_due_check_ins(db: Session = Depends(get_db)):
    """Get all check-ins that are due for sending."""
    now = datetime.now(timezone.utc)
    return (
        db.query(CheckIn)
        .filter(CheckIn.status == "scheduled", CheckIn.scheduled_at <= now)
        .all()
    )


@router.post("/{check_in_id}/send")
def send_check_in(check_in_id: int, db: Session = Depends(get_db)):
    """Trigger sending a check-in message to the patient."""
    ci = db.query(CheckIn).filter(CheckIn.id == check_in_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Check-in not found")

    patient = db.query(Patient).filter(Patient.id == ci.patient_id).first()
    care_plan = db.query(CarePlan).filter(CarePlan.id == ci.care_plan_id).first()

    # Generate the check-in message
    message = generate_check_in_message(
        check_in_type=ci.check_in_type,
        goal=ci.goal or "",
        patient_name=f"{patient.first_name} {patient.last_name}",
        provider_name=patient.provider_name or "your doctor",
        language=patient.language,
        dialect=patient.dialect,
        care_plan_context=care_plan.parsed_plan if care_plan else None,
    )

    # Send via SMS
    result = send_sms(patient.phone, message)

    # Update check-in status
    ci.status = "in_progress"
    ci.messages = (ci.messages or []) + [{"role": "system", "content": message, "sent_at": datetime.now(timezone.utc).isoformat()}]
    db.commit()

    return {"status": "sent", "message": message, "sms_result": result}


@router.post("/{check_in_id}/respond")
def process_patient_response(check_in_id: int, response: CheckInResponse, db: Session = Depends(get_db)):
    """Process a patient's response to a check-in."""
    ci = db.query(CheckIn).filter(CheckIn.id == check_in_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Check-in not found")

    patient = db.query(Patient).filter(Patient.id == ci.patient_id).first()
    care_plan = db.query(CarePlan).filter(CarePlan.id == ci.care_plan_id).first()

    # Analyze the patient's message
    red_flags = care_plan.parsed_plan.get("red_flags", []) if care_plan else []
    analysis = analyze_patient_response(
        patient_message=response.message,
        language=patient.language,
        check_in_goal=ci.goal or "",
        care_plan_context=care_plan.parsed_plan if care_plan else None,
        red_flags=red_flags,
    )

    # Handle image if provided
    image_result = None
    if response.image_base64:
        image_result = analyze_image(
            response.image_base64,
            response.image_type or "symptom",
            care_plan.parsed_plan if care_plan else None,
        )
        # Save image
        img_path = os.path.join(UPLOAD_DIR, f"checkin_{check_in_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.jpg")
        with open(img_path, "wb") as f:
            f.write(base64.b64decode(response.image_base64))

        db_image = CheckInImage(
            check_in_id=check_in_id,
            image_path=img_path,
            image_type=response.image_type or "symptom",
            ai_interpretation=image_result["interpretation"],
        )
        db.add(db_image)

    # Update check-in record
    ci.patient_response = response.message
    ci.translated_response = analysis.get("english_translation", "")
    ci.hedge_count = analysis.get("hedge_words_detected", 0)
    ci.severity = "red_flag" if analysis.get("red_flag_triggered") else "info"
    ci.flags = []
    if analysis.get("hedge_words_detected", 0) > 0:
        ci.flags.append(f"⚠️ {analysis['hedge_words_detected']} hedge words — possible underreporting")
    if analysis.get("red_flag_triggered"):
        ci.flags.append(f"🚨 RED FLAG: {analysis.get('red_flag_details', 'See details')}")
    ci.messages = (ci.messages or []) + [
        {"role": "patient", "content": response.message, "received_at": datetime.now(timezone.utc).isoformat()}
    ]

    # Generate provider summary
    summary_parts = [
        f"Patient: {patient.first_name} {patient.last_name}, MRN {patient.mrn or 'N/A'}",
        f"Check-in type: {ci.check_in_type}",
        f"Goal: {ci.goal}",
        f"",
        f"Patient said (translated): {analysis.get('english_translation', 'N/A')}",
        f"Adherence confirmed: {analysis.get('adherence_confirmed', 'N/A')}",
        f"Symptoms reported: {', '.join(analysis.get('symptoms_reported', [])) or 'None'}",
        f"Severity estimate: {analysis.get('severity_estimate', 'N/A')}/10",
        f"Hedge words detected: {analysis.get('hedge_words_detected', 0)}",
    ]
    if image_result:
        summary_parts.append(f"\nImage uploaded ({response.image_type}): {image_result['interpretation']}")
        summary_parts.append(f"⚠️ {image_result['disclaimer']}")
    if analysis.get("red_flag_triggered"):
        summary_parts.append(f"\n🚨 RED FLAG: {analysis.get('red_flag_details')}")
    summary_parts.append(f"\nSuggested action: {analysis.get('suggested_provider_action', 'None')}")

    ci.provider_summary = "\n".join(summary_parts)
    ci.status = "escalated" if analysis.get("red_flag_triggered") else "completed"
    ci.completed_at = datetime.now(timezone.utc)

    # Audit log
    db.add(AuditLog(
        action="check_in_completed",
        entity_type="check_in",
        entity_id=ci.id,
        details={
            "red_flag": analysis.get("red_flag_triggered", False),
            "hedge_count": analysis.get("hedge_words_detected", 0),
        },
        model_version="claude-sonnet-4-20250514",
    ))
    db.commit()

    # Notify provider if red flag
    if analysis.get("red_flag_triggered") and patient.provider_email:
        send_provider_email(
            patient.provider_email,
            f"🚨 RED FLAG: {patient.first_name} {patient.last_name} - Immediate Review Needed",
            ci.provider_summary,
        )

    return {
        "status": ci.status,
        "analysis": analysis,
        "image_result": image_result,
        "provider_summary": ci.provider_summary,
    }


@router.post("/{check_in_id}/review")
def provider_review(check_in_id: int, db: Session = Depends(get_db)):
    """Mark a check-in as reviewed by provider."""
    ci = db.query(CheckIn).filter(CheckIn.id == check_in_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Check-in not found")
    ci.provider_reviewed = True
    db.commit()
    return {"status": "reviewed"}
