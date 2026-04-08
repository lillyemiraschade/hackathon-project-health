from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from database import get_db
from models import Patient, CarePlan, CheckIn, PatientEvent, PatientSession
from services.realtime import manager

router = APIRouter(prefix="/api/consumer", tags=["consumer"])


# ── Session endpoints ────────────────────────────────────────────────

@router.post("/session/start")
def start_session(body: dict, db: Session = Depends(get_db)):
    """Create a new patient session with a random token."""
    patient_id = body.get("patient_id")
    if patient_id is None:
        raise HTTPException(400, "patient_id is required")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    token = secrets.token_urlsafe(32)
    session = PatientSession(patient_id=patient_id, token=token)
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"token": session.token, "patient_id": session.patient_id}


@router.get("/session/{token}")
def get_session(token: str, db: Session = Depends(get_db)):
    """Resume a session — returns patient data, care plan, events, and saved app_state."""
    session = db.query(PatientSession).filter(PatientSession.token == token).first()
    if not session:
        raise HTTPException(404, "Session not found")

    # Update last_active
    session.last_active = datetime.now(timezone.utc)
    db.commit()

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    care_plan = db.query(CarePlan).filter(
        CarePlan.patient_id == session.patient_id, CarePlan.active == True
    ).first()

    check_ins = db.query(CheckIn).filter(CheckIn.patient_id == session.patient_id).all()
    total = len(check_ins)
    completed = len([c for c in check_ins if c.status == "completed"])

    events = db.query(PatientEvent).filter(
        PatientEvent.patient_id == session.patient_id
    ).order_by(PatientEvent.created_at.desc()).limit(20).all()

    return {
        "session": {"token": session.token, "patient_id": session.patient_id},
        "patient": {
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "language": patient.language,
            "dialect": patient.dialect,
            "provider_name": patient.provider_name,
        },
        "care_plan": {
            "id": care_plan.id,
            "parsed_plan": care_plan.parsed_plan,
            "translated_plan": care_plan.translated_plan,
            "visit_date": care_plan.visit_date.isoformat() if care_plan.visit_date else None,
        } if care_plan else None,
        "progress": {"completed": completed, "total": total},
        "app_state": session.app_state,
        "recent_events": [
            {"type": e.event_type, "data": e.event_data, "created_at": e.created_at.isoformat()}
            for e in events
        ],
    }


@router.put("/session/{token}/state")
def update_session_state(token: str, body: dict, db: Session = Depends(get_db)):
    """Save the consumer app's UI state (tasks, current screen, preferences)."""
    session = db.query(PatientSession).filter(PatientSession.token == token).first()
    if not session:
        raise HTTPException(404, "Session not found")

    session.app_state = body
    session.last_active = datetime.now(timezone.utc)
    db.commit()

    return {"status": "ok"}


# ── Patient list ─────────────────────────────────────────────────────

@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    """Return all non-opted-out patients (for the patient switcher)."""
    patients = db.query(Patient).filter(Patient.opted_out == False).all()
    return {
        "patients": [
            {
                "id": p.id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "language": p.language,
                "provider_name": p.provider_name,
            }
            for p in patients
        ]
    }


# ── Existing endpoints ───────────────────────────────────────────────

@router.get("/{patient_id}/home")
def get_patient_home(patient_id: int, db: Session = Depends(get_db)):
    """Get patient home screen data."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    care_plan = db.query(CarePlan).filter(
        CarePlan.patient_id == patient_id, CarePlan.active == True
    ).first()

    # Count completed check-ins vs total
    check_ins = db.query(CheckIn).filter(CheckIn.patient_id == patient_id).all()
    total = len(check_ins)
    completed = len([c for c in check_ins if c.status == "completed"])

    # Get recent events
    events = db.query(PatientEvent).filter(
        PatientEvent.patient_id == patient_id
    ).order_by(PatientEvent.created_at.desc()).limit(20).all()

    return {
        "patient": {
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "language": patient.language,
            "dialect": patient.dialect,
            "provider_name": patient.provider_name,
        },
        "care_plan": {
            "id": care_plan.id,
            "parsed_plan": care_plan.parsed_plan,
            "translated_plan": care_plan.translated_plan,
            "visit_date": care_plan.visit_date.isoformat() if care_plan.visit_date else None,
        } if care_plan else None,
        "progress": {"completed": completed, "total": total},
        "recent_events": [
            {"type": e.event_type, "data": e.event_data, "created_at": e.created_at.isoformat()}
            for e in events
        ],
    }


@router.post("/{patient_id}/event")
async def post_patient_event(patient_id: int, event: dict, request: Request, db: Session = Depends(get_db)):
    """Post an event from the patient app. Broadcasts to provider in real-time."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    db_event = PatientEvent(
        patient_id=patient_id,
        event_type=event.get("type", "unknown"),
        event_data=event.get("data"),
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # If a session token header is present, update that session's last_active
    session_token = request.headers.get("X-Session-Token")
    if session_token:
        session = db.query(PatientSession).filter(PatientSession.token == session_token).first()
        if session:
            session.last_active = datetime.now(timezone.utc)
            db.commit()

    # Broadcast to providers
    broadcast = {
        "type": "patient_event",
        "patient_id": patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "event_type": db_event.event_type,
        "event_data": db_event.event_data,
        "created_at": db_event.created_at.isoformat(),
    }
    await manager.broadcast_to_providers(broadcast)

    return {"status": "ok", "event_id": db_event.id}


@router.get("/{patient_id}/events")
def get_patient_events(patient_id: int, db: Session = Depends(get_db)):
    events = db.query(PatientEvent).filter(
        PatientEvent.patient_id == patient_id
    ).order_by(PatientEvent.created_at.desc()).limit(50).all()
    return {"events": [
        {"id": e.id, "type": e.event_type, "data": e.event_data, "created_at": e.created_at.isoformat()}
        for e in events
    ]}
