"""
Temporary admin endpoints for database migrations
Should be removed after migrations are complete
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.dependencies import get_db

router = APIRouter(prefix="/admin/db", tags=["admin"])

@router.post("/add-media-columns")
async def add_media_columns(db: AsyncSession = Depends(get_db)):
    """
    Add media columns to message_logs table
    Temporary endpoint - should be removed after migration
    """
    try:
        # Check which columns already exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='message_logs' 
            AND column_name IN ('media_url', 'media_type', 'media_filename')
        """)
        
        result = await db.execute(check_query)
        existing_columns = {row[0] for row in result.fetchall()}
        
        messages = []
        
        # Add media_url if missing
        if 'media_url' not in existing_columns:
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN media_url VARCHAR;
            """)
            await db.execute(alter_query)
            messages.append("✅ Column media_url added successfully!")
        else:
            messages.append("ℹ️  Column media_url already exists.")
        
        # Add media_type if missing
        if 'media_type' not in existing_columns:
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN media_type VARCHAR;
            """)
            await db.execute(alter_query)
            messages.append("✅ Column media_type added successfully!")
        else:
            messages.append("ℹ️  Column media_type already exists.")
        
        # Add media_filename if missing
        if 'media_filename' not in existing_columns:
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN media_filename VARCHAR;
            """)
            await db.execute(alter_query)
            messages.append("✅ Column media_filename added successfully!")
        else:
            messages.append("ℹ️  Column media_filename already exists.")
        
        await db.commit()
        
        return {
            "status": "success",
            "message": " | ".join(messages),
            "columns_added": len([m for m in messages if "added" in m])
        }
        
    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "message": f"Failed to add columns: {str(e)}"
        }
