from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.models import User, Contact, Campaign, Message, FAQ, Catalog, MessageLog, Template
from app.schemas import UserCreate, ContactCreate, ContactUpdate, CampaignCreate, CampaignUpdate, MessageCreate, FAQCreate, FAQUpdate, CatalogCreate, CatalogUpdate, MessageLogCreate, TemplateCreate, TemplateUpdate

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

async def create_contact_from_webhook(db: AsyncSession, contact_data: dict) -> Contact:
    """Create a new contact from webhook data"""
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

# Catalog CRUD
async def create_catalog_item(db: AsyncSession, item: CatalogCreate, owner_id: int) -> Catalog:
    """Create a new catalog item"""
    db_item = Catalog(**item.dict(), owner_id=owner_id)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

async def get_catalog_items(db: AsyncSession, owner_id: int) -> List[Catalog]:
    """Get all catalog items for a user"""
    result = await db.execute(
        select(Catalog)
        .where(Catalog.owner_id == owner_id)
        .order_by(Catalog.created_at.desc())
    )
    return result.scalars().all()

async def get_catalog_item(db: AsyncSession, item_id: int, owner_id: int) -> Optional[Catalog]:
    """Get a specific catalog item"""
    result = await db.execute(
        select(Catalog).where(Catalog.id == item_id, Catalog.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def update_catalog_item(db: AsyncSession, item_id: int, owner_id: int, item_update: CatalogUpdate) -> Optional[Catalog]:
    """Update a catalog item"""
    existing_item = await get_catalog_item(db, item_id, owner_id)
    if not existing_item:
        return None
    
    update_data = item_update.dict(exclude_unset=True)
    if update_data:
        await db.execute(
            update(Catalog)
            .where(Catalog.id == item_id, Catalog.owner_id == owner_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(existing_item)
    
    return existing_item

async def delete_catalog_item(db: AsyncSession, item_id: int, owner_id: int) -> bool:
    """Delete a catalog item"""
    result = await db.execute(
        delete(Catalog).where(Catalog.id == item_id, Catalog.owner_id == owner_id)
    )
    await db.commit()
    return result.rowcount > 0

async def build_catalog_message(db: AsyncSession, owner_id: int, limit: int = 5) -> str:
    """Build a formatted catalog message"""
    items = await get_catalog_items(db, owner_id)
    
    if not items:
        return "Desculpe, ainda não temos produtos no catálogo."
    
    message = "📋 *Nosso Catálogo:*\n\n"
    
    for i, item in enumerate(items[:limit], 1):
        message += f"{i}. *{item.name}*\n"
        message += f"   💰 {item.price}\n"
        if item.description:
            message += f"   📝 {item.description}\n"
        message += "\n"
    
    if len(items) > limit:
        message += f"_...e mais {len(items) - limit} produtos!_\n\n"
    
    message += "Para mais informações, entre em contato conosco!"
    
    return message

# MessageLog CRUD
async def create_message_log(db: AsyncSession, log_data: MessageLogCreate) -> MessageLog:
    """Create a new message log entry"""
    from sqlalchemy import text
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Check which columns exist
    check_result = await db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='message_logs' AND column_name IN ('is_automated', 'status', 'whatsapp_message_id')"
    ))
    existing_columns = {row[0] for row in check_result.fetchall()}
    
    has_is_automated = 'is_automated' in existing_columns
    has_status = 'status' in existing_columns
    has_whatsapp_message_id = 'whatsapp_message_id' in existing_columns
    
    logger.info(f"create_message_log - Columns exist - is_automated: {has_is_automated}, status: {has_status}, whatsapp_message_id: {has_whatsapp_message_id}")
    
    if has_is_automated and has_status and has_whatsapp_message_id:
        # All columns exist, use ORM normally
        db_log = MessageLog(**log_data.dict())
        db.add(db_log)
        await db.commit()
        await db.refresh(db_log)
        return db_log
    else:
        # Some columns don't exist, use raw SQL INSERT with only base columns
        insert_query = text("""
            INSERT INTO message_logs 
            (owner_id, direction, kind, to_from, content, template_name, cost_estimate, created_at)
            VALUES 
            (:owner_id, :direction, :kind, :to_from, :content, :template_name, :cost_estimate, NOW())
            RETURNING id, created_at
        """)
        
        result = await db.execute(insert_query, {
            'owner_id': log_data.owner_id,
            'direction': log_data.direction,
            'kind': log_data.kind,
            'to_from': log_data.to_from,
            'content': log_data.content,
            'template_name': log_data.template_name,
            'cost_estimate': log_data.cost_estimate
        })
        
        row = result.fetchone()
        await db.commit()
        
        # Fetch the created log to return
        fetch_query = text("SELECT * FROM message_logs WHERE id = :id")
        fetch_result = await db.execute(fetch_query, {'id': row.id})
        log_row = fetch_result.fetchone()
        
        # Convert to MessageLog object
        db_log = MessageLog(
            id=log_row.id,
            owner_id=log_row.owner_id,
            direction=log_row.direction,
            kind=log_row.kind,
            to_from=log_row.to_from,
            content=log_row.content,
            template_name=log_row.template_name,
            cost_estimate=log_row.cost_estimate,
            created_at=log_row.created_at
        )
        
        return db_log

async def get_message_logs(db: AsyncSession, owner_id: int, limit: int = 100, offset: int = 0) -> List[MessageLog]:
    """Get message logs for a user"""
    result = await db.execute(
        select(MessageLog)
        .where(MessageLog.owner_id == owner_id)
        .order_by(MessageLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()

async def get_message_logs_by_phone(db: AsyncSession, owner_id: int, phone_number: str, limit: int = 50) -> List[MessageLog]:
    """Get message logs for a specific phone number"""
    result = await db.execute(
        select(MessageLog)
        .where(MessageLog.owner_id == owner_id, MessageLog.to_from == phone_number)
        .order_by(MessageLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()

async def get_message_logs_stats(db: AsyncSession, owner_id: int) -> dict:
    """Get statistics about message logs"""
    from sqlalchemy import func
    
    # Total messages
    total_result = await db.execute(
        select(func.count(MessageLog.id))
        .where(MessageLog.owner_id == owner_id)
    )
    total = total_result.scalar()
    
    # Incoming messages
    incoming_result = await db.execute(
        select(func.count(MessageLog.id))
        .where(MessageLog.owner_id == owner_id, MessageLog.direction == 'in')
    )
    incoming = incoming_result.scalar()
    
    # Outgoing messages
    outgoing_result = await db.execute(
        select(func.count(MessageLog.id))
        .where(MessageLog.owner_id == owner_id, MessageLog.direction == 'out')
    )
    outgoing = outgoing_result.scalar()
    
    return {
        "total": total or 0,
        "incoming": incoming or 0,
        "outgoing": outgoing or 0,
        "automation_rate": round((outgoing / total * 100) if total > 0 else 0, 2)
    }

# Template CRUD
async def create_template(db: AsyncSession, template: TemplateCreate, owner_id: int) -> Template:
    """Create a new template"""
    db_template = Template(**template.dict(), owner_id=owner_id)
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template

async def get_templates(db: AsyncSession, owner_id: int) -> List[Template]:
    """Get all templates for a specific owner"""
    result = await db.execute(
        select(Template)
        .where(Template.owner_id == owner_id)
        .order_by(Template.created_at.desc())
    )
    return result.scalars().all()

async def get_template(db: AsyncSession, template_id: int, owner_id: int) -> Optional[Template]:
    """Get a specific template"""
    result = await db.execute(
        select(Template)
        .where(Template.id == template_id, Template.owner_id == owner_id)
    )
    return result.scalar_one_or_none()

async def update_template(db: AsyncSession, template_id: int, owner_id: int, template_update: TemplateUpdate) -> Optional[Template]:
    """Update a template"""
    existing_template = await get_template(db, template_id, owner_id)
    if not existing_template:
        return None
    
    update_data = template_update.dict(exclude_unset=True)
    if update_data:
        await db.execute(
            update(Template)
            .where(Template.id == template_id, Template.owner_id == owner_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(existing_template)
    
    return existing_template

async def delete_template(db: AsyncSession, template_id: int, owner_id: int) -> bool:
    """Delete a template"""
    result = await db.execute(
        delete(Template)
        .where(Template.id == template_id, Template.owner_id == owner_id)
    )
    await db.commit()
    return result.rowcount > 0

# Conversations CRUD
async def get_conversations(db: AsyncSession, owner_id: int) -> List[dict]:
    """Get all conversations grouped by phone number with last message"""
    from sqlalchemy import func, desc, and_, text
    from sqlalchemy.exc import ProgrammingError
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Check which columns exist using raw SQL
        check_result = await db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='message_logs' AND column_name IN ('is_automated', 'status', 'whatsapp_message_id')"
        ))
        existing_columns = {row[0] for row in check_result.fetchall()}
        
        has_is_automated = 'is_automated' in existing_columns
        has_status = 'status' in existing_columns
        has_whatsapp_message_id = 'whatsapp_message_id' in existing_columns
        
        logger.info(f"Columns exist - is_automated: {has_is_automated}, status: {has_status}, whatsapp_message_id: {has_whatsapp_message_id}")
        
        if has_is_automated and has_status and has_whatsapp_message_id:
            # All columns exist, use full model (exclude empty read markers)
            all_messages_result = await db.execute(
                select(MessageLog)
                .where(
                    MessageLog.owner_id == owner_id,
                    MessageLog.content != ""  # Exclude read markers
                )
                .order_by(MessageLog.created_at.desc())
            )
            all_messages = all_messages_result.scalars().all()
        else:
            # Column doesn't exist, select only existing columns (exclude empty read markers)
            all_messages_result = await db.execute(
                select(
                    MessageLog.id,
                    MessageLog.owner_id,
                    MessageLog.direction,
                    MessageLog.kind,
                    MessageLog.to_from,
                    MessageLog.content,
                    MessageLog.template_name,
                    MessageLog.cost_estimate,
                    MessageLog.created_at
                )
                .where(
                    MessageLog.owner_id == owner_id,
                    MessageLog.content != ""  # Exclude read markers
                )
                .order_by(MessageLog.created_at.desc())
            )
            # Convert rows to objects with default values for missing columns
            all_messages = []
            for row in all_messages_result:
                msg = type('MessageLog', (), {
                    'id': row.id,
                    'owner_id': row.owner_id,
                    'direction': row.direction,
                    'kind': row.kind,
                    'to_from': row.to_from,
                    'content': row.content,
                    'template_name': row.template_name,
                    'cost_estimate': row.cost_estimate,
                    'created_at': row.created_at,
                    'is_automated': False,
                    'status': 'sent',
                    'whatsapp_message_id': None
                })()
                all_messages.append(msg)
        
        # Group by phone number and get latest message
        phone_to_latest = {}
        for msg in all_messages:
            if msg.to_from not in phone_to_latest:
                phone_to_latest[msg.to_from] = msg
        
        # Build conversations list
        conversations = []
        for phone_number, msg in phone_to_latest.items():
            # Try to find contact info
            contact = await get_contact_by_phone(db, phone_number)
            contact_name = contact.name if contact else None
            is_archived = contact.is_archived if contact else False
            tags = contact.tags if contact else None
            
            # Check if last message was automated (from database or if it's a template)
            is_automated = msg.is_automated or bool(msg.template_name)
            
            # Count all unread incoming messages (after last outgoing message)
            # Find timestamp of last outgoing message
            last_out_query = await db.execute(
                select(MessageLog.created_at)
                .where(
                    MessageLog.owner_id == owner_id,
                    MessageLog.to_from == phone_number,
                    MessageLog.direction == 'out'
                )
                .order_by(MessageLog.created_at.desc())
                .limit(1)
            )
            last_out_row = last_out_query.fetchone()
            last_out_time = last_out_row[0] if last_out_row else None
            
            # Count incoming messages after last outgoing
            if last_out_time:
                unread_query = await db.execute(
                    select(func.count(MessageLog.id))
                    .where(
                        MessageLog.owner_id == owner_id,
                        MessageLog.to_from == phone_number,
                        MessageLog.direction == 'in',
                        MessageLog.created_at > last_out_time
                    )
                )
                unread_count = unread_query.scalar() or 0
            else:
                # No outgoing messages yet, count all incoming
                unread_query = await db.execute(
                    select(func.count(MessageLog.id))
                    .where(
                        MessageLog.owner_id == owner_id,
                        MessageLog.to_from == phone_number,
                        MessageLog.direction == 'in'
                    )
                )
                unread_count = unread_query.scalar() or 0
            
            conversations.append({
                'phone_number': phone_number,
                'contact_name': contact_name,
                'last_message': msg.content or f"[Template: {msg.template_name}]",
                'last_message_time': msg.created_at,
                'direction': msg.direction,
                'unread_count': unread_count,
                'is_automated': is_automated,
                'is_archived': is_archived,
                'tags': tags
            })
        
        # Sort by last message time (most recent first)
        conversations.sort(key=lambda x: x['last_message_time'], reverse=True)
        
        return conversations
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting conversations: {e}")
        return []

async def get_conversation_messages(db: AsyncSession, owner_id: int, phone_number: str) -> List:
    """Get all messages for a specific conversation"""
    from sqlalchemy import text
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Check which columns exist
    check_result = await db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='message_logs' AND column_name IN ('is_automated', 'status', 'whatsapp_message_id')"
    ))
    existing_columns = {row[0] for row in check_result.fetchall()}
    
    has_is_automated = 'is_automated' in existing_columns
    has_status = 'status' in existing_columns
    has_whatsapp_message_id = 'whatsapp_message_id' in existing_columns
    
    logger.info(f"get_conversation_messages - Columns exist - is_automated: {has_is_automated}, status: {has_status}, whatsapp_message_id: {has_whatsapp_message_id}")
    
    if has_is_automated and has_status and has_whatsapp_message_id:
        # All columns exist, use full model (exclude empty read markers)
        result = await db.execute(
            select(MessageLog)
            .where(
                MessageLog.owner_id == owner_id,
                MessageLog.to_from == phone_number,
                MessageLog.content != ""  # Exclude read markers
            )
            .order_by(MessageLog.created_at.asc())
        )
        return result.scalars().all()
    else:
        # Column doesn't exist, select only existing columns (exclude empty read markers)
        result = await db.execute(
            select(
                MessageLog.id,
                MessageLog.owner_id,
                MessageLog.direction,
                MessageLog.kind,
                MessageLog.to_from,
                MessageLog.content,
                MessageLog.template_name,
                MessageLog.cost_estimate,
                MessageLog.created_at
            )
            .where(
                MessageLog.owner_id == owner_id,
                MessageLog.to_from == phone_number,
                MessageLog.content != ""  # Exclude read markers
            )
            .order_by(MessageLog.created_at.asc())
        )
        # Convert to objects with default values for missing columns
        messages = []
        for row in result:
            msg = type('MessageLog', (), {
                'id': row.id,
                'owner_id': row.owner_id,
                'direction': row.direction,
                'kind': row.kind,
                'to_from': row.to_from,
                'content': row.content,
                'template_name': row.template_name,
                'cost_estimate': row.cost_estimate,
                'created_at': row.created_at,
                'is_automated': False,
                'status': 'sent',
                'whatsapp_message_id': None
            })()
            messages.append(msg)
        return messages