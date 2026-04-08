"""Provider dashboard API — summaries, alerts, and patient overview."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Patient, CarePlan, CheckIn
from schemas import ProviderSummary, CheckInOut, PatientOut, CarePlanOut

router = APIRouter(prefix="/api/provider", tags=["provider"])


@router.get("/dashboard")
def provider_dashboard(db: Session = Depends(get_db)):
    """Get overview for provider dashboard."""
    patients = db.query(Patient).filter(Patient.opted_out == False).all()

    summaries = []
    for patient in patients:
        care_plan = (
            db.query(CarePlan)
            .filter(CarePlan.patient_id == patient.id, CarePlan.active == True)
            .first()
        )
        recent = (
            db.query(CheckIn)
            .filter(CheckIn.patient_id == patient.id)
            .order_by(CheckIn.scheduled_at.desc())
            .limit(10)
            .all()
        )
        active_alerts = (
            db.query(CheckIn)
            .filter(
                CheckIn.patient_id == patient.id,
                CheckIn.severity == "red_flag",
                CheckIn.provider_reviewed == False,
            )
            .count()
        )

        # Adherence rate
        completed = [c for c in recent if c.status == "completed" and c.check_in_type == "medication"]
        total_med = [c for c in recent if c.check_in_type == "medication" and c.status != "scheduled"]
        adherence = len(completed) / len(total_med) if total_med else None

        summaries.append({
            "patient": patient,
            "care_plan": care_plan,
            "recent_check_ins": recent,
            "active_alerts": active_alerts,
            "adherence_rate": adherence,
        })

    return {"patients": summaries, "total_patients": len(patients)}


@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    """Get unreviewed red-flag alerts."""
    alerts = (
        db.query(CheckIn)
        .filter(
            CheckIn.severity == "red_flag",
            CheckIn.provider_reviewed == False,
        )
        .order_by(CheckIn.completed_at.desc())
        .all()
    )

    results = []
    for alert in alerts:
        patient = db.query(Patient).filter(Patient.id == alert.patient_id).first()
        results.append({
            "check_in": alert,
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "patient_phone": patient.phone if patient else None,
            "mrn": patient.mrn if patient else None,
        })

    return {"alerts": results, "count": len(results)}


@router.get("/patient/{patient_id}/timeline")
def patient_timeline(patient_id: int, db: Session = Depends(get_db)):
    """Get full check-in timeline for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    check_ins = (
        db.query(CheckIn)
        .filter(CheckIn.patient_id == patient_id)
        .order_by(CheckIn.scheduled_at.asc())
        .all()
    )

    care_plan = (
        db.query(CarePlan)
        .filter(CarePlan.patient_id == patient_id, CarePlan.active == True)
        .first()
    )

    return {
        "patient": patient,
        "care_plan": care_plan,
        "check_ins": check_ins,
    }


# ---------------------------------------------------------------------------
# Aggregate stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def provider_stats(db: Session = Depends(get_db)):
    """Return aggregate stats for the provider dashboard."""
    patients = db.query(Patient).filter(Patient.opted_out == False).all()
    total_patients = len(patients)

    active_patients = 0
    patients_on_track = 0
    patients_needing_attention = 0
    patients_with_alerts = 0
    language_counts: dict[str, int] = defaultdict(int)

    for patient in patients:
        language_counts[patient.language] += 1

        recent = (
            db.query(CheckIn)
            .filter(CheckIn.patient_id == patient.id)
            .order_by(CheckIn.scheduled_at.desc())
            .limit(10)
            .all()
        )

        has_activity = any(
            c.status in ("completed", "in_progress", "escalated") for c in recent
        )
        if has_activity:
            active_patients += 1

        has_red_flag = any(c.severity == "red_flag" for c in recent)
        completed_med = [c for c in recent if c.status == "completed" and c.check_in_type == "medication"]
        total_med = [c for c in recent if c.check_in_type == "medication" and c.status != "scheduled"]
        adherence = len(completed_med) / len(total_med) if total_med else 1.0

        if has_red_flag:
            patients_with_alerts += 1
        if not has_red_flag and adherence > 0.7:
            patients_on_track += 1
        else:
            patients_needing_attention += 1

    # Check-in totals
    total_checkins = db.query(func.count(CheckIn.id)).scalar() or 0
    completed_checkins = (
        db.query(func.count(CheckIn.id))
        .filter(CheckIn.status == "completed")
        .scalar() or 0
    )
    missed_checkins = (
        db.query(func.count(CheckIn.id))
        .filter(CheckIn.status == "missed")
        .scalar() or 0
    )
    actionable = completed_checkins + missed_checkins
    avg_response_rate = round(completed_checkins / actionable, 2) if actionable else 0.0

    # Recent check-ins by hour (today)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    todays_checkins = (
        db.query(CheckIn)
        .filter(
            CheckIn.completed_at != None,
            CheckIn.completed_at >= today_start,
        )
        .all()
    )
    hour_counts: dict[int, int] = defaultdict(int)
    for ci in todays_checkins:
        hour_counts[ci.completed_at.hour] += 1
    recent_checkins_by_hour = [
        {"hour": h, "count": hour_counts.get(h, 0)} for h in range(24)
    ]

    return {
        "total_patients": total_patients,
        "active_patients": active_patients,
        "patients_on_track": patients_on_track,
        "patients_needing_attention": patients_needing_attention,
        "patients_with_alerts": patients_with_alerts,
        "total_checkins": total_checkins,
        "completed_checkins": completed_checkins,
        "missed_checkins": missed_checkins,
        "avg_response_rate": avg_response_rate,
        "language_breakdown": dict(language_counts),
        "recent_checkins_by_hour": recent_checkins_by_hour,
    }


