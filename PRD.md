# KAVACH — Product Requirements Document
**Version:** 1.0  
**Date:** June 2026  
**Owner:** Vibbhor Jain

---

## Problem Statement
India's 1.4 billion people are invisible to space weather. On May 10-11, 2024, the strongest 
geomagnetic storm in 20 years hit Earth. India's power grid came within hours of widespread 
failure. 300 million farmers and fishermen — whose livelihoods depend on electricity and GPS — 
received zero warning. Most don't own smartphones. Existing solutions (NOAA alerts, space 
weather websites) are designed for Western audiences in English, delivered via internet.

## Solution
KAVACH is an autonomous space weather intelligence system that bridges space data and India's 
last-mile population. It monitors solar activity 24/7 and — without any human trigger — maps 
the risk to India's power grid zones, aviation corridors, and GPS-dependent communities, then 
automatically calls them in Hindi on basic feature phones.

## Core User Stories
1. As a farmer in Bihar with no smartphone, I receive a voice call in Hindi warning me to 
   protect my pump motor before a solar storm damages the grid.
2. As a DISCOM operator in Maharashtra, I receive a technical API alert 6 hours before a 
   geomagnetic storm with projected Kp-index, affected grid zones, and recommended load 
   shedding schedules.
3. As a fisherman in Kerala, I receive an automated call warning me that GPS will be 
   unreliable for the next 18 hours.

## Non-Functional Requirements
- Demo must run end-to-end in under 90 seconds
- Zero mocked data — all APIs must return real data
- Twilio call must work on a real phone during the demo
- Frontend must load in under 3 seconds
- System must run autonomously with no human trigger
- Full offline fallback for demo day (local dataset)

## Out of Scope (v1.0)
- SMS alerts (Phase 2)
- WhatsApp integration (Phase 2)  
- DRISHTI hazard modules (separate roadmap)
- Hardware sensors
- Paid subscription management UI

## Success Metrics
- Demo completes without failure
- Judges hear the Hindi phone call live
- At least 1 judge asks "how do we invest in this?"
- Top 100 submission → Delhi round qualification
