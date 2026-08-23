import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

from routers import storms, alerts, demo, shield, aurora, memory, fusion, operator, ionosphere, imagery
from agents.donki_agent import poll_donki
from agents.alert_agent import check_kp_threshold_and_alert, DEMO_PHONE
from services.db import get_client

app = FastAPI(title="KAVACH API", version="1.0.0", description="Autonomous space weather shield for India")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(storms.router)
app.include_router(alerts.router)
app.include_router(demo.router)
app.include_router(shield.router)
app.include_router(aurora.router)
app.include_router(memory.router)
app.include_router(fusion.router)
app.include_router(operator.router)
app.include_router(ionosphere.router)
app.include_router(imagery.router)

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    poll_interval = int(os.getenv("POLL_INTERVAL_MINUTES", 15))
    supabase = get_client()
    scheduler.add_job(
        poll_donki, "interval", minutes=poll_interval, id="donki_poll",
        kwargs={"supabase_client": supabase},
    )
    scheduler.add_job(
        check_kp_threshold_and_alert, "interval", minutes=5, id="noaa_poll",
        kwargs={"supabase_client": supabase, "call_phone": DEMO_PHONE},
    )
    scheduler.start()
    print("KAVACH backend started - autonomous monitoring active")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

@app.get("/")
async def root():
    return {
        "service": "KAVACH",
        "tagline": "It called the farmer before the lights went out",
        "status": "operational",
        "endpoints": ["/storm/current", "/storm/live-now", "/storm/may2024", "/alerts/discoms", "/demo/replay", "/demo/trigger-call", "/fusion/status"],
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
