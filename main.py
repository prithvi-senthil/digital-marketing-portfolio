from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# MongoDB Connection (uses standard local or environment URI)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.pixelroot_db
applications_collection = db.applications
visitors_collection = db.visitors

# Pydantic model for application form validation
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
        
        # Insert into MongoDB
        result = await applications_collection.insert_one(application_data)
        
        return {
            "status": "success",
            "message": "Application submitted successfully",
            "id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/track-visit")
async def track_visit():
    try:
        # Simple tracking of site inspection/visits
        await visitors_collection.insert_one({
            "visited_at": datetime.utcnow()
        })
        return {"status": "tracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)