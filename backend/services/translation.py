"""Translation service using Claude API with clinical context."""
from __future__ import annotations

import json
import anthropic
import os
from datetime import datetime, timezone

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

LANGUAGE_NAMES = {
    "es": "Spanish",
    "zh": "Mandarin Chinese",
    "vi": "Vietnamese",
    "ar": "Arabic",
    "ht": "Haitian Creole",
    "en": "English",
}

DIALECT_CONTEXT = {
    "es": {
        "mexican": "Use Mexican Spanish vocabulary and phrasing.",
        "caribbean": "Use Caribbean Spanish vocabulary and phrasing.",
        "central_american": "Use Central American Spanish vocabulary and phrasing.",
    },
    "zh": {
        "simplified": "Use Simplified Chinese characters.",
        "traditional": "Use Traditional Chinese characters.",
    },
    "ar": {
        "levantine": "Use Levantine Arabic dialect.",
        "egyptian": "Use Egyptian Arabic dialect.",
        "msa": "Use Modern Standard Arabic.",
    },
}


def translate_care_plan(parsed_plan: dict, target_language: str, dialect: str | None = None) -> dict:
    """Translate a structured care plan into the target language at a 6th-grade reading level."""
    lang_name = LANGUAGE_NAMES.get(target_language, target_language)
    dialect_instruction = ""
    if dialect and target_language in DIALECT_CONTEXT:
        dialect_instruction = DIALECT_CONTEXT[target_language].get(dialect, "")

    prompt = f"""Translate the following structured medical care plan into {lang_name}.

Rules:
- Write at a 6th-grade reading level in {lang_name}
- Use simple, clear language that a patient with limited formal education can understand
- Keep medical terms but add a simple explanation in parentheses
- {dialect_instruction}
- Preserve the exact JSON structure — only translate the string values
- Do NOT translate field names (keys), only values
- Add "[AI-translated]" prefix to each translated medication instruction

Input care plan (JSON):
{json.dumps(parsed_plan, indent=2)}

Return the translated JSON only, no other text."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())


def translate_text(text: str, source_language: str, target_language: str) -> str:
    """Translate a single text string between languages."""
    source_name = LANGUAGE_NAMES.get(source_language, source_language)
    target_name = LANGUAGE_NAMES.get(target_language, target_language)

    response = client.messages.create(
        model="claude-haiku-3-5-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"Translate the following from {source_name} to {target_name}. "
                f"Use simple, clear language. Return only the translation.\n\n{text}",
            }
        ],
    )
    return response.content[0].text.strip()


def generate_check_in_message(
    check_in_type: str,
    goal: str,
    patient_name: str,
    provider_name: str,
    language: str,
    dialect: str | None = None,
    care_plan_context: dict | None = None,
) -> str:
    """Generate a conversational check-in message in the patient's language."""
    lang_name = LANGUAGE_NAMES.get(language, language)
    dialect_instruction = ""
    if dialect and language in DIALECT_CONTEXT:
        dialect_instruction = DIALECT_CONTEXT[language].get(dialect, "")

    prompt = f"""Generate a warm, conversational check-in message for a patient in {lang_name}.
{dialect_instruction}

Patient name: {patient_name}
Provider name: {provider_name}
Check-in type: {check_in_type}
Goal: {goal}

Rules:
- Speak directly to the patient using their name
- Reference the provider/clinic by name so the patient knows who this is from
- Be warm but focused — ask about the specific goal
- Write at a 6th-grade reading level
- Keep it to 2-3 sentences
- End with a simple yes/no or short-answer question
- Include "[AI-assisted message]" at the end

Return only the message text in {lang_name}."""

    response = client.messages.create(
        model="claude-haiku-3-5-20241022",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def analyze_patient_response(
    patient_message: str,
    language: str,
    check_in_goal: str,
    care_plan_context: dict | None = None,
    red_flags: list | None = None,
) -> dict:
    """Analyze a patient's response for clinical signals."""
    lang_name = LANGUAGE_NAMES.get(language, language)
    red_flags_text = json.dumps(red_flags or [], indent=2)

    prompt = f"""Analyze this patient response from a post-appointment check-in.

Patient's message (in {lang_name}): "{patient_message}"
Check-in goal: {check_in_goal}
Known red flags for this care plan: {red_flags_text}

Return a JSON object:
{{
  "english_translation": "accurate English translation",
  "adherence_confirmed": true/false/null,
  "symptoms_reported": ["list of symptoms mentioned"],
  "severity_estimate": 0-10 or null,
  "hedge_words_detected": number,
  "hedge_details": "description of hesitation or uncertainty",
  "red_flag_triggered": true/false,
  "red_flag_details": "which red flag and why, or null",
  "follow_up_needed": true/false,
  "follow_up_reason": "string or null",
  "suggested_provider_action": "string"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())
