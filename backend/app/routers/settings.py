"""
Settings Router
Handles user settings/configuration endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from pydantic import BaseModel
import logging

from app.dependencies import get_current_user, get_db
from app.models import User

class AIEnabledUpdate(BaseModel):
    enabled: bool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("/ai-enabled")
async def get_ai_enabled(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current AI enabled status"""
    try:
        # Check if ai_enabled column exists
        from sqlalchemy import text
        
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' 
            AND column_name='ai_enabled'
        """)
        result = await db.execute(check_query)
        has_column = result.fetchone() is not None
        
        if not has_column:
            # Default to True if column doesn't exist
            return {"ai_enabled": True}
        
        # Get user's ai_enabled status (default to True if None)
        ai_enabled = getattr(current_user, 'ai_enabled', True)
        if ai_enabled is None:
            ai_enabled = True
            
        return {"ai_enabled": ai_enabled}
        
    except Exception as e:
        logger.error(f"Error getting AI enabled status: {e}")
        return {"ai_enabled": True}  # Default to enabled on error

@router.put("/ai-enabled")
async def update_ai_enabled(
    update_data: AIEnabledUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    enabled = update_data.enabled
    """Update AI enabled status"""
    try:
        # Check if ai_enabled column exists
        from sqlalchemy import text
        
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' 
            AND column_name='ai_enabled'
        """)
        result = await db.execute(check_query)
        has_column = result.fetchone() is not None
        
        if not has_column:
            # Create column if it doesn't exist
            alter_query = text("ALTER TABLE users ADD COLUMN ai_enabled BOOLEAN DEFAULT TRUE")
            await db.execute(alter_query)
            await db.commit()
            logger.info("Created ai_enabled column in users table")
        
        # Update user's ai_enabled status
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(ai_enabled=enabled)
        )
        await db.commit()
        
        logger.info(f"Updated AI enabled status for user {current_user.id}: {enabled}")
        
        return {"ai_enabled": enabled, "message": "AI setting updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating AI enabled status: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI setting: {str(e)}"
        )

