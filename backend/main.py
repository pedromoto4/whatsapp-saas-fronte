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

# Initialize Firebase Admin
firebase_creds = json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON", "{}"))
if firebase_creds:
    cred = credentials.Certificate(firebase_creds)
    firebase_admin.initialize_app(cred)

app = FastAPI(
    title="WhatsApp SaaS API",
    description="API para o sistema de automação de vendas via WhatsApp",
    version="1.0.0"
)

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
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
    return {"message": "WhatsApp SaaS API is running"}

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
    uvicorn.run(app, host="0.0.0.0", port=8000)