#!/usr/bin/env python3
import os
import sys
import subprocess
import uvicorn

def setup_alembic_if_needed():
    """Setup alembic_version table if database has tables but no alembic tracking"""
    try:
        print("🔍 Checking Alembic version tracking...")
        import asyncio
        from app.database import engine
        from sqlalchemy import text, inspect
        
        async def check_and_setup():
            async with engine.begin() as conn:
                # Check if alembic_version table exists using SQL query
                try:
                    result = await conn.execute(text("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'alembic_version'
                    """))
                    alembic_exists = result.scalar_one_or_none() is not None
                except Exception:
                    alembic_exists = False
                
                if not alembic_exists:
                    print("📝 Creating alembic_version table...")
                    await conn.execute(text("""
                        CREATE TABLE alembic_version (
                            version_num VARCHAR(32) NOT NULL,
                            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                        )
                    """))
                    print("✅ alembic_version table created")
                
                # Check if there's a version recorded
                try:
                    result = await conn.execute(text("SELECT version_num FROM alembic_version"))
                    version = result.scalar_one_or_none()
                except Exception:
                    version = None
                
                # Check which tables exist to determine migration state
                if not version:
                    try:
                        result = await conn.execute(text("""
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE table_schema = 'public'
                        """))
                        existing_tables = {row[0] for row in result.fetchall()}
                        
                        if 'users' in existing_tables:
                            # Database has tables but no alembic version - mark appropriate migration
                            if 'push_tokens' in existing_tables:
                                version = '004_add_push_tokens_table'
                            elif 'appointments' in existing_tables:
                                version = '003_add_appointments_tables'
                            elif 'faqs' in existing_tables:
                                version = '002_add_faq_table'
                            else:
                                version = '001'
                            
                            if version:
                                print(f"📝 Marking migration {version} as current (tables already exist)...")
                                await conn.execute(
                                    text("INSERT INTO alembic_version (version_num) VALUES (:version)"),
                                    {"version": version}
                                )
                                print(f"✅ Marked migration {version} as current")
                    except Exception as e:
                        print(f"⚠️  Could not check existing tables: {e}")
                elif version:
                    print(f"✅ Alembic version already set to: {version}")
        
        asyncio.run(check_and_setup())
    except Exception as e:
        print(f"⚠️  Could not setup alembic version tracking: {e}")
        # Continue anyway

def run_migrations():
    """Run Alembic migrations before starting the server"""
    try:
        # First, setup alembic_version if needed
        setup_alembic_if_needed()
        
        print("🔄 Running database migrations...")
        print(f"Working directory: {os.getcwd()}")
        print(f"Python executable: {sys.executable}")
        
        # Check if alembic.ini exists
        alembic_ini = os.path.join(os.path.dirname(__file__), "alembic.ini")
        if not os.path.exists(alembic_ini):
            print(f"⚠️  alembic.ini not found at {alembic_ini}")
            print("Skipping migrations...")
            return
        
        # Run migrations
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
                # Print only important lines
                for line in result.stdout.split('\n'):
                    if line.strip() and ('INFO' in line or 'Running upgrade' in line or 'Running downgrade' in line):
                        print(f"  {line}")
        else:
            print(f"⚠️  Migration warning (exit code {result.returncode}):")
            if result.stderr:
                print("STDERR:")
                print(result.stderr)
            if result.stdout:
                print("STDOUT:")
                print(result.stdout)
            # Continue anyway - migrations might already be up to date or tables might exist
            print("Continuing with server startup (migrations may have failed but server will start)...")
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