"""
Admin Migration Router - Temporary endpoint to run migrations manually
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/migrate", tags=["Admin"])

@router.post("/add-status-columns")
async def add_status_columns(db: AsyncSession = Depends(get_db)):
    """
    Manually add status and whatsapp_message_id columns to message_logs table
    This is a temporary admin endpoint
    """
    try:
        # Check which columns exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='message_logs' 
            AND column_name IN ('status', 'whatsapp_message_id')
        """)
        
        result = await db.execute(check_query)
        existing_columns = {row[0] for row in result.fetchall()}
        
        results = []
        
        # Add status column if missing
        if 'status' not in existing_columns:
            logger.info('Adding status column to message_logs table...')
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN status VARCHAR DEFAULT 'sent'
            """)
            await db.execute(alter_query)
            await db.commit()
            results.append("✅ Column status added successfully!")
        else:
            results.append("ℹ️  Column status already exists.")
        
        # Add whatsapp_message_id column if missing
        if 'whatsapp_message_id' not in existing_columns:
            logger.info('Adding whatsapp_message_id column to message_logs table...')
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN whatsapp_message_id VARCHAR
            """)
            await db.execute(alter_query)
            await db.commit()
            results.append("✅ Column whatsapp_message_id added successfully!")
        else:
            results.append("ℹ️  Column whatsapp_message_id already exists.")
        
        return {
            "status": "success",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

