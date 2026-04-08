"""Care plan ingestion: parse English visit notes into structured care plan via Claude."""

import json
import anthropic
import os
from datetime import datetime, timezone

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PARSE_PROMPT = """You are a medical care plan parser. Extract structured information from the following visit notes.

Return a JSON object with these fields:
{
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string (e.g. 'once daily in the morning')",
      "duration": "string or null",
      "instructions": "string",
      "pill_description": "string (color, shape, markings if mentioned)"
    }
  ],
  "symptoms_to_watch": [
    {
      "symptom": "string",
      "severity_scale": "string (how to rate it)",
      "when_to_report": "string"
    }
  ],
  "red_flags": [
    {
      "condition": "string",
      "action": "string (what to do immediately)"
    }
  ],
  "follow_up_actions": [
    {
      "action": "string",
      "due_date": "string or null",
      "details": "string"
    }
  ],
  "lifestyle_changes": [
    {
      "change": "string",
      "details": "string"
    }
  ],
  "check_in_schedule": {
    "medication_reminders": ["list of times, e.g. '8:00 AM'"],
    "symptom_checks": ["list of intervals, e.g. '24h', '72h', '1 week'"],
    "follow_up_reminders": ["list of date-based reminders"]
  }
}

Be thorough. If information isn't in the notes, omit that field rather than guessing.

Visit notes:
"""


def parse_care_plan(visit_notes: str) -> dict:
    """Parse English visit notes into a structured care plan."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {"role": "user", "content": PARSE_PROMPT + visit_notes}
        ],
    )

    text = response.content[0].text
    # Extract JSON from response (handle markdown code blocks)
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())
