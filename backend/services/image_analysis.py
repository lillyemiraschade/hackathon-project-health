"""Image analysis service using Claude's vision capability."""
from __future__ import annotations

import anthropic
import base64
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def analyze_image(image_base64: str, image_type: str, care_plan_context: dict | None = None) -> dict:
    """Analyze a patient-uploaded image using Claude vision.

    image_type: medication, symptom, device_reading
    """
    type_prompts = {
        "medication": _medication_prompt(care_plan_context),
        "symptom": _symptom_prompt(care_plan_context),
        "device_reading": _device_reading_prompt(),
    }

    prompt = type_prompts.get(image_type, "Describe what you see in this medical image.")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    interpretation = response.content[0].text
    return {
        "interpretation": interpretation,
        "disclaimer": "AI-generated interpretation. Must be reviewed by care team before clinical action.",
        "model": "claude-sonnet-4-20250514",
    }


def _medication_prompt(care_plan_context: dict | None) -> str:
    meds = ""
    if care_plan_context and "medications" in care_plan_context:
        meds = "\n".join(
            f"- {m['name']} {m.get('dosage', '')}: {m.get('pill_description', 'no description')}"
            for m in care_plan_context["medications"]
        )

    return f"""This is a photo of medication (pill or bottle) taken by a patient for verification.

Prescribed medications:
{meds}

Please:
1. Describe what you see (pill color, shape, markings, or bottle label).
2. If you can identify the medication, state what it appears to be.
3. Compare against the prescribed medications — does it match any of them?
4. Flag any concerns (wrong medication, wrong dosage visible on label).

IMPORTANT: This is an AI interpretation and must be verified by a pharmacist or provider. Do NOT tell the patient to take or stop taking any medication based on this analysis."""


def _symptom_prompt(care_plan_context: dict | None) -> str:
    symptoms = ""
    if care_plan_context and "symptoms_to_watch" in care_plan_context:
        symptoms = "\n".join(
            f"- {s['symptom']}" for s in care_plan_context["symptoms_to_watch"]
        )

    return f"""This is a photo of a symptom (wound, rash, swelling, etc.) uploaded by a patient.

Symptoms being monitored:
{symptoms}

Please describe:
1. What you observe (color, size estimate, texture, spread pattern).
2. Any visible changes that a provider should note.
3. Whether this appears to match any of the monitored symptoms.

IMPORTANT: This is an AI-generated description only. Do NOT diagnose. The care team will review this image directly."""


def _device_reading_prompt() -> str:
    return """This is a photo of a medical device reading (blood pressure cuff, glucometer, thermometer, pulse oximeter, etc.).

Please:
1. Identify the device type if possible.
2. Read the numeric values displayed.
3. State the units.

IMPORTANT: AI-generated reading. Must be verified by care team."""
