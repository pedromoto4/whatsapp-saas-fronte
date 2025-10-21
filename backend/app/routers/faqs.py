"""
FAQ Router
Handles FAQ management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import FAQCreate, FAQUpdate, FAQResponse
from app.crud import create_faq, get_faqs, get_faq, update_faq, delete_faq

router = APIRouter(prefix="/api/faqs", tags=["FAQs"])

@router.post("/", response_model=FAQResponse)
async def create_faq_endpoint(
    faq_data: FAQCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new FAQ"""
    faq = await create_faq(db, faq_data, current_user.id)
    return FAQResponse.from_orm(faq)

@router.get("/", response_model=List[FAQResponse])
async def get_faqs_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all FAQs for current user"""
    faqs = await get_faqs(db, current_user.id)
    return [FAQResponse.from_orm(faq) for faq in faqs]

@router.get("/{faq_id}", response_model=FAQResponse)
async def get_faq_endpoint(
    faq_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific FAQ"""
    faq = await get_faq(db, faq_id, current_user.id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return FAQResponse.from_orm(faq)

@router.put("/{faq_id}", response_model=FAQResponse)
async def update_faq_endpoint(
    faq_id: int,
    faq_update: FAQUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a FAQ"""
    faq = await update_faq(db, faq_id, current_user.id, faq_update)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return FAQResponse.from_orm(faq)

@router.delete("/{faq_id}")
async def delete_faq_endpoint(
    faq_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a FAQ"""
    success = await delete_faq(db, faq_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {"message": "FAQ deleted successfully"}
