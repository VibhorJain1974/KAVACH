# KAVACH — Autonomous Space Weather Shield for India

## Project Identity
**Name:** KAVACH (Hindi: Shield)  
**Tagline:** "It called the farmer before the lights went out."  
**Hackathon:** FAR AWAY 2026 — Space & Aerospace theme  
**Builder:** Vibbhor Jain (solo) + Claude Code (autonomous development partner)  
**Deadline:** June 14, 2026 at 11:59 PM IST  
**Goal:** Top 100 → Delhi → Tokyo

## What KAVACH Does
When NASA/NOAA detects a solar storm (Coronal Mass Ejection) heading toward Earth, KAVACH autonomously:
1. Ingests real-time space weather data (NASA DONKI + NOAA SWPC + ISRO MOSDAC)
2. Maps risk zones onto India's 28 power grid regions (DISCOMs)
3. Identifies affected GPS/aviation corridors over India
4. Auto-calls farmers and fishermen on basic feature phones in Hindi via Twilio
5. Sends alerts to DISCOM operators with technical grid impact data
6. All of this happens WITHOUT any human trigger

## The Wow Demo
Replay the real May 2024 solar storm (X-class, nearly damaged India's grid).
- Dataset is saved locally at /data/may2024_storm.json
- Demo sequence: data ingests → map lights red → Twilio call plays Hindi warning live
- Fallback: pre-recorded Hindi audio file if WiFi fails
- THIS HAS NEVER BEEN DONE BY ANY INDIAN TEAM

## Tech Stack
- **Frontend:** Next.js 14 + Mapbox GL JS (India grid overlay, real-time alerts)
- **Backend:** FastAPI + APScheduler (autonomous polling every 15 min)
- **Database:** Supabase (alert log, DISCOM registry, subscriber list)
- **Calls:** Twilio Programmable Voice (Hindi TTS + pre-recorded fallback)
- **Deployment:** Vercel (frontend) + Railway (backend agents)
- **Data:** NASA DONKI, NOAA SWPC, ISRO MOSDAC, ISRO VEDAS

## Data Sources (all free, all real)
- NASA DONKI CME: https://api.nasa.gov/DONKI/CME
- NASA DONKI Geomagnetic Storms: https://api.nasa.gov/DONKI/GST
- NOAA Space Weather: https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
- ISRO MOSDAC: https://mosdac.gov.in
- May 2024 storm archive: saved locally at data/may2024_storm.json

## Revenue Model
- Free: public alerts for citizens
- Paid API: India's 28 DISCOMs — ₹2-5L/month each
- 5 DISCOMs = ₹1.8Cr/year ARR
- Future: aviation, telecom, insurance APIs

## Pitch Angle
- Submit under: Space & Aerospace
- Mention in presentation: also demonstrates Agentic & Autonomous Systems
- Slide 12: KAVACH → DRISHTI roadmap (KAVACH is Module 1)
- The Claude Code build process IS a demo asset — show commit logs

## Autonomous Build Rules (for Claude Code)
1. Always read task_plan.md before starting any work
2. Write progress to findings.md after each completed feature
3. Write blockers to blockers.md — never get stuck for more than 3 attempts
4. Use karpathy-guidelines: no overengineering, surgical changes only
5. Use frontend-design skill: no generic layouts, no bootstrap defaults
6. Run tests after every feature before moving to next
7. Never mark a task done unless it actually works end-to-end
8. The Twilio call MUST work on demo day — test it first, ship it first

## Key Files
- task_plan.md — build sequence and task tracker
- findings.md — API confirmations and technical notes
- blockers.md — stuck points for human review
- PRD.md — full product requirements
- data/may2024_storm.json — local storm replay dataset

## Autonomous Loop Rules
- After completing any task, immediately start the next
- Never wait for human input unless hitting a blocker
- Check blockers.md before stopping — if blocker exists, 
  attempt 3 solutions before writing to blockers.md
- If credits run out mid-task, write exact state to 
  findings.md so next session resumes perfectly
- Always run: read CLAUDE.md → read task_plan.md → 
  check findings.md → check blockers.md → continue
