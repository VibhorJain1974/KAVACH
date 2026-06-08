# KAVACH — Master Build Prompt for Claude Code
# Paste this into Claude Code in E:\FARAWAY to start the autonomous build

---

Use the feature-dev plugin. Read CLAUDE.md and task_plan.md first.

You are autonomously building KAVACH — India's space weather shield.
The council has spoken. The idea is locked. Build it.

WHAT YOU ARE BUILDING:
An autonomous system that monitors solar storms via NASA DONKI + NOAA SWPC + ISRO MOSDAC,
maps risk to India's 28 power grid zones, and auto-calls farmers in Hindi via Twilio.
The live demo replays the real May 2024 storm. The phone rings in the room. That is the moment.

YOUR BUILD SEQUENCE (follow task_plan.md exactly):
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

CRITICAL RULES:
1. Phase 0 first — confirm all APIs return real data before writing any app code
2. Phase 2 (Twilio) before Phase 3 (frontend) — the call is the product
3. After each phase gate, write findings.md with what was confirmed
4. If stuck 3+ attempts, write to blockers.md and move to next task
5. Use karpathy-guidelines — no overengineering, no unnecessary abstractions
6. Use frontend-design skill — dark space theme, Mapbox base, not bootstrap
7. Every feature must work end-to-end before marking done
8. The demo must run in under 90 seconds with zero keyboard input

START NOW with Phase 0, Task P0.1:
Hit this URL and confirm it returns JSON with May 2024 storm data:
https://api.nasa.gov/DONKI/GST?startDate=2024-05-08&endDate=2024-05-15&api_key=DEMO_KEY

Save the response to data/may2024_storm.json.
Then continue through Phase 0 tasks.
Do not stop. Do not ask for permission between tasks unless you hit a blocker.
