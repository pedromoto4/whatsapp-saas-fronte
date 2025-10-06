from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import firebase_admin
from firebase_admin import credentials
import json
import os
from dotenv import load_dotenv

from app.database import create_tables
from app.models import User
from app.schemas import UserResponse
from app.dependencies import get_current_user, get_db
from app.routers import contacts, campaigns, messages

load_dotenv()

# Initialize Firebase Admin (optional for Railway)
firebase_creds_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "{}")
try:
    firebase_creds = json.loads(firebase_creds_str)
    if firebase_creds and firebase_creds.get("type") == "service_account":
        cred = credentials.Certificate(firebase_creds)
        firebase_admin.initialize_app(cred)
except (json.JSONDecodeError, ValueError):
    print("Warning: Firebase credentials not properly configured")

app = FastAPI(
    title="WhatsApp SaaS API",
    description="API para o sistema de automação de vendas via WhatsApp",
    version="1.0.0"
)

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

# Add Vercel domain if not already included
vercel_domain = "https://whatsapp-saas-fronte.vercel.app"
if vercel_domain not in origins:
    origins.append(vercel_domain)

# In production, you might want to allow all origins (be careful!)
# origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(contacts.router)
app.include_router(campaigns.router)
app.include_router(messages.router)

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    await create_tables()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "WhatsApp SaaS API is running on Railway"}

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": "WhatsApp SaaS API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@app.get("/api/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID (only own profile for now)"""
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    from app.crud import get_user_by_id
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)