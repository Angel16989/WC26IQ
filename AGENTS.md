# WorldCupIQ Agent Rules

## Core Working Rules
- Work one task at a time.
- Keep changes small, focused, and reviewable.
- Avoid unrelated edits.
- Explain what changed and how to verify it.

## Product Rules
- Do not redesign the frontend.
- Do not add betting or gambling language.
- Use sports analytics language such as probability, confidence, expected goals, and likely scorers.
- Keep the product positioned as analytics and prediction support, not wagering.

## Architecture Rules
- Prefer clean architecture over fast messy code.
- Keep mock data easy to replace later with real datasets.
- Do not wire the future database draft into the running app yet.
- Ask before deeply integrating Void.
- Keep Void isolated unless specifically instructed.

## Change Boundaries
- Do not add production deployment setup unless requested.
- Do not add payments, full authentication, or unrelated infrastructure.
- Keep placeholder logic clearly marked when it is not production-ready.

## Agent Summary Rules
After every task make sure to add a summary of what you did in the format ofAGENTS_SUMMARY.md in the root of the project including the following:
- What you did
- How you did it
- What you changed
- How to verify it
- When did you do it

## Agent teaching style
Explain everything like I am a beginner.