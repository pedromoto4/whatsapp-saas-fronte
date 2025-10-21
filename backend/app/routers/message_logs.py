"""
Message Logs Router
Handles message logs endpoints for analytics and history
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import MessageLogResponse
from app.crud import get_message_logs, get_message_logs_by_phone, get_message_logs_stats

router = APIRouter(prefix="/api/message-logs", tags=["Message Logs"])

@router.get("/", response_model=List[MessageLogResponse])
async def get_logs_endpoint(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get message logs for current user"""
    logs = await get_message_logs(db, current_user.id, limit, offset)
    return [MessageLogResponse.from_orm(log) for log in logs]

@router.get("/phone/{phone_number}", response_model=List[MessageLogResponse])
async def get_logs_by_phone_endpoint(
    phone_number: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get message logs for a specific phone number"""
    logs = await get_message_logs_by_phone(db, current_user.id, phone_number, limit)
    return [MessageLogResponse.from_orm(log) for log in logs]

@router.get("/stats")
async def get_logs_stats_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get message logs statistics"""
    stats = await get_message_logs_stats(db, current_user.id)
    return {
        "success": True,
        "stats": stats
    }

