#!/bin/bash
# Railway startup script with proper PORT handling

# Default to port 8000 if PORT is not set
DEFAULT_PORT=8000
PORT=${PORT:-$DEFAULT_PORT}

echo "Starting FastAPI application on port $PORT"

# Start uvicorn with the resolved port
exec uvicorn main:app --host 0.0.0.0 --port "$PORT" --log-level info