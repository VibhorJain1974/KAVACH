# KAVACH — Autonomous Space Weather Shield for India

> "It called the farmer before the lights went out."

**FAR AWAY 2026 Hackathon** | Space & Aerospace | Built by Vibbhor Jain + Claude Code

---

## What It Does

When NASA detects a solar storm heading toward Earth, KAVACH autonomously:
1. Ingests real-time data from NASA DONKI + NOAA SWPC
2. Maps risk to India's 28 power grid regions (DISCOMs)  
3. Auto-calls farmers and fishermen in **Hindi** on basic feature phones
4. All without any human trigger — fully autonomous

**Demo:** Replays the real May 2024 solar storm (Kp=9.0, EXTREME). Map goes red, alerts fire, phone rings — in under 90 seconds.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + Mapbox GL JS |
| Backend | FastAPI + APScheduler |
| Database | Supabase (realtime) |
| Voice Calls | Twilio Programmable Voice (Hindi TTS) |
| Deploy | Vercel (frontend) + Railway (backend) |
| Data | NASA DONKI + NOAA SWPC + ISRO |

---

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

### Demo
1. Start backend (`uvicorn main:app`)
2. Start frontend (`npm run dev`)
3. Open http://localhost:3000
4. Click **REPLAY STORM** — watch it run autonomously

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| GET | `/storm/current` | Live Kp-index from NOAA |
| GET | `/storm/may2024` | Saved May 2024 storm data |
| GET | `/alerts/discoms` | All 28 DISCOMs with risk levels |
| POST | `/demo/replay` | SSE stream — replay May 2024 storm |
| POST | `/demo/trigger-call` | Fire Hindi Twilio call to demo phone |

---

## The May 2024 Storm

On May 10-11, 2024, the strongest geomagnetic storm in 20 years hit Earth:
- Kp-index reached **9.0** (EXTREME — G5 level)
- India's power grid came within hours of widespread failure
- 300 million farmers and fishermen received **zero warning**
- KAVACH would have called them 6 hours in advance

---

## Revenue Model

- Free: public alerts for Indian citizens
- Paid API: India's 28 DISCOMs — ₹2-5L/month each
- 5 DISCOMs = ₹1.8Cr/year ARR
- Future: aviation, telecom, insurance APIs

---

## Architecture

```
NASA DONKI ──┐
NOAA SWPC  ──┼──► FastAPI Agent ──► Storm Classifier ──► DISCOM Mapper
ISRO MOSDAC─┘         │                                        │
                       ▼                                        ▼
                 Supabase DB ◄──────────────────────── Alert Generator
                       │                                        │
                       ▼                                        ▼
                Next.js Map ◄── Realtime Sub        Twilio Hindi Call
                (28 zones)                          (farmers/fishermen)
```

---

Built with Claude Code as autonomous development partner.
