"""Notification service — SMS via Twilio (with mock mode for development)."""

import os
import logging

logger = logging.getLogger(__name__)

MOCK_TWILIO = os.getenv("MOCK_TWILIO", "true").lower() == "true"

if not MOCK_TWILIO:
    from twilio.rest import Client

    twilio_client = Client(
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
    )
    TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER")


def send_sms(to_phone: str, message: str) -> dict:
    """Send an SMS to the patient."""
    if MOCK_TWILIO:
        logger.info(f"[MOCK SMS] To: {to_phone}\n{message}")
        return {"status": "mock_sent", "to": to_phone, "body": message}

    msg = twilio_client.messages.create(
        body=message,
        from_=TWILIO_FROM,
        to=to_phone,
    )
    return {"status": msg.status, "sid": msg.sid, "to": to_phone}


def send_provider_email(provider_email: str, subject: str, body: str) -> dict:
    """Send provider summary email. MVP: log it (real SMTP integration is straightforward to add)."""
    logger.info(f"[PROVIDER EMAIL] To: {provider_email}\nSubject: {subject}\n\n{body}")
    return {"status": "logged", "to": provider_email, "subject": subject}
