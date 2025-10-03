from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

#DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/whatsapp_saas")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:IsVXKeevkstNtmdqaULaXyCVjrgzRrkq@ballast.proxy.rlwy.net:52154/railway")
# Convert psycopg2 URL to asyncpg if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=True if os.getenv("ENVIRONMENT") == "development" else False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def create_tables():
    """Create all tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)