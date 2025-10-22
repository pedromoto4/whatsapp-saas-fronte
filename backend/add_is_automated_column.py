"""
Script to add is_automated column to message_logs table
Run this once to update the database schema
"""
import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def add_is_automated_column():
    async with engine.begin() as conn:
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='message_logs' 
            AND column_name='is_automated';
        """)
        
        result = await conn.execute(check_query)
        exists = result.fetchone() is not None
        
        if not exists:
            print("Adding is_automated column to message_logs table...")
            
            # Add the column with default value False
            alter_query = text("""
                ALTER TABLE message_logs 
                ADD COLUMN is_automated BOOLEAN DEFAULT FALSE;
            """)
            
            await conn.execute(alter_query)
            
            print("✅ Column is_automated added successfully!")
        else:
            print("ℹ️  Column is_automated already exists.")

if __name__ == "__main__":
    print("Starting database migration...")
    asyncio.run(add_is_automated_column())
    print("Migration completed!")

