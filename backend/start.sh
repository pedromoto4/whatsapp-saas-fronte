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
from app.database import engine, Base
from app.models import User, Contact, Campaign, Message, FAQ, Catalog, MessageLog, Template

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database tables created successfully')

asyncio.run(create_tables())
"

echo "Running schema updates..."
python3 add_is_automated_column.py

echo "Starting FastAPI application on port $APP_PORT"

# Start uvicorn with the resolved port
exec uvicorn main:app --host 0.0.0.0 --port $APP_PORT --log-level info