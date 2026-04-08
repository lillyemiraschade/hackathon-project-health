"""Scheduling service for check-ins and reminders."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models import CarePlan, CheckIn, ScheduledReminder


def generate_check_in_schedule(db: Session, care_plan: CarePlan) -> list[CheckIn]:
    """Generate check-in records based on the parsed care plan."""
    parsed = care_plan.parsed_plan
    check_ins = []
    now = datetime.now(timezone.utc)
    visit_date = care_plan.visit_date or now

    # Medication check-ins: daily for 7 days
    if parsed.get("medications"):
        med_names = ", ".join(m["name"] for m in parsed["medications"])
        for day in range(1, 8):
            ci = CheckIn(
                patient_id=care_plan.patient_id,
                care_plan_id=care_plan.id,
                scheduled_at=visit_date + timedelta(days=day, hours=9),  # 9am
                status="scheduled",
                check_in_type="medication",
                goal=f"Confirm patient took prescribed medications: {med_names}",
            )
            check_ins.append(ci)
            db.add(ci)

    # Symptom check-ins: 24h, 72h, 1 week post-visit
    if parsed.get("symptoms_to_watch"):
        symptom_names = ", ".join(s["symptom"] for s in parsed["symptoms_to_watch"])
        for hours in [24, 72, 168]:
            ci = CheckIn(
                patient_id=care_plan.patient_id,
                care_plan_id=care_plan.id,
                scheduled_at=visit_date + timedelta(hours=hours),
                status="scheduled",
                check_in_type="symptom",
                goal=f"Check on symptoms: {symptom_names}",
            )
            check_ins.append(ci)
            db.add(ci)

    # Follow-up action reminders
    for action in parsed.get("follow_up_actions", []):
        ci = CheckIn(
            patient_id=care_plan.patient_id,
            care_plan_id=care_plan.id,
            scheduled_at=now + timedelta(days=3),  # Default to 3 days if no date
            status="scheduled",
            check_in_type="follow_up",
            goal=f"Remind about: {action['action']}",
        )
        check_ins.append(ci)
        db.add(ci)

    db.commit()
    return check_ins


def get_due_check_ins(db: Session) -> list[CheckIn]:
    """Get all check-ins that are due now."""
    now = datetime.now(timezone.utc)
    return (
        db.query(CheckIn)
        .filter(
            CheckIn.status == "scheduled",
            CheckIn.scheduled_at <= now,
        )
        .all()
    )


def get_missed_check_ins(db: Session, hours_threshold: int = 4) -> list[CheckIn]:
    """Get check-ins that were scheduled but never completed."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_threshold)
    return (
        db.query(CheckIn)
        .filter(
            CheckIn.status == "scheduled",
            CheckIn.scheduled_at <= cutoff,
        )
        .all()
    )
