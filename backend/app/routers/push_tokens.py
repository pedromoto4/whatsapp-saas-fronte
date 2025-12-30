"""
Push Tokens Router
Handles push notification token registration and management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
import logging

from app.dependencies import get_current_user, get_db
from app.models import User, PushToken
from app.schemas import PushTokenCreate, PushTokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push-tokens", tags=["Push Tokens"])

@router.post("/", response_model=PushTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_push_token(
    token_data: PushTokenCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Register or update a push notification token for the current user
    """
    try:
        # Check if token already exists
        result = await db.execute(
            select(PushToken).where(PushToken.token == token_data.token)
        )
        existing_token = result.scalar_one_or_none()
        
        if existing_token:
            # Update existing token (e.g., if user logged in on same device)
            if existing_token.owner_id != current_user.id:
                # Token belongs to different user, update owner
                await db.execute(
                    update(PushToken)
                    .where(PushToken.id == existing_token.id)
                    .values(
                        owner_id=current_user.id,
                        platform=token_data.platform,
                        device_name=token_data.device_name,
                        is_active=True
                    )
                )
            else:
                # Same user, just update device info
                await db.execute(
                    update(PushToken)
                    .where(PushToken.id == existing_token.id)
                    .values(
                        platform=token_data.platform,
                        device_name=token_data.device_name,
                        is_active=True
                    )
                )
            await db.commit()
            await db.refresh(existing_token)
            logger.info(f"Updated push token for user {current_user.id}")
            return existing_token
        else:
            # Create new token
            db_token = PushToken(
                owner_id=current_user.id,
                token=token_data.token,
                platform=token_data.platform,
                device_name=token_data.device_name,
                is_active=True
            )
            db.add(db_token)
            await db.commit()
            await db.refresh(db_token)
            logger.info(f"Registered new push token for user {current_user.id}")
            return db_token
            
    except Exception as e:
        await db.rollback()
        logger.error(f"Error registering push token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register push token: {str(e)}"
        )

@router.get("/", response_model=List[PushTokenResponse])
async def get_push_tokens(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active push tokens for the current user
    """
    try:
        result = await db.execute(
            select(PushToken)
            .where(PushToken.owner_id == current_user.id, PushToken.is_active == True)
            .order_by(PushToken.created_at.desc())
        )
        tokens = result.scalars().all()
        return tokens
    except Exception as e:
        logger.error(f"Error getting push tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get push tokens: {str(e)}"
        )

@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_push_token(
    token_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete (deactivate) a push token
    """
    try:
        result = await db.execute(
            select(PushToken).where(
                PushToken.id == token_id,
                PushToken.owner_id == current_user.id
            )
        )
        token = result.scalar_one_or_none()
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push token not found"
            )
        
        # Soft delete by setting is_active to False
        await db.execute(
            update(PushToken)
            .where(PushToken.id == token_id)
            .values(is_active=False)
        )
        await db.commit()
        logger.info(f"Deactivated push token {token_id} for user {current_user.id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting push token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete push token: {str(e)}"
        )

