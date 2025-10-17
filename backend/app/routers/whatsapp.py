"""
WhatsApp Business API Router
Handles WhatsApp-specific endpoints and webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
import logging

from app.dependencies import get_current_user, get_db
from app.models import User, Contact, Message
from app.schemas import MessageCreate, MessageResponse, ContactResponse
from app.whatsapp_service import whatsapp_service
from app.crud import create_message, get_contact_by_phone, create_contact

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

@router.get("/status")
async def get_whatsapp_status():
    """Check WhatsApp service configuration status"""
    return {
        "configured": whatsapp_service.is_configured(),
        "service": "WhatsApp Business API",
        "demo_mode": not whatsapp_service.is_configured()
    }

@router.post("/send-message")
async def send_whatsapp_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message via WhatsApp Business API"""
    try:
        # Find or create contact
        contact = await get_contact_by_phone(db, message_data.phone_number)
        if not contact:
            # Create new contact
            contact_data = {
                "phone_number": message_data.phone_number,
                "name": message_data.phone_number,  # Default name
                "owner_id": current_user.id
            }
            contact = await create_contact(db, contact_data)
        
        # Send message via WhatsApp API
        response = await whatsapp_service.send_message(
            to=message_data.phone_number,
            message=message_data.content
        )
        
        # Save message to database
        message_data_dict = {
            "contact_id": contact.id,
            "content": message_data.content,
            "status": "sent" if response.get("messages") else "failed"
        }
        
        if message_data.campaign_id:
            message_data_dict["campaign_id"] = message_data.campaign_id
        
        message = await create_message(db, message_data_dict)
        
        return {
            "success": True,
            "message": "Message sent successfully",
            "whatsapp_response": response,
            "message_id": message.id
        }
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.post("/send-template")
async def send_template_message(
    to: str,
    template_name: str,
    template_params: Optional[List[str]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a template message via WhatsApp Business API"""
    try:
        # Find or create contact
        contact = await get_contact_by_phone(db, to)
        if not contact:
            contact_data = {
                "phone_number": to,
                "name": to,
                "owner_id": current_user.id
            }
            contact = await create_contact(db, contact_data)
        
        # Send template via WhatsApp API
        response = await whatsapp_service.send_template_message(
            to=to,
            template_name=template_name,
            template_params=template_params or []
        )
        
        # Save message to database
        message_content = f"Template: {template_name}"
        if template_params:
            message_content += f" - Params: {', '.join(template_params)}"
        
        message_data = {
            "contact_id": contact.id,
            "content": message_content,
            "status": "sent" if response.get("messages") else "failed"
        }
        
        message = await create_message(db, message_data)
        
        return {
            "success": True,
            "message": "Template sent successfully",
            "whatsapp_response": response,
            "message_id": message.id
        }
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send template: {str(e)}"
        )

@router.get("/templates")
async def get_message_templates(current_user: User = Depends(get_current_user)):
    """Get approved WhatsApp message templates"""
    try:
        templates = await whatsapp_service.get_message_templates()
        return {
            "success": True,
            "templates": templates
        }
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get templates: {str(e)}"
        )

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = None,
    hub_challenge: str = None,
    hub_verify_token: str = None
):
    """Verify WhatsApp webhook"""
    logger.info(f"Webhook verification attempt: mode={hub_mode}, token={hub_verify_token}, challenge={hub_challenge}")
    
    if not hub_mode or not hub_challenge or not hub_verify_token:
        logger.warning("Missing webhook parameters")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required webhook parameters"
        )
    
    challenge = whatsapp_service.verify_webhook(
        mode=hub_mode,
        token=hub_verify_token,
        challenge=hub_challenge
    )
    
    if challenge:
        logger.info("Webhook verification successful")
        return Response(content=challenge, media_type="text/plain")
    else:
        logger.warning("Webhook verification failed - invalid token")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Webhook verification failed"
        )

@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive WhatsApp webhook notifications"""
    try:
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Process webhook data
        processed_data = await whatsapp_service.process_webhook(data)
        
        # Handle incoming messages
        if processed_data.get("status") == "success":
            messages = processed_data.get("messages", [])
            
            for msg in messages:
                if msg.get("type") == "text" and msg.get("text"):
                    # Find or create contact
                    phone_number = f"+{msg['from']}"
                    contact = await get_contact_by_phone(db, phone_number)
                    
                    if not contact:
                        # Create contact for incoming message
                        contact_data = {
                            "phone_number": phone_number,
                            "name": phone_number,
                            "owner_id": 1  # Default owner - should be improved
                        }
                        contact = await create_contact(db, contact_data)
                    
                    # Save incoming message
                    message_data = {
                        "contact_id": contact.id,
                        "content": msg["text"],
                        "status": "received"
                    }
                    await create_message(db, message_data)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "error": str(e)}

@router.get("/contacts/{phone_number}/messages")
async def get_contact_messages(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a specific contact"""
    try:
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )
        
        # Get messages for this contact
        from app.crud import get_messages_by_contact
        messages = await get_messages_by_contact(db, contact.id)
        
        return {
            "success": True,
            "contact": ContactResponse.from_orm(contact),
            "messages": [MessageResponse.from_orm(msg) for msg in messages]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting contact messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )
