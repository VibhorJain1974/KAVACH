from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class KpReading(BaseModel):
    observed_time: str
    kp_index: float
    source: str


class StormEvent(BaseModel):
    gst_id: str
    start_time: str
    max_kp: float
    severity: str  # green | yellow | red
    kp_readings: list[KpReading]
    source: str = "NASA_DONKI"


class DiscomZone(BaseModel):
    id: str
    name: str
    state: str
    region: str  # north | south | east | west | northeast | central
    lat: float
    lng: float
    risk_level: str = "green"
    affected: bool = False


class AlertRecord(BaseModel):
    id: Optional[str] = None
    storm_id: str
    alert_type: str  # discom | farmer | fisherman
    severity: str
    message: str
    affected_zones: list[str]
    created_at: Optional[str] = None
    call_status: Optional[str] = None


class DemoReplayRequest(BaseModel):
    phone_number: Optional[str] = None
    speed_multiplier: float = 1.0


class CallRequest(BaseModel):
    phone_number: str
    storm_severity: str = "red"
    max_kp: float = 9.0
