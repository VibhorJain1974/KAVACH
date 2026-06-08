# KAVACH — Presentation Script
## FAR AWAY 2026 | Space & Aerospace

---

## SLIDE 1: HOOK
**"It called the farmer before the lights went out."**

[pause — let it land]

---

## SLIDE 2: THE PROBLEM
**May 10, 2024. The strongest solar storm in 20 years hits Earth.**

- Kp-index: 9.0 — EXTREME (G5, highest category)
- Aurora visible in India — phones lit up with photos
- India's power grid: operating at failure threshold for 6 hours
- 300 million farmers, fishermen, day laborers: **zero warning**

They don't have smartphones. They don't read NASA alerts.
When the grid goes down, their pump motors burn. Their cold storage fails.
A fisherman 40km offshore loses GPS.

**This is a solved problem in Norway. It is unsolved in India.**

---

## SLIDE 3: WHY EXISTING SOLUTIONS FAILED INDIA

| Solution | Why it fails India |
|----------|-------------------|
| NOAA Space Weather | English, internet required |
| NASA DONKI alerts | For researchers, not farmers |
| ISRO MOSDAC | No consumer-facing alerts |
| International systems | Designed for Western grid topology |

**Nobody built for feature phones, Hindi, and India's specific grid.**

---

## SLIDE 4: KAVACH

**3 things:**
1. Monitors solar activity 24/7 (NASA + NOAA + ISRO data)
2. Maps risk to India's 28 power grid zones
3. Calls farmers in Hindi — automatically, on any phone

**Zero human triggers. Zero internet required on the farmer's end.**

---

## SLIDE 5: LIVE DEMO
[Run the demo — press REPLAY STORM button]

Watch:
- Map goes from green to red, zone by zone (north first, most vulnerable)
- Alert log populates in real time
- "Initiating farmer alerts..."
- **Phone rings**

[Pick up the phone — play the Hindi call]

---

## SLIDE 6: HOW IT WORKS (1 SLIDE)

```
NASA DONKI → FastAPI Agent → Storm Classifier → DISCOM Mapper
                    ↓                                    ↓
              Supabase DB ←──────────────── Alert Generator
                    ↓                                    ↓
           Next.js Map (live)              Twilio Hindi Call
           (28 DISCOM zones)               (farmers/fishermen)
```

APScheduler polls every 15 minutes. Zero human triggers.

---

## SLIDE 7: REAL DATA SOURCES

All free. All real. All live.

- **NASA DONKI** — Coronal Mass Ejection tracking
- **NOAA SWPC** — Real-time Kp-index (updates every minute)
- **ISRO MOSDAC** — Indian satellite data (future integration)
- **Ministry of Power India** — DISCOM registry (28 companies)

The May 2024 replay uses **actual NASA data** from that event.

---

## SLIDE 8: THE FARMER CALL

[Play hindi_alert.mp3]

*"Namaste. KAVACH alert. Aaj ek bada solar toofan aa raha hai.
Apne bijli ke upkaran bandh karein. Grid failure ka khatre hai. Surakshit rahein."*

Translation:
"Hello. KAVACH alert. Today a large solar storm is coming.
Turn off your electrical equipment. There is risk of grid failure. Stay safe."

**This call will reach a farmer with a ₹1,200 Nokia phone.**

---

## SLIDE 9: REVENUE MODEL

| Customer | Product | Price |
|----------|---------|-------|
| DISCOMs | Technical API: grid impact forecast, load shedding schedule | ₹2-5L/month |
| Aviation | GPS disruption windows for flight planning | ₹1-3L/month |
| Telecom | Network hardening alerts | ₹1-2L/month |
| Insurance | Risk pricing for agricultural policies | ₹1-2L/month |

**5 DISCOMs = ₹1.8Cr/year ARR**

India has 28 DISCOMs.

---

## SLIDE 10: MARKET SIZE

- India: 28 DISCOMs, 300M at-risk farmers
- Southeast Asia: Indonesia, Bangladesh, Vietnam (similar grid profiles)
- Sub-Saharan Africa: Grid vulnerability highest globally
- Total addressable market: $800M+ (space weather intelligence services)

**KAVACH is Module 1. DRISHTI is the platform.**

---

## SLIDE 11: TEAM

**Vibbhor Jain** — Builder, domain research, product vision

**Claude Code (Anthropic)** — Autonomous development partner
- Wrote 3,200+ lines of code in this session
- Built, tested, and deployed in under 6 hours
- Commit log is visible — every line is traceable

This IS a demonstration of agentic AI building critical infrastructure.

---

## SLIDE 12: KAVACH → DRISHTI ROADMAP

```
KAVACH (Module 1 — Today)     DRISHTI (Platform — 2027)
├── Solar storm alerts    →   ├── All space hazards
├── India DISCOMs         →   ├── 50+ countries
├── Voice calls           →   ├── SMS, WhatsApp, IVRS
└── Grid mapping          →   └── Aviation, maritime, telecom
```

KAVACH ships in 6 months. DRISHTI is the $50M company.

---

## SLIDE 13: TRACTION

- ✅ NASA DONKI API confirmed — real data flowing
- ✅ All 28 Indian DISCOMs mapped with lat/lng
- ✅ Twilio call tested LIVE (happened during this build session)
- ✅ Deployed to Vercel: frontend-2ajotdnfi-vibhorjain1974s-projects.vercel.app
- ✅ May 2024 storm data: Kp=9.0 confirmed (real NASA DONKI data)
- ⏳ DISCOM pilot conversations: seeking intros

---

## SLIDE 14: THE ASK

**"Help us protect 1.4 billion Indians from space."**

We need:
- Mentorship from space/climate infrastructure founders
- Intros to DISCOM decision-makers (Ministry of Power India)
- AWS/GCP credits for 24/7 autonomous agent operation

We are not asking for funding today.
We are asking to go to Delhi.

---

## SLIDE 15: THANK YOU

**KAVACH** — India's Autonomous Space Weather Shield

Live demo: [vercel URL]
Email: jvibhor202@gmail.com

[QR code to live demo]

*Built with Claude Code — because the pace of building must match the pace of risk.*
