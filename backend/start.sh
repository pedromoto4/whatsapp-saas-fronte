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

async def add_missing_columns():
    async with engine.begin() as conn:
        # Check which columns exist
        check_query = text('''
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=\'message_logs\' 
            AND column_name IN (\'is_automated\', \'status\', \'whatsapp_message_id\');
        ''')
        
        result = await conn.execute(check_query)
        existing_columns = {row[0] for row in result.fetchall()}
        
        # Add is_automated column if missing
        if 'is_automated' not in existing_columns:
            print('Adding is_automated column to message_logs table...')
            alter_query = text('''
                ALTER TABLE message_logs 
                ADD COLUMN is_automated BOOLEAN DEFAULT FALSE;
            ''')
            await conn.execute(alter_query)
            print('✅ Column is_automated added successfully!')
        else:
            print('ℹ️  Column is_automated already exists.')
        
        # Add status column if missing
        if 'status' not in existing_columns:
            print('Adding status column to message_logs table...')
            alter_query = text('''
                ALTER TABLE message_logs 
                ADD COLUMN status VARCHAR DEFAULT \'sent\';
            ''')
            await conn.execute(alter_query)
            print('✅ Column status added successfully!')
        else:
            print('ℹ️  Column status already exists.')
        
        # Add whatsapp_message_id column if missing
        if 'whatsapp_message_id' not in existing_columns:
            print('Adding whatsapp_message_id column to message_logs table...')
            alter_query = text('''
                ALTER TABLE message_logs 
                ADD COLUMN whatsapp_message_id VARCHAR;
            ''')
            await conn.execute(alter_query)
            print('✅ Column whatsapp_message_id added successfully!')
        else:
            print('ℹ️  Column whatsapp_message_id already exists.')

async def add_contacts_is_archived():
    async with engine.begin() as conn:
        # Check if is_archived column exists in contacts table
        check_query = text('''
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=\'contacts\' 
            AND column_name=\'is_archived\';
        ''')
        
        result = await conn.execute(check_query)
        exists = result.fetchone() is not None
        
        if not exists:
            print('Adding is_archived column to contacts table...')
            alter_query = text('''
                ALTER TABLE contacts 
                ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
            ''')
            await conn.execute(alter_query)
            print('✅ Column is_archived added successfully!')
        else:
            print('ℹ️  Column is_archived already exists in contacts.')

asyncio.run(create_tables())
asyncio.run(add_missing_columns())
asyncio.run(add_contacts_is_archived())
"

echo "Starting FastAPI application on port $APP_PORT"

# Start uvicorn with the resolved port
exec uvicorn main:app --host 0.0.0.0 --port $APP_PORT --log-level info