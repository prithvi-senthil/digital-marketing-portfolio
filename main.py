from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
import motor.motor_asyncio
import os
from datetime import datetime

app = FastAPI(title="PixelRoot Digital API")

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
visitors_collection = db.visitors

# Mount static directories
app.mount("/assets", StaticFiles(directory="frontend/assets"), name="assets")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

class ApplicationSchema(BaseModel):
    name: str
    email: EmailStr
    biz: str
    service: str
    rev: str
    budget: str
    msg: str

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

async def track_visit():
    try:
        await visitors_collection.insert_one({
            "visited_at": datetime.utcnow()
        })
    except Exception as e:
        print(f"Tracking error: {e}")

# Serve the data.json file
@app.get("/data.json")
async def serve_data():
    return FileResponse("frontend/data.json")

# Serve the main HTML file at the root URL
@app.get("/")
async def serve_index():
    await track_visit()
    return FileResponse("frontend/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)