"""
Conversations Router
Handles WhatsApp-style conversation management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import ConversationResponse, ConversationMessageResponse, MessageSendRequest, MessageLogCreate
from pydantic import BaseModel
from app.crud import (
    get_conversations, 
    get_conversation_messages,
    get_contact_by_phone,
    create_contact_from_webhook,
    create_message_log,
    get_catalog_item
)
from app.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for current user"""
    try:
        conversations = await get_conversations(db, current_user.id)
        return conversations
    except Exception as e:
        logger.error(f"Error loading conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversations: {str(e)}"
        )

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get total unread messages count"""
    try:
        conversations = await get_conversations(db, current_user.id)
        total_unread = sum(conv.get('unread_count', 0) for conv in conversations)
        return {"unread_count": total_unread}
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        return {"unread_count": 0}

@router.get("/{phone_number}/info")
async def get_contact_info(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get contact information from WhatsApp
    """
    try:
        # Get WhatsApp contact info
        from app.whatsapp_service import whatsapp_service
        contact_info = await whatsapp_service.get_contact_info(phone_number)
        
        # Also get from database if exists
        try:
            contact = await get_contact_by_phone(db, phone_number)
            if contact:
                contact_info["database_name"] = contact.name
                contact_info["tags"] = contact.tags
        except:
            pass
        
        return contact_info
    except Exception as e:
        logger.error(f"Error getting contact info: {e}")
        return {
            "phone_number": phone_number,
            "name": phone_number,
            "verified_name": None,
            "profile_picture_url": None,
            "has_picture": False,
            "database_name": None,
            "tags": None
        }

@router.get("/{phone_number}/messages", response_model=List[ConversationMessageResponse])
async def get_messages(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a specific conversation"""
    try:
        messages = await get_conversation_messages(db, current_user.id, phone_number)
        
        # Return messages with is_automated and status from database
        response = []
        for msg in messages:
            # is_automated vem do banco (True para FAQ/Catalog, False para mensagens manuais)
            # Templates também são considerados automáticos se enviados por campanha
            is_automated = msg.is_automated or bool(msg.template_name)
            
            # Get status (default to 'sent' if not present)
            status = getattr(msg, 'status', 'sent')
            whatsapp_message_id = getattr(msg, 'whatsapp_message_id', None)
            
            response.append({
                'id': msg.id,
                'direction': msg.direction,
                'content': msg.content,
                'kind': msg.kind,
                'template_name': msg.template_name,
                'created_at': msg.created_at,
                'is_automated': is_automated,
                'status': status,
                'whatsapp_message_id': whatsapp_message_id,
                'media_url': getattr(msg, 'media_url', None),
                'media_type': getattr(msg, 'media_type', None),
                'media_filename': getattr(msg, 'media_filename', None)
            })
        
        return response
    except Exception as e:
        logger.error(f"Error loading messages for {phone_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load messages: {str(e)}"
        )

@router.post("/{phone_number}/mark-read", status_code=status.HTTP_200_OK)
async def mark_conversation_as_read(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark conversation as read by creating a silent read marker"""
    try:
        from app.schemas import MessageLogCreate
        from app.crud import create_message_log
        
        # Create a silent "read marker" message
        # This makes backend think user responded, so unread_count becomes 0
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="text",
            to_from=phone_number,
            content="",  # Empty content = read marker
            cost_estimate="0.00",
            is_automated=False
        )
        await create_message_log(db, log_data)
        
        logger.info(f"Conversation with {phone_number} marked as read")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error marking conversation as read: {e}")
        return {"status": "error", "detail": str(e)}

