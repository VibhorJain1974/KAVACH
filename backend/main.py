import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

from routers import storms, alerts, demo
from agents.donki_agent import poll_donki
from agents.noaa_agent import fetch_current_kp

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

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    poll_interval = int(os.getenv("POLL_INTERVAL_MINUTES", 15))
    scheduler.add_job(poll_donki, "interval", minutes=poll_interval, id="donki_poll")
    scheduler.add_job(fetch_current_kp, "interval", minutes=5, id="noaa_poll")
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
        "endpoints": ["/storm/current", "/storm/may2024", "/alerts/discoms", "/demo/replay", "/demo/trigger-call"],
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
