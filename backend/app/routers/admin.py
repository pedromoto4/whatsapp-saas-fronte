"""
Admin endpoints for database migrations and maintenance
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.dependencies import get_db
from app.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/migrate/add-is-automated")
async def add_is_automated_column(
    db: AsyncSession = Depends(get_db)
):
    """
    Add is_automated column to message_logs table
    One-time migration endpoint
    """
    try:
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='message_logs' 
            AND column_name='is_automated';
        """)
        
        result = await db.execute(check_query)
        exists = result.fetchone() is not None
        
        if exists:
            return {
                "status": "success",
                "message": "Column is_automated already exists",
                "action": "none"
            }
        
        # Add the column
        logger.info("Adding is_automated column to message_logs table...")
        
        alter_query = text("""
            ALTER TABLE message_logs 
            ADD COLUMN is_automated BOOLEAN DEFAULT FALSE;
        """)
        
        await db.execute(alter_query)
        await db.commit()
        
        logger.info("✅ Column is_automated added successfully!")
        
        return {
            "status": "success",
            "message": "Column is_automated added successfully",
            "action": "created"
        }
        
    except Exception as e:
        logger.error(f"Error adding is_automated column: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )

@router.get("/migrate/status")
async def check_migration_status(
    db: AsyncSession = Depends(get_db)
):
    """Check if is_automated column exists"""
    try:
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='message_logs' 
            AND column_name='is_automated';
        """)
        
        result = await db.execute(check_query)
        exists = result.fetchone() is not None
        
        return {
            "status": "success",
            "is_automated_column_exists": exists,
            "message": "Column exists" if exists else "Column does not exist - run migration"
        }
        
    except Exception as e:
        logger.error(f"Error checking migration status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status check failed: {str(e)}"
        )