@router.post("/{phone_number}/send")
async def send_message(
    phone_number: str,
    message_request: MessageSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a manual message to a conversation"""
    try:
        # Ensure contact exists
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            # Create contact if doesn't exist
            contact_data = {
                "phone_number": phone_number,
                "name": phone_number,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
        
        # Send message via WhatsApp
        response = await whatsapp_service.send_message(
            to=phone_number,
            message=message_request.content
        )
        
        # Extract message ID from WhatsApp response
        whatsapp_message_id = None
        if response.get("messages"):
            whatsapp_message_id = response["messages"][0].get("id")
        
        # Log the outgoing message
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="text",
            to_from=phone_number,
            content=message_request.content,
            cost_estimate="0.005",
            status="sent",
            whatsapp_message_id=whatsapp_message_id
        )
        await create_message_log(db, log_data)
        
        logger.info(f"Manual message sent to {phone_number}")
        
        return {
            "status": "success",
            "message": "Message sent successfully",
            "whatsapp_response": response
        }
        
    except Exception as e:
        logger.error(f"Error sending message to {phone_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.post("/{phone_number}/archive")
async def archive_conversation(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Archive a conversation"""
    try:
        contact = await get_contact_by_phone(db, phone_number)
        
        # If contact doesn't exist, create it
        if not contact:
            contact_data = {
                "phone_number": phone_number,
                "name": phone_number,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
            logger.info(f"Created contact for {phone_number} before archiving")
        
        # Check if is_archived column exists
        from sqlalchemy import update, text
        from app.models import Contact
        
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contacts' 
            AND column_name='is_archived'
        """)
        result = await db.execute(check_query)
        has_column = result.fetchone() is not None
        
        if not has_column:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archive feature not available. Please run migration: /admin/db/add-is-archived-column"
            )
        
        # Update contact to archived
        await db.execute(
            update(Contact)
            .where(Contact.id == contact.id)
            .values(is_archived=True)
        )
        await db.commit()
        
        # Verify update
        await db.refresh(contact)
        logger.info(f"Conversation with {phone_number} archived. Contact ID: {contact.id}, is_archived: {getattr(contact, 'is_archived', 'N/A')}")
        return {"status": "success", "message": "Conversation archived"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive conversation: {str(e)}"
        )

@router.post("/{phone_number}/unarchive")
async def unarchive_conversation(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unarchive a conversation"""
    try:
        contact = await get_contact_by_phone(db, phone_number)
        
        # If contact doesn't exist, create it
        if not contact:
            contact_data = {
                "phone_number": phone_number,
                "name": phone_number,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
            logger.info(f"Created contact for {phone_number} before unarchiving")
        
        # Check if is_archived column exists
        from sqlalchemy import update, text
        from app.models import Contact
        
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contacts' 
            AND column_name='is_archived'
        """)
        result = await db.execute(check_query)
        has_column = result.fetchone() is not None
        
        if not has_column:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archive feature not available. Please run migration: /admin/db/add-is-archived-column"
            )
        
        # Update contact to unarchived
        await db.execute(
            update(Contact)
            .where(Contact.id == contact.id)
            .values(is_archived=False)
        )
        await db.commit()
        
        logger.info(f"Conversation with {phone_number} unarchived")
        return {"status": "success", "message": "Conversation unarchived"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unarchiving conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unarchive conversation: {str(e)}"
        )

@router.post("/{phone_number}/send-product/{product_id}")
async def send_product(
    phone_number: str,
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a catalog product as a message with image"""
    try:
        # Get the product from catalog
        product = await get_catalog_item(db, product_id, current_user.id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Ensure contact exists
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            # Create contact if doesn't exist
            contact_data = {
                "phone_number": phone_number,
                "name": phone_number,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
        
        # Build the caption message
        caption = f"🏷️ Produto: {product.name}\n"
        caption += f"💰 Preço: {product.price}\n"
        if product.description:
            caption += f"📝 Descrição: {product.description}"
        
        # Send image via WhatsApp (if product has image)
        if product.image_url:
            response = await whatsapp_service.send_media_message(
                to=phone_number,
                media_url=product.image_url,
                media_type="image",
                caption=caption
            )
        else:
            # If no image, send as text message
            response = await whatsapp_service.send_message(
                to=phone_number,
                message=caption
            )
        
        # Extract message ID from WhatsApp response
        whatsapp_message_id = None
        if response.get("messages"):
            whatsapp_message_id = response["messages"][0].get("id")
        
        # Log the outgoing message
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="catalog" if product.image_url else "text",
            to_from=phone_number,
            content=caption,
            cost_estimate="0.005",
            status="sent",
            whatsapp_message_id=whatsapp_message_id,
            media_url=product.image_url if product.image_url else None,
            media_type="image" if product.image_url else None,
            media_filename=f"{product.name}.jpg" if product.image_url else None
        )
        await create_message_log(db, log_data)
        
        logger.info(f"Product '{product.name}' sent to {phone_number}")
        
        return {
            "status": "success",
            "message": "Product sent successfully",
            "product_name": product.name,
            "whatsapp_response": response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending product to {phone_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send product: {str(e)}"
        )

@router.get("/{phone_number}/ai-enabled")
async def get_contact_ai_enabled(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI enabled status for a specific contact"""
    try:
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )
        
        # Ensure contact belongs to current user
        if contact.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get contact's ai_enabled status (None = use user setting)
        contact_ai_enabled = getattr(contact, 'ai_enabled', None)
        
        # If contact has no override, get user setting
        if contact_ai_enabled is None:
            from app.crud import get_user_by_id
            user = await get_user_by_id(db, current_user.id)
            user_ai_enabled = getattr(user, 'ai_enabled', True)
            return {
                "ai_enabled": user_ai_enabled,
                "source": "user",  # 'user' or 'contact'
                "contact_override": None
            }
        
        return {
            "ai_enabled": contact_ai_enabled,
            "source": "contact",
            "contact_override": contact_ai_enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting contact AI enabled status: {e}")
        # Default to user setting on error
        from app.crud import get_user_by_id
        user = await get_user_by_id(db, current_user.id)
        user_ai_enabled = getattr(user, 'ai_enabled', True)
        return {
            "ai_enabled": user_ai_enabled,
            "source": "user",
            "contact_override": None
        }

class ContactAIEnabledUpdate(BaseModel):
    enabled: Optional[bool]  # None = use user setting, True/False = override

@router.put("/{phone_number}/ai-enabled")
async def update_contact_ai_enabled(
    phone_number: str,
    update_data: ContactAIEnabledUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    enabled = update_data.enabled
    """Update AI enabled status for a specific contact (None = use user setting)"""
    try:
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )
        
        # Ensure contact belongs to current user
        if contact.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check if ai_enabled column exists
        from sqlalchemy import text, update
        from app.models import Contact
        
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contacts' 
            AND column_name='ai_enabled'
        """)
        result = await db.execute(check_query)
        has_column = result.fetchone() is not None
        
        if not has_column:
            # Create column if it doesn't exist
            alter_query = text("ALTER TABLE contacts ADD COLUMN ai_enabled BOOLEAN")
            await db.execute(alter_query)
            await db.commit()
            logger.info("Created ai_enabled column in contacts table")
        
        # Update contact's ai_enabled status
        await db.execute(
            update(Contact)
            .where(Contact.id == contact.id)
            .values(ai_enabled=enabled)
        )
        await db.commit()
        
        logger.info(f"Updated AI enabled status for contact {phone_number}: {enabled}")
        
        status_text = "usar configuração global" if enabled is None else ("ativado" if enabled else "desativado")
        return {
            "ai_enabled": enabled,
            "message": f"IA para este contacto: {status_text}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact AI enabled status: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update contact AI setting: {str(e)}"
        )

