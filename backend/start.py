#!/usr/bin/env python3
"""
Railway deployment script - handles PORT environment variable properly
"""
import os
import uvicorn

if __name__ == "__main__":
    # Get port from environment variable, fallback to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Run uvicorn with proper configuration for Railway
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )