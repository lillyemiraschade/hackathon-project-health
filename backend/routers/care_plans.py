from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CarePlan, Patient, AuditLog
from schemas import CarePlanCreate, CarePlanOut
from services.care_plan import parse_care_plan
from services.translation import translate_care_plan
from services.scheduler import generate_check_in_schedule

router = APIRouter(prefix="/api/care-plans", tags=["care-plans"])


@router.post("/", response_model=CarePlanOut)
def create_care_plan(plan: CarePlanCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == plan.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Parse the visit notes into structured care plan
    parsed = parse_care_plan(plan.original_text)

    # Translate into patient's language
    translated = None
    if patient.language != "en":
        translated = translate_care_plan(parsed, patient.language, patient.dialect)

    db_plan = CarePlan(
        patient_id=plan.patient_id,
        original_text=plan.original_text,
        parsed_plan=parsed,
        translated_plan=translated,
        visit_date=plan.visit_date,
        provider_name=plan.provider_name,
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    # Generate check-in schedule
    generate_check_in_schedule(db, db_plan)

    # Audit log
    db.add(AuditLog(
        action="care_plan_created",
        entity_type="care_plan",
        entity_id=db_plan.id,
        details={"patient_id": patient.id, "language": patient.language},
        model_version="claude-sonnet-4-20250514",
    ))
    db.commit()

    return db_plan


@router.get("/{plan_id}", response_model=CarePlanOut)
def get_care_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(CarePlan).filter(CarePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Care plan not found")
    return plan


@router.get("/patient/{patient_id}", response_model=list[CarePlanOut])
def get_patient_care_plans(patient_id: int, db: Session = Depends(get_db)):
    return db.query(CarePlan).filter(
        CarePlan.patient_id == patient_id, CarePlan.active == True
    ).all()
