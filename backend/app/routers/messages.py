from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_db, get_current_user
from app.models import User
from app.schemas import MessageResponse, MessageCreate, MessageListResponse
from app.crud import create_message, get_messages_by_contact, get_messages_by_campaign

router = APIRouter(prefix="/api/messages", tags=["messages"])

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_new_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new message"""
    # TODO: Add validation to ensure contact belongs to current user
    return await create_message(db, message)

@router.get("/contact/{contact_id}", response_model=MessageListResponse)
async def get_contact_messages(
    contact_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a specific contact"""
    messages = await get_messages_by_contact(db, contact_id, current_user.id, skip, limit)
    return MessageListResponse(messages=messages, total=len(messages))

@router.get("/campaign/{campaign_id}", response_model=MessageListResponse)
async def get_campaign_messages(
    campaign_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a specific campaign"""
    messages = await get_messages_by_campaign(db, campaign_id, current_user.id, skip, limit)
    return MessageListResponse(messages=messages, total=len(messages))