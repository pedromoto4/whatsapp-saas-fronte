from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_db, get_current_user
from app.models import User
from app.schemas import CampaignResponse, CampaignCreate, CampaignUpdate, CampaignListResponse
from app.crud import create_campaign, get_campaigns, get_campaign, update_campaign, delete_campaign

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_new_campaign(
    campaign: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new campaign"""
    return await create_campaign(db, campaign, current_user.id)

@router.get("/", response_model=CampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of campaigns for current user"""
    campaigns = await get_campaigns(db, current_user.id, skip, limit)
    return CampaignListResponse(campaigns=campaigns, total=len(campaigns))

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign_detail(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific campaign details"""
    campaign = await get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign_detail(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update campaign details"""
    campaign = await update_campaign(db, campaign_id, current_user.id, campaign_update)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return campaign

@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_endpoint(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a campaign"""
    success = await delete_campaign(db, campaign_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )