from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Patient ---
class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str
    language: str = "es"
    dialect: Optional[str] = None
    mrn: Optional[str] = None
    provider_name: Optional[str] = None
    provider_email: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    preferred_channel: str = "sms"


class PatientOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    language: str
    dialect: Optional[str]
    mrn: Optional[str]
    provider_name: Optional[str]
    provider_email: Optional[str]
    caregiver_name: Optional[str]
    caregiver_phone: Optional[str]
    preferred_channel: str
    consented_at: Optional[datetime]
    opted_out: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Care Plan ---
class CarePlanCreate(BaseModel):
    patient_id: int
    original_text: str
    visit_date: Optional[datetime] = None
    provider_name: Optional[str] = None


class CarePlanOut(BaseModel):
    id: int
    patient_id: int
    original_text: str
    parsed_plan: dict
    translated_plan: Optional[dict]
    visit_date: Optional[datetime]
    provider_name: Optional[str]
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Check-in ---
class CheckInOut(BaseModel):
    id: int
    patient_id: int
    care_plan_id: int
    scheduled_at: datetime
    completed_at: Optional[datetime]
    status: str
    check_in_type: str
    goal: Optional[str]
    messages: list
    patient_response: Optional[str]
    translated_response: Optional[str]
    hedge_count: int
    flags: list
    severity: str
    provider_summary: Optional[str]
    provider_reviewed: bool
    images: list = []
    created_at: datetime

    class Config:
        from_attributes = True


class CheckInResponse(BaseModel):
    check_in_id: int
    message: str
    image_base64: Optional[str] = None
    image_type: Optional[str] = None


class ProviderReply(BaseModel):
    check_in_id: int
    message: str


# --- Provider Dashboard ---
class ProviderSummary(BaseModel):
    patient: PatientOut
    care_plan: Optional[CarePlanOut]
    recent_check_ins: List[CheckInOut]
    active_alerts: int
    adherence_rate: Optional[float]
