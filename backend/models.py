from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum


class Language(str, enum.Enum):
    SPANISH = "es"
    MANDARIN = "zh"
    VIETNAMESE = "vi"
    ARABIC = "ar"
    HAITIAN_CREOLE = "ht"
    ENGLISH = "en"


class CheckInStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"
    ESCALATED = "escalated"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    RED_FLAG = "red_flag"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    language = Column(String, nullable=False, default="es")
    dialect = Column(String, nullable=True)  # e.g. "mexican", "caribbean" for Spanish
    mrn = Column(String, unique=True, nullable=True)  # Medical Record Number
    provider_name = Column(String, nullable=True)
    provider_email = Column(String, nullable=True)
    caregiver_name = Column(String, nullable=True)
    caregiver_phone = Column(String, nullable=True)
    preferred_channel = Column(String, default="sms")  # sms, voice, web
    consented_at = Column(DateTime, nullable=True)
    opted_out = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    care_plans = relationship("CarePlan", back_populates="patient")
    check_ins = relationship("CheckIn", back_populates="patient")


class CarePlan(Base):
    __tablename__ = "care_plans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    original_text = Column(Text, nullable=False)  # English original
    parsed_plan = Column(JSON, nullable=False)  # Structured care plan
    translated_plan = Column(JSON, nullable=True)  # Translated version
    visit_date = Column(DateTime, nullable=True)
    provider_name = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="care_plans")
    check_ins = relationship("CheckIn", back_populates="care_plan")
    scheduled_reminders = relationship("ScheduledReminder", back_populates="care_plan")


class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="scheduled")
    check_in_type = Column(String, nullable=False)  # medication, symptom, follow_up
    goal = Column(Text, nullable=True)  # What this check-in is trying to confirm
    messages = Column(JSON, default=list)  # Conversation messages
    patient_response = Column(Text, nullable=True)
    translated_response = Column(Text, nullable=True)  # English translation
    hedge_count = Column(Integer, default=0)
    flags = Column(JSON, default=list)
    severity = Column(String, default="info")
    provider_summary = Column(Text, nullable=True)
    provider_reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="check_ins")
    care_plan = relationship("CarePlan", back_populates="check_ins")
    images = relationship("CheckInImage", back_populates="check_in")


class CheckInImage(Base):
    __tablename__ = "check_in_images"

    id = Column(Integer, primary_key=True, index=True)
    check_in_id = Column(Integer, ForeignKey("check_ins.id"), nullable=False)
    image_path = Column(String, nullable=False)
    image_type = Column(String, nullable=False)  # medication, symptom, device_reading
    ai_interpretation = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    check_in = relationship("CheckIn", back_populates="images")


class ScheduledReminder(Base):
    __tablename__ = "scheduled_reminders"

    id = Column(Integer, primary_key=True, index=True)
    care_plan_id = Column(Integer, ForeignKey("care_plans.id"), nullable=False)
    reminder_type = Column(String, nullable=False)  # medication, symptom_check, follow_up
    description = Column(Text, nullable=True)
    schedule_cron = Column(String, nullable=True)  # Cron expression
    next_run = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    care_plan = relationship("CarePlan", back_populates="scheduled_reminders")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    model_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
