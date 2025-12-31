#!/usr/bin/env python3
import os
import sys
import subprocess
import uvicorn

def run_migrations():
    """Run Alembic migrations before starting the server"""
    try:
        print("🔄 Running database migrations...")
        # Set working directory to ensure alembic can find alembic.ini
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            check=False,
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            print("✅ Database migrations completed successfully")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"⚠️  Migration warning (exit code {result.returncode}):")
            if result.stderr:
                print(result.stderr)
            if result.stdout:
                print(result.stdout)
            # Continue anyway - migrations might already be up to date
    except Exception as e:
        print(f"⚠️  Could not run migrations: {e}")
        import traceback
        traceback.print_exc()
        print("Continuing with server startup...")

if __name__ == "__main__":
    # Run migrations before starting server
    run_migrations()
    
    # Get port from environment (Railway sets this)
    port = int(os.environ.get("PORT", 8000))
    
    print(f"🚀 Starting FastAPI server on port {port}...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )