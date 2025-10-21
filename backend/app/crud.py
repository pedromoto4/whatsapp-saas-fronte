from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.models import User, Contact, Campaign, Message, FAQ
from app.schemas import UserCreate, ContactCreate, ContactUpdate, CampaignCreate, CampaignUpdate, MessageCreate, FAQCreate, FAQUpdate

# User CRUD
async def create_user(db: AsyncSession, user: UserCreate) -> User:
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_user_by_firebase_uid(db: AsyncSession, firebase_uid: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    return result.scalar_one_or_none()

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

# Contact CRUD
async def create_contact(db: AsyncSession, contact: ContactCreate, owner_id: int) -> Contact:
    db_contact = Contact(**contact.dict(), owner_id=owner_id)
    db.add(db_contact)
    await db.commit()
    await db.refresh(db_contact)
    return db_contact

async def get_contact(db: AsyncSession, contact_id: int, owner_id: int) -> Optional[Contact]:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def get_contacts(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[Contact]:
    result = await db.execute(
        select(Contact)
        .where(Contact.owner_id == owner_id, Contact.is_active == True)
        .offset(skip)
        .limit(limit)
        .order_by(Contact.created_at.desc())
    )
    return result.scalars().all()

async def update_contact(db: AsyncSession, contact_id: int, owner_id: int, contact_update: ContactUpdate) -> Optional[Contact]:
    # First check if contact belongs to user
    existing_contact = await get_contact(db, contact_id, owner_id)
    if not existing_contact:
        return None
    
    update_data = contact_update.dict(exclude_unset=True)
    if update_data:
        await db.execute(
            update(Contact)
            .where(Contact.id == contact_id, Contact.owner_id == owner_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(existing_contact)
    
    return existing_contact

async def delete_contact(db: AsyncSession, contact_id: int, owner_id: int) -> bool:
    result = await db.execute(
        update(Contact)
        .where(Contact.id == contact_id, Contact.owner_id == owner_id)
        .values(is_active=False)
    )
    await db.commit()
    return result.rowcount > 0

# Campaign CRUD
async def create_campaign(db: AsyncSession, campaign: CampaignCreate, owner_id: int) -> Campaign:
    db_campaign = Campaign(**campaign.dict(), owner_id=owner_id)
    db.add(db_campaign)
    await db.commit()
    await db.refresh(db_campaign)
    return db_campaign

async def get_campaign(db: AsyncSession, campaign_id: int, owner_id: int) -> Optional[Campaign]:
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def get_campaigns(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[Campaign]:
    result = await db.execute(
        select(Campaign)
        .where(Campaign.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
        .order_by(Campaign.created_at.desc())
    )
    return result.scalars().all()

async def update_campaign(db: AsyncSession, campaign_id: int, owner_id: int, campaign_update: CampaignUpdate) -> Optional[Campaign]:
    existing_campaign = await get_campaign(db, campaign_id, owner_id)
    if not existing_campaign:
        return None
    
    update_data = campaign_update.dict(exclude_unset=True)
    if update_data:
        await db.execute(
            update(Campaign)
            .where(Campaign.id == campaign_id, Campaign.owner_id == owner_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(existing_campaign)
    
    return existing_campaign

async def delete_campaign(db: AsyncSession, campaign_id: int, owner_id: int) -> bool:
    result = await db.execute(
        delete(Campaign).where(Campaign.id == campaign_id, Campaign.owner_id == owner_id)
    )
    await db.commit()
    return result.rowcount > 0

# Message CRUD
async def create_message(db: AsyncSession, message: MessageCreate) -> Message:
    db_message = Message(**message.dict())
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return db_message

async def get_messages(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[Message]:
    """Get all messages for a user by joining with contacts"""
    result = await db.execute(
        select(Message)
        .join(Contact, Message.contact_id == Contact.id)
        .where(Contact.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
        .order_by(Message.created_at.desc())
    )
    return result.scalars().all()

async def get_messages_by_contact(db: AsyncSession, contact_id: int, owner_id: int, skip: int = 0, limit: int = 100) -> List[Message]:
    # First verify the contact belongs to the user
    contact = await get_contact(db, contact_id, owner_id)
    if not contact:
        return []
    
    result = await db.execute(
        select(Message)
        .where(Message.contact_id == contact_id)
        .offset(skip)
        .limit(limit)
        .order_by(Message.created_at.desc())
    )
    return result.scalars().all()

async def get_messages_by_campaign(db: AsyncSession, campaign_id: int, owner_id: int, skip: int = 0, limit: int = 100) -> List[Message]:
    # First verify the campaign belongs to the user
    campaign = await get_campaign(db, campaign_id, owner_id)
    if not campaign:
        return []
    
    result = await db.execute(
        select(Message)
        .where(Message.campaign_id == campaign_id)
        .offset(skip)
        .limit(limit)
        .order_by(Message.created_at.desc())
    )
    return result.scalars().all()

# WhatsApp-specific CRUD functions
async def get_contact_by_phone(db: AsyncSession, phone_number: str) -> Optional[Contact]:
    """Get contact by phone number"""
    result = await db.execute(select(Contact).where(Contact.phone_number == phone_number))
    return result.scalar_one_or_none()

async def create_contact(db: AsyncSession, contact_data: dict) -> Contact:
    """Create a new contact"""
    db_contact = Contact(**contact_data)
    db.add(db_contact)
    await db.commit()
    await db.refresh(db_contact)
    return db_contact

async def create_message(db: AsyncSession, message_data: dict) -> Message:
    """Create a new message"""
    db_message = Message(**message_data)
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return db_message

async def get_messages_by_contact(db: AsyncSession, contact_id: int) -> List[Message]:
    """Get all messages for a specific contact"""
    result = await db.execute(
        select(Message)
        .where(Message.contact_id == contact_id)
        .order_by(Message.created_at.desc())
    )
    return result.scalars().all()

# FAQ CRUD
async def create_faq(db: AsyncSession, faq: FAQCreate, owner_id: int) -> FAQ:
    """Create a new FAQ"""
    db_faq = FAQ(**faq.dict(), owner_id=owner_id)
    db.add(db_faq)
    await db.commit()
    await db.refresh(db_faq)
    return db_faq

async def get_faqs(db: AsyncSession, owner_id: int) -> List[FAQ]:
    """Get all FAQs for a user"""
    result = await db.execute(
        select(FAQ)
        .where(FAQ.owner_id == owner_id)
        .order_by(FAQ.created_at.desc())
    )
    return result.scalars().all()

async def get_faq(db: AsyncSession, faq_id: int, owner_id: int) -> Optional[FAQ]:
    """Get a specific FAQ"""
    result = await db.execute(
        select(FAQ).where(FAQ.id == faq_id, FAQ.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def update_faq(db: AsyncSession, faq_id: int, owner_id: int, faq_update: FAQUpdate) -> Optional[FAQ]:
    """Update a FAQ"""
    existing_faq = await get_faq(db, faq_id, owner_id)
    if not existing_faq:
        return None
    
    update_data = faq_update.dict(exclude_unset=True)
    if update_data:
        await db.execute(
            update(FAQ)
            .where(FAQ.id == faq_id, FAQ.owner_id == owner_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(existing_faq)
    
    return existing_faq

async def delete_faq(db: AsyncSession, faq_id: int, owner_id: int) -> bool:
    """Delete a FAQ"""
    result = await db.execute(
        delete(FAQ).where(FAQ.id == faq_id, FAQ.owner_id == owner_id)
    )
    await db.commit()
    return result.rowcount > 0

async def match_faq_by_keywords(db: AsyncSession, owner_id: int, text: str) -> Optional[FAQ]:
    """Find FAQ by matching keywords in text"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not text:
        logger.info("No text provided for FAQ matching")
        return None
    
    # Normalize text (lowercase, remove accents)
    normalized_text = text.lower().strip()
    logger.info(f"Matching FAQs for owner_id={owner_id}, normalized_text='{normalized_text}'")
    
    # Get all FAQs for user
    faqs = await get_faqs(db, owner_id)
    logger.info(f"Found {len(faqs)} FAQs for owner_id={owner_id}")
    
    # Simple keyword matching
    for faq in faqs:
        if faq.keywords:
            keywords = [kw.strip().lower() for kw in faq.keywords.split(',')]
            logger.info(f"Checking FAQ '{faq.question}' with keywords: {keywords}")
            if any(keyword in normalized_text for keyword in keywords):
                logger.info(f"✅ Matched FAQ: '{faq.question}'")
                return faq
    
    logger.info("❌ No FAQ matched")
    return None