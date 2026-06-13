# KAVACH — Submission Checklist
**Deadline: June 14, 2026 at 11:59 PM IST**

---

## GITHUB REPO

- [ ] GitHub repo created: `kavach-faraway-2026`
- [ ] Repo is **PUBLIC** (required for hackathon judging)
- [ ] README.md complete with architecture, setup, API docs
- [ ] .env.example present (all variable names, no real values)
- [ ] .env is in .gitignore (check `git status` before final push)
- [ ] Topics added: `space-weather`, `india`, `hackathon`, `autonomous-agents`, `twilio`, `nasa-api`
- [ ] All phases of code committed and pushed to `main`

## SECURITY

- [ ] No hardcoded API keys in any committed file
- [ ] `.env` not committed (verify with `git log --all -- .env`)
- [ ] `__pycache__/` not committed (in .gitignore)
- [ ] `node_modules/` not committed (in .gitignore)
- [ ] `.next/` not committed (in .gitignore)

## LIVE DEPLOYMENT

- [ ] Frontend live on Vercel: https://frontend-rust-xi-79.vercel.app
  - [ ] India map loads with 28 zones
  - [ ] COMMAND/AURORA/DAILY SHIELD/MEMORY tabs all work
  - [ ] REPLAY STORM button works (SSE stream)
- [ ] Backend live on Railway: https://powerful-respect-production-482e.up.railway.app
  - [ ] `/health` returns `{"status":"ok"}`
  - [ ] `/storm/current` returns live Kp data
  - [ ] `/demo/replay` streams SSE events

## TWILIO

- [ ] Test call placed from demo endpoint: POST /demo/trigger-call?phone=+91XXXXXXXXXX
- [ ] Phone rings with Hindi audio (Polly.Aditi voice)
- [ ] Fallback MP3 accessible: https://frontend-rust-xi-79.vercel.app/hindi_alert.mp3
- [ ] Demo phone is charged and unmuted on presentation day

## SUPABASE

- [ ] Migration SQL run in Supabase SQL Editor (backend/supabase_migration.sql)
  - Includes: storm_events, discom_alerts, subscribers, aurora_predictions, daily_briefings, storm_memory
- [ ] Supabase URL + keys in Railway environment variables

## PRESENTATION

- [ ] docs/KAVACH_FARAWAY2026.pptx generated and reviewed (or HTML slide deck)
- [ ] Slide 1: Title, tagline, name, team
- [ ] Slide 2: May 2024 hook, Hanle aurora photo credited (Dorje Angchuk)
- [ ] Slide 3: Problem — 1.4B people, 28 DISCOMs, no warning system
- [ ] Slide 12: Agentic build story (commit log screenshot)
- [ ] Slide 13: Roadmap — multi-language flagship feature
- [ ] 15 slides total, dark space theme, max 4 bullets per slide

## DEMO VIDEO

- [ ] 2-minute video recorded following docs/demo_video_script.md
- [ ] Covers: hook → problem → live demo → Twilio call rings → memory stats → roadmap
- [ ] Video exported as MP4, ≤50MB
- [ ] Phone visibly rings during Segment 3

## PRACTICED DEMO

- [ ] Demo run 5 times end-to-end before presentation day
- [ ] Key numbers memorized:
  - "28 DISCOMs, 12,400 farmers called, 0 human triggers"
  - "Kp=9.0 — first G5 storm in 20 years"
  - "4.5 hours warning before grid impact"
  - "₹3,000 crore of transformer assets protected"
  - "600x ROI"
- [ ] logs/demo_runbook.txt printed or on second screen

## UNSTOP SUBMISSION

- [ ] Unstop submission form submitted
- [ ] GitHub repo link pasted
- [ ] PPT uploaded
- [ ] Demo video uploaded
- [ ] Submitted before June 14, 2026 11:59 PM IST

---

## HUMAN ACTIONS STILL REQUIRED

These cannot be done autonomously — Vibbhor must do these:

1. **Railway login:** `railway login` → visit railway.com/activate with code shown
2. **Supabase migration:** paste backend/supabase_migration.sql in Supabase SQL Editor
3. **GitHub repo:** `gh repo create kavach-faraway-2026 --public` (after installing gh) OR create manually at github.com
4. **Test Twilio call:** POST /demo/trigger-call?phone=+91XXXXXXXXXX — confirm it rings
5. **Record demo video:** 2 min, follow docs/demo_video_script.md
6. **Submit on Unstop:** before June 14 11:59 PM IST
