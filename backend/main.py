from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import firebase_admin
from firebase_admin import credentials
import json
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime

from app.database import create_tables
from app.models import User, FAQ, Catalog, MessageLog, Template
from app.schemas import UserResponse
from app.dependencies import get_current_user, get_db
from app.routers import contacts, campaigns, messages, whatsapp, faqs, catalog, message_logs, templates, conversations, settings

load_dotenv()

# Initialize Firebase Admin (optional)
firebase_creds_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "{}")
try:
    firebase_creds = json.loads(firebase_creds_str)
    if firebase_creds and firebase_creds.get("type") == "service_account":
        cred = credentials.Certificate(firebase_creds)
        firebase_admin.initialize_app(cred)
except (json.JSONDecodeError, ValueError):
    pass  # Firebase not configured

app = FastAPI(
    title="WhatsApp SaaS API",
    description="API para o sistema de automação de vendas via WhatsApp",
    version="1.0.1"  # Force rebuild without HTTPS redirect middleware
)

# Cleanup old files on startup (files older than 90 days)
from app.routers.whatsapp import cleanup_old_files
cleanup_old_files(days_old=90)

# Background task for automatic cleanup
async def periodic_cleanup():
    """
    Run cleanup every 24 hours (86400 seconds)
    """
    while True:
        await asyncio.sleep(86400)  # Wait 24 hours
        print(f"[{datetime.now()}] Starting automatic cleanup...")
        cleanup_old_files(days_old=90)
        print(f"[{datetime.now()}] Cleanup complete!")

def start_background_task():
    """
    Start background task for automatic cleanup
    """
    asyncio.create_task(periodic_cleanup())
    print("[STARTUP] Background cleanup task started (runs every 24 hours)")

# CORS Configuration - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include API routers
app.include_router(contacts.router)
app.include_router(campaigns.router)
app.include_router(messages.router)
app.include_router(faqs.router)
app.include_router(catalog.router)
app.include_router(message_logs.router)
app.include_router(templates.router)
app.include_router(conversations.router)
app.include_router(whatsapp.router)
app.include_router(settings.router)

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    try:
        await create_tables()
    except Exception:
        pass  # Continue even if DB setup fails

@app.on_event("startup")
async def startup_event():
    """Startup event - initialize background tasks"""
    start_background_task()

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("[SHUTDOWN] Background cleanup task stopped")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "WhatsApp SaaS API is running on Railway"}

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    firebase_configured = False
    try:
        # Check if Firebase is initialized
        firebase_admin.get_app()
        firebase_configured = True
    except ValueError:
        firebase_configured = False
    
    return {
        "status": "healthy",
        "service": "WhatsApp SaaS API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "firebase_configured": firebase_configured,
        "database_configured": bool(os.getenv("DATABASE_URL"))
    }

@app.get("/api/test")
async def test_endpoint():
    """Test endpoint without authentication"""
    return {
        "message": "API is working!",
        "timestamp": "2025-10-07",
        "authenticated": False
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