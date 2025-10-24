"""
Admin Database Router - Temporary endpoint to run database migrations manually
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/db", tags=["Admin"])

@router.post("/add-is-archived-column")
async def add_is_archived_column(db: AsyncSession = Depends(get_db)):
    """
    Manually add is_archived column to contacts table
    This is a temporary admin endpoint
    """
    try:
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contacts' 
            AND column_name='is_archived'
        """)
        
        result = await db.execute(check_query)
        exists = result.fetchone() is not None
        
        if not exists:
            logger.info('Adding is_archived column to contacts table...')
            alter_query = text("""
                ALTER TABLE contacts 
                ADD COLUMN is_archived BOOLEAN DEFAULT FALSE
            """)
            await db.execute(alter_query)
            await db.commit()
            return {
                "status": "success",
                "message": "✅ Column is_archived added successfully!"
            }
        else:
            return {
                "status": "success",
                "message": "ℹ️  Column is_archived already exists."
            }
        
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

