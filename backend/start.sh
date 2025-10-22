#!/bin/bash
# Railway startup script with proper PORT handling

# Check if PORT is set and is a valid integer
if [[ -n "$PORT" && "$PORT" =~ ^[0-9]+$ ]]; then
    APP_PORT="$PORT"
else
    APP_PORT=8000
fi

echo "Running database migrations..."
python3 -c "
import asyncio
from sqlalchemy import text
from app.database import engine, Base
from app.models import User, Contact, Campaign, Message, FAQ, Catalog, MessageLog, Template

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('✅ Database tables created successfully')

async def add_is_automated_column():
    async with engine.begin() as conn:
        # Check if column exists
        check_query = text('''
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=\'message_logs\' 
            AND column_name=\'is_automated\';
        ''')
        
        result = await conn.execute(check_query)
        exists = result.fetchone() is not None
        
        if not exists:
            print('Adding is_automated column to message_logs table...')
            
            # Add the column with default value False
            alter_query = text('''
                ALTER TABLE message_logs 
                ADD COLUMN is_automated BOOLEAN DEFAULT FALSE;
            ''')
            
            await conn.execute(alter_query)
            
            print('✅ Column is_automated added successfully!')
        else:
            print('ℹ️  Column is_automated already exists.')

asyncio.run(create_tables())
asyncio.run(add_is_automated_column())
"

echo "Starting FastAPI application on port $APP_PORT"

# Start uvicorn with the resolved port
exec uvicorn main:app --host 0.0.0.0 --port $APP_PORT --log-level info