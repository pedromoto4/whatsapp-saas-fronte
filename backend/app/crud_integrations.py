from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import Optional
from app.models import Integration
from app.schemas import IntegrationCreate
from datetime import datetime

async def create_integration(db: AsyncSession, user_id: int, integration: IntegrationCreate) -> Integration:
    """Create a new WhatsApp integration for a user"""
    db_integration = Integration(
        user_id=user_id,
        wa_phone_number_id=integration.wa_phone_number_id,
        wa_access_token=integration.wa_access_token,
        wa_business_account_id=integration.wa_business_account_id,
        last_verified_at=datetime.utcnow()
    )
    db.add(db_integration)
    await db.commit()
    await db.refresh(db_integration)
    return db_integration

async def get_integration_by_user_id(db: AsyncSession, user_id: int) -> Optional[Integration]:
    """Get integration by user ID"""
    result = await db.execute(
        select(Integration).where(Integration.user_id == user_id)
    )
    return result.scalar_one_or_none()

async def get_integration_by_phone_number_id(db: AsyncSession, phone_number_id: str) -> Optional[Integration]:
    """Get integration by phone number ID (for webhook routing)"""
    result = await db.execute(
        select(Integration).where(
            Integration.wa_phone_number_id == phone_number_id,
            Integration.is_active == True
        )
    )
    return result.scalar_one_or_none()

async def update_integration(db: AsyncSession, user_id: int, integration_data: dict) -> Optional[Integration]:
    """Update integration"""
    existing = await get_integration_by_user_id(db, user_id)
    if not existing:
        return None
    
    # Update fields
    for field, value in integration_data.items():
        if hasattr(existing, field):
            setattr(existing, field, value)
    
    existing.last_verified_at = datetime.utcnow()
    await db.commit()
    await db.refresh(existing)
    return existing

async def delete_integration(db: AsyncSession, user_id: int) -> bool:
    """Delete integration by user ID"""
    result = await db.execute(
        delete(Integration).where(Integration.user_id == user_id)
    )
    await db.commit()
    return result.rowcount > 0

async def deactivate_integration(db: AsyncSession, user_id: int) -> bool:
    """Deactivate integration (soft delete)"""
    result = await db.execute(
        update(Integration)
        .where(Integration.user_id == user_id)
        .values(is_active=False)
    )
    await db.commit()
    return result.rowcount > 0

