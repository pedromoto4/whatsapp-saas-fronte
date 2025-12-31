from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.ext.asyncio import AsyncSession
import firebase_admin
from firebase_admin import credentials
import json
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import logging

from app.database import create_tables
from app.models import User, FAQ, Catalog, MessageLog, Template
from app.schemas import UserResponse
from app.dependencies import get_current_user, get_db
from app.routers import contacts, campaigns, messages, whatsapp, faqs, catalog, message_logs, templates, conversations, settings, appointments, push_tokens
from app.storage import get_storage_service

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
app.include_router(appointments.router)
app.include_router(push_tokens.router)

# Exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure CORS headers are sent even on errors"""
    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.on_event("startup")
async def startup_event():
    """Startup event - create tables and initialize background tasks"""
    # Create database tables on startup
    try:
        await create_tables()
    except Exception:
        pass  # Continue even if DB setup fails
    
    # Initialize background tasks
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

@app.get("/api/storage/diagnostic")
async def storage_diagnostic():
    """Diagnostic endpoint to validate Railway Volume mounting"""
    from pathlib import Path
    import stat
    
    storage_service = get_storage_service()
    upload_dir = storage_service.get_upload_dir()
    
    # Check if directory exists
    dir_exists = upload_dir.exists()
    dir_path = str(upload_dir.absolute())
    
    # Check if it's writable
    is_writable = False
    write_error = None
    if dir_exists:
        try:
            # Try to create a test file
            test_file = upload_dir / ".test_write"
            test_file.write_text("test")
            test_file.unlink()
            is_writable = True
        except Exception as e:
            is_writable = False
            write_error = str(e)
    
    # Count files in directory
    file_count = 0
    file_list = []
    if dir_exists:
        try:
            files = list(upload_dir.iterdir())
            file_count = len(files)
            # List first 10 files
            file_list = [f.name for f in files[:10]]
        except Exception as e:
            file_list = [f"Error listing files: {str(e)}"]
    
    # Check if it's likely a mounted volume (starts with /data or /mnt)
    is_likely_volume = dir_path.startswith("/data") or dir_path.startswith("/mnt")
    
    # Check environment variables
    volume_mount_path = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "not set")
    storage_type = os.getenv("STORAGE_TYPE", "railway")
    
    result = {
        "status": "ok" if (dir_exists and is_writable) else "error",
        "storage_type": storage_type,
        "upload_directory": {
            "path": dir_path,
            "exists": dir_exists,
            "writable": is_writable,
            "is_likely_volume": is_likely_volume,
            "file_count": file_count,
            "sample_files": file_list
        },
        "environment": {
            "RAILWAY_VOLUME_MOUNT_PATH": volume_mount_path,
            "STORAGE_TYPE": storage_type
        },
        "public_url_base": storage_service.get_public_url("test.jpg").replace("/test.jpg", "")
    }
    
    if not dir_exists:
        result["error"] = f"Directory does not exist: {dir_path}"
    elif not is_writable:
        result["error"] = f"Directory is not writable: {write_error if write_error else 'Unknown error'}"
    
    return result

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