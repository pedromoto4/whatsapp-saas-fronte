#!/usr/bin/env python3
"""
Script para inicializar a tabela alembic_version quando o banco já tem tabelas
mas o Alembic não sabe que as migrações foram aplicadas
"""
import asyncio
import os
from sqlalchemy import text, inspect
from app.database import engine, SessionLocal

async def setup_alembic_version():
    """Verificar e criar tabela alembic_version se necessário"""
    try:
        async with engine.begin() as conn:
            # Check if alembic_version table exists
            inspector = inspect(await conn.get_sync_engine())
            tables = inspector.get_table_names()
            
            if 'alembic_version' not in tables:
                print("📝 Creating alembic_version table...")
                await conn.execute(text("""
                    CREATE TABLE alembic_version (
                        version_num VARCHAR(32) NOT NULL,
                        CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                    )
                """))
                print("✅ alembic_version table created")
            
            # Check if there's a version recorded
            result = await conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.scalar_one_or_none()
            
            if not version:
                # Check which tables exist to determine which migration to mark as current
                if 'users' in tables and 'contacts' in tables:
                    if 'push_tokens' in tables:
                        # All migrations applied
                        version = '004_add_push_tokens_table'
                    elif 'appointments' in tables:
                        # Up to appointments
                        version = '003_add_appointments_tables'
                    elif 'faqs' in tables:
                        # Up to FAQs
                        version = '002_add_faq_table'
                    else:
                        # Just initial migration
                        version = '001'
                    
                    print(f"📝 Marking migration {version} as current...")
                    await conn.execute(
                        text("INSERT INTO alembic_version (version_num) VALUES (:version)"),
                        {"version": version}
                    )
                    print(f"✅ Marked migration {version} as current")
                else:
                    print("⚠️  Database tables don't match expected migrations")
            else:
                print(f"✅ Alembic version already set to: {version}")
                
    except Exception as e:
        print(f"❌ Error setting up alembic_version: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(setup_alembic_version())

