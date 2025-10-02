#!/bin/bash
# Railway startup script with proper PORT handling

# Check if PORT is set and is a valid integer
if [[ -n "$PORT" && "$PORT" =~ ^[0-9]+$ ]]; then
    APP_PORT="$PORT"
else
    APP_PORT=8000
fi

echo "Starting FastAPI application on port $APP_PORT"

# Start uvicorn with the resolved port
exec uvicorn main:app --host 0.0.0.0 --port $APP_PORT --log-level info