# ---------------------------------------------------------------------------
# Today's timeline
# ---------------------------------------------------------------------------

_TYPE_COLORS = {
    "medication": "#3B82F6",   # blue
    "symptom": "#F59E0B",      # amber
    "follow_up": "#10B981",    # green
}


@router.get("/timeline")
def provider_timeline(db: Session = Depends(get_db)):
    """Return today's scheduled events for the provider timeline view."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    checkins = (
        db.query(CheckIn)
        .filter(
            CheckIn.scheduled_at >= today_start,
            CheckIn.scheduled_at < today_end,
        )
        .order_by(CheckIn.scheduled_at.asc())
        .all()
    )

    events = []
    for ci in checkins:
        patient = db.query(Patient).filter(Patient.id == ci.patient_id).first()
        patient_name = (
            f"{patient.first_name} {patient.last_name}" if patient else "Unknown"
        )
        ci_type = ci.check_in_type or "follow_up"
        title_map = {
            "medication": "Medication Check-In",
            "symptom": "Symptom Check-In",
            "follow_up": "Follow-Up Check-In",
        }
        events.append({
            "time": ci.scheduled_at.isoformat(),
            "title": title_map.get(ci_type, ci_type.replace("_", " ").title() + " Check-In"),
            "subtitle": ci.goal or ci_type.replace("_", " ").title(),
            "color": _TYPE_COLORS.get(ci_type, "#6B7280"),
            "patient_name": patient_name,
            "type": ci_type,
            "status": ci.status,
        })

    return {"events": events, "count": len(events)}


# ---------------------------------------------------------------------------
# Enriched patient list
# ---------------------------------------------------------------------------

def _patient_status(recent_checkins: list, adherence: float | None) -> str:
    """Derive a display status from recent check-in data."""
    has_red = any(c.severity == "red_flag" for c in recent_checkins)
    if has_red:
        return "Alert"

    # No completed or in-progress check-ins at all → non-responsive
    responded = [c for c in recent_checkins if c.status in ("completed", "in_progress")]
    if not responded and recent_checkins:
        return "Non-Responsive"

    if adherence is not None and adherence <= 0.7:
        return "Needs Attention"

    return "On Track"


@router.get("/patients-enriched")
def patients_enriched(db: Session = Depends(get_db)):
    """Return the full patient list with derived status, adherence, and care details."""
    patients = db.query(Patient).filter(Patient.opted_out == False).all()

    results = []
    for patient in patients:
        # Latest active care plan
        care_plan = (
            db.query(CarePlan)
            .filter(CarePlan.patient_id == patient.id, CarePlan.active == True)
            .order_by(CarePlan.created_at.desc())
            .first()
        )

        # Recent check-ins
        recent = (
            db.query(CheckIn)
            .filter(CheckIn.patient_id == patient.id)
            .order_by(CheckIn.scheduled_at.desc())
            .limit(20)
            .all()
        )

        # Adherence
        completed_med = [c for c in recent if c.status == "completed" and c.check_in_type == "medication"]
        total_med = [c for c in recent if c.check_in_type == "medication" and c.status != "scheduled"]
        adherence = len(completed_med) / len(total_med) if total_med else None
        adherence_str = f"{len(completed_med)}/{len(total_med)} doses" if total_med else "No data"

        # Last check-in datetime
        last_completed = next(
            (c for c in recent if c.completed_at is not None),
            None,
        )
        last_checkin = last_completed.completed_at.isoformat() if last_completed else None

        # Condition from parsed_plan
        condition = None
        rx = None
        if care_plan and care_plan.parsed_plan:
            pp = care_plan.parsed_plan
            if isinstance(pp, dict):
                condition = pp.get("condition") or pp.get("diagnosis")
                meds = pp.get("medications") or pp.get("medication")
                if isinstance(meds, list):
                    rx = ", ".join(
                        m.get("name", str(m)) if isinstance(m, dict) else str(m)
                        for m in meds[:3]
                    )
                elif isinstance(meds, str):
                    rx = meds

        # Latest provider_summary excerpt
        observation = None
        latest_with_summary = next(
            (c for c in recent if c.provider_summary),
            None,
        )
        if latest_with_summary and latest_with_summary.provider_summary:
            obs = latest_with_summary.provider_summary
            observation = obs[:200] + "..." if len(obs) > 200 else obs

        has_alert = any(
            c.severity == "red_flag" and not c.provider_reviewed for c in recent
        )
        status = _patient_status(recent, adherence)

        # Serialize care plan for frontend
        care_plan_data = None
        if care_plan:
            care_plan_data = {
                "id": care_plan.id,
                "parsed_plan": care_plan.parsed_plan,
                "translated_plan": care_plan.translated_plan,
                "created_at": care_plan.created_at.isoformat() if care_plan.created_at else None,
                "provider_name": care_plan.provider_name,
            }

        # Serialize recent check-ins
        recent_data = [
            {
                "id": c.id,
                "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                "status": c.status,
                "check_in_type": c.check_in_type,
                "goal": c.goal,
                "severity": c.severity,
                "provider_reviewed": c.provider_reviewed,
            }
            for c in recent[:10]
        ]

        results.append({
            "patient": {
                "id": patient.id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "phone": patient.phone,
                "language": patient.language,
                "dialect": patient.dialect,
                "mrn": patient.mrn,
                "provider_name": patient.provider_name,
                "provider_email": patient.provider_email,
            },
            "status": status,
            "adherence": adherence_str,
            "last_checkin": last_checkin,
            "condition": condition,
            "rx": rx,
            "observation": observation,
            "has_alert": has_alert,
            "care_plan": care_plan_data,
            "recent_check_ins": recent_data,
        })

    return {"patients": results, "total": len(results)}
