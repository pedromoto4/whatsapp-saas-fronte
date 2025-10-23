"""
Conversations Router
Handles WhatsApp-style conversation management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import ConversationResponse, ConversationMessageResponse, MessageSendRequest, MessageLogCreate
from app.crud import (
    get_conversations, 
    get_conversation_messages,
    get_contact_by_phone,
    create_contact_from_webhook,
    create_message_log
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

@router.get("/{phone_number}/messages", response_model=List[ConversationMessageResponse])
async def get_messages(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a specific conversation"""
    try:
        messages = await get_conversation_messages(db, current_user.id, phone_number)
        
        # Return messages with is_automated from database
        response = []
        for msg in messages:
            # is_automated vem do banco (True para FAQ/Catalog, False para mensagens manuais)
            # Templates também são considerados automáticos se enviados por campanha
            is_automated = msg.is_automated or bool(msg.template_name)
            response.append({
                'id': msg.id,
                'direction': msg.direction,
                'content': msg.content,
                'kind': msg.kind,
                'template_name': msg.template_name,
                'created_at': msg.created_at,
                'is_automated': is_automated
            })
        
        return response
    except Exception as e:
        logger.error(f"Error loading messages for {phone_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load messages: {str(e)}"
        )

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
        
        # Log the outgoing message
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="text",
            to_from=phone_number,
            content=message_request.content,
            cost_estimate="0.005"
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

