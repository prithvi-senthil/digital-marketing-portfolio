import logging
import os
from datetime import datetime
from pathlib import Path

import motor.motor_asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="PixelRoot Digital API")
logger = logging.getLogger(__name__)

# Base directory setup for reliable path resolution on Windows/Linux
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.pixelroot_db
applications_collection = db.applications
leads_collection = db.leads
visitors_collection = db.visitors

# Mount static directories safely
css_dir = FRONTEND_DIR / "css"
js_dir = FRONTEND_DIR / "js"
assets_dir = FRONTEND_DIR / "assets"

if css_dir.exists():
    app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
if js_dir.exists():
    app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

class ApplicationSchema(BaseModel):
    name: str
    email: EmailStr
    biz: str
    service: str
    rev: str
    budget: str
    msg: str

class LeadSchema(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    business: str = Field(min_length=1, max_length=160)
    email: EmailStr
    phone: str = Field(pattern=r"^\+?(?:[0-9][ -]?){9,12}[0-9]$", max_length=26)
    location: str = Field(min_length=1, max_length=160)
    budget: str = Field(min_length=1, max_length=40)
    notes: str = Field(default="", max_length=5000)

@app.post("/api/apply")
async def submit_application(data: ApplicationSchema):
    try:
        application_data = data.dict()
        application_data["created_at"] = datetime.utcnow()
        result = await applications_collection.insert_one(application_data)
        return {
            "status": "success",
            "message": "Application submitted successfully",
            "id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lead")
async def submit_lead(data: LeadSchema):
    lead_data = data.model_dump()
    lead_data["created_at"] = datetime.utcnow()
    try:
        result = await leads_collection.insert_one(lead_data)
        return {
            "status": "success",
            "message": "Proposal request submitted successfully",
            "id": str(result.inserted_id)
        }
    except Exception as exc:
        logger.exception("Failed to store proposal request")
        raise HTTPException(
            status_code=500,
            detail="Unable to submit proposal request."
        ) from exc

async def track_visit():
    try:
        await visitors_collection.insert_one({
            "visited_at": datetime.utcnow()
        })
    except Exception as e:
        logger.warning("Visitor tracking skipped: %s", e)

# Serve data.json reliably
@app.get("/data.json")
async def serve_data():
    file_path = FRONTEND_DIR / "data.json"
    if file_path.exists():
        return FileResponse(file_path, media_type="application/json")
    raise HTTPException(status_code=404, detail="data.json not found")

# Serve contact.txt with UTF-8 decoding fallback
@app.get("/contact.txt", response_class=PlainTextResponse)
async def serve_contact_text():
    file_path = FRONTEND_DIR / "contact.txt"
    if file_path.exists():
        return file_path.read_text(encoding="utf-8")
    return "email=hello@pixelroot.in\nphone=+91 98765 43210\nlocation=Chennai / Ambattur, Tamil Nadu, India"

# Serve index.html
@app.get("/")
async def serve_index():
    await track_visit()
    index_path = FRONTEND_DIR / "index.html"
    return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)