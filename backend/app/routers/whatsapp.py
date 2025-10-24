"""
WhatsApp Business API Router
Handles WhatsApp-specific endpoints and webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
import logging
import os

from app.dependencies import get_current_user, get_db
from app.models import User, Contact, Message
from app.schemas import MessageCreate, MessageResponse, ContactResponse
from app.whatsapp_service import whatsapp_service
from app.crud import create_message, get_contact_by_phone, create_contact_from_webhook, match_faq_by_keywords, build_catalog_message, create_message_log
from app.schemas import MessageLogCreate

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
            contact = await create_contact_from_webhook(db, contact_data)
        
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
        
        # Log outgoing message
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="text",
            to_from=message_data.phone_number,
            content=message_data.content,
            cost_estimate="0.005"
        )
        await create_message_log(db, log_data)
        
        return {
            "success": True,
            "message": "Message sent successfully",
            "whatsapp_response": response,
            "message_id": message.id,
            "delivery_info": {
                "status": "sent",
                "note": "Message sent to WhatsApp API. Actual delivery depends on WhatsApp's 24-hour window rule.",
                "troubleshooting": {
                    "if_not_delivered": "Recipient may need to message your business number first to open 24h window",
                    "alternative": "Use approved message templates for guaranteed delivery"
                }
            }
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
            contact = await create_contact_from_webhook(db, contact_data)
        
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

@router.get("/firebase/status")
async def firebase_status():
    """Check Firebase Admin configuration status"""
    import firebase_admin
    from firebase_admin import auth
    
    try:
        # Check if Firebase Admin is initialized
        apps = firebase_admin._apps
        is_initialized = len(apps) > 0
        
        # Check environment variables
        firebase_creds_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "{}")
        has_creds = firebase_creds_str != "{}" and firebase_creds_str != ""
        
        return {
            "firebase_admin_initialized": is_initialized,
            "has_firebase_credentials": has_creds,
            "credentials_length": len(firebase_creds_str),
            "apps_count": len(apps) if apps else 0,
            "error": None
        }
    except Exception as e:
        return {
            "firebase_admin_initialized": False,
            "has_firebase_credentials": False,
            "credentials_length": 0,
            "apps_count": 0,
            "error": str(e)
        }

@router.get("/webhook/config")
async def webhook_config():
    """Show webhook configuration status"""
    try:
        return {
            "webhook_verify_token_set": bool(whatsapp_service.webhook_verify_token),
            "webhook_verify_token_length": len(whatsapp_service.webhook_verify_token) if whatsapp_service.webhook_verify_token else 0,
            "demo_mode": whatsapp_service.demo_mode,
            "access_token_set": bool(whatsapp_service.access_token),
            "phone_number_id_set": bool(whatsapp_service.phone_number_id)
        }
    except Exception as e:
        logger.error(f"Error in webhook config: {e}")
        return {"error": str(e)}

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Verify WhatsApp webhook"""
    logger.info(f"Webhook verification attempt: mode={hub_mode}, token={hub_verify_token}, challenge={hub_challenge}")
    
    if not hub_mode or not hub_challenge or not hub_verify_token:
        logger.warning("Missing webhook parameters")
        return Response(
            content="Missing required webhook parameters: hub.mode, hub.challenge, hub.verify_token",
            status_code=400,
            media_type="text/plain"
        )
    
    challenge_result = whatsapp_service.verify_webhook(
        mode=hub_mode,
        token=hub_verify_token,
        challenge=hub_challenge
    )
    
    if challenge_result:
        logger.info("Webhook verification successful")
        return Response(content=challenge_result, media_type="text/plain")
    else:
        logger.warning("Webhook verification failed - invalid token")
        return Response(
            content="Webhook verification failed",
            status_code=403,
            media_type="text/plain"
        )

@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive WhatsApp webhook notifications"""
    try:
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Process webhook data
        processed_data = await whatsapp_service.process_webhook(data)
        
        # DEBUG: Log processed data
        print(f"🔍 PROCESSED DATA: {processed_data}")
        print(f"📬 MESSAGES COUNT: {len(processed_data.get('messages', []))}")
        print(f"✅ STATUS: {processed_data.get('status')}")
        
        # Handle incoming messages
        if processed_data.get("status") == "success":
            messages = processed_data.get("messages", [])
            print(f"🔄 ENTERING MESSAGE LOOP with {len(messages)} messages")
            
            for msg in messages:
                # DEBUG: Log raw message
                print(f"📨 RAW MESSAGE from webhook: {msg}")
                
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
                    contact = await create_contact_from_webhook(db, contact_data)
                
                # DEBUG: Check message type and conditions
                print(f"🔍 MESSAGE TYPE: {msg.get('type')}")
                print(f"🔍 HAS TEXT: {bool(msg.get('text'))}")
                print(f"🔍 HAS MEDIA: {bool(msg.get('media'))}")
                print(f"🔍 IS IMAGE TYPE: {msg.get('type') in ['image', 'document', 'video', 'audio']}")
                
                # Handle text messages
                if msg.get("type") == "text" and msg.get("text"):
                    # Process incoming message
                    message_text = msg["text"]
                    logger.info(f"Received text message from {phone_number}: {message_text}")
                    
                    # Log incoming message FIRST (before processing)
                    log_data = MessageLogCreate(
                        owner_id=contact.owner_id,
                        direction="in",
                        kind="text",
                        to_from=phone_number,
                        content=message_text,
                        cost_estimate="0.00"
                    )
                    await create_message_log(db, log_data)
                    
                    normalized_text = message_text.lower().strip()
                    
                    # Check if it's a catalog request
                    catalog_keywords = ["lista", "preços", "precos", "catálogo", "catalogo", "produtos", "menu"]
                    is_catalog_request = any(keyword in normalized_text for keyword in catalog_keywords)
                    
                    if is_catalog_request:
                        logger.info(f"Catalog request detected: {message_text}")
                        try:
                            catalog_message = await build_catalog_message(db, contact.owner_id)
                            await whatsapp_service.send_message(
                                to=phone_number,
                                message=catalog_message
                            )
                            logger.info(f"Catalog sent to {phone_number}")
                            
                            # Log outgoing catalog message
                            out_log = MessageLogCreate(
                                owner_id=contact.owner_id,
                                direction="out",
                                kind="text",
                                to_from=phone_number,
                                content=catalog_message,
                                cost_estimate="0.005",  # Estimativa de custo
                                is_automated=True  # Resposta automática
                            )
                            await create_message_log(db, out_log)
                        except Exception as e:
                            logger.error(f"Failed to send catalog: {e}")
                    else:
                        # Try to match FAQ
                        matched_faq = await match_faq_by_keywords(db, contact.owner_id, message_text)
                        logger.info(f"FAQ match result for '{message_text}': {matched_faq is not None}")
                        
                        if matched_faq:
                            # Send FAQ response
                            try:
                                logger.info(f"Sending FAQ response: {matched_faq.answer}")
                                await whatsapp_service.send_message(
                                    to=phone_number,
                                    message=matched_faq.answer
                                )
                                logger.info(f"FAQ response sent to {phone_number}: {matched_faq.question}")
                                
                                # Log outgoing FAQ message
                                out_log = MessageLogCreate(
                                    owner_id=contact.owner_id,
                                    direction="out",
                                    kind="text",
                                    to_from=phone_number,
                                    content=matched_faq.answer,
                                    cost_estimate="0.005",
                                    is_automated=True  # Resposta automática
                                )
                                await create_message_log(db, out_log)
                            except Exception as e:
                                logger.error(f"Failed to send FAQ response: {e}")
                        else:
                            logger.info(f"No FAQ or catalog matched for message: {message_text}")
                    
                    # Save incoming message to messages table
                    message_data = {
                        "contact_id": contact.id,
                        "content": msg["text"],
                        "status": "received"
                    }
                    await create_message(db, message_data)
                
                # Handle media messages (image, document, video, audio)
                elif msg.get("type") in ["image", "document", "video", "audio"] and msg.get("media"):
                    print(f"🎯 ENTERING MEDIA BLOCK!")
                    media_info = msg["media"]
                    media_type = msg["type"]
                    print(f"🖼️ Received {media_type} from {phone_number}")
                    print(f"📦 Media info: {media_info}")
                    
                    # Get media URL from WhatsApp
                    try:
                        media_url = await whatsapp_service.get_media_url(media_info["id"])
                        print(f"🔗 Media URL obtained: {media_url}")
                    except Exception as e:
                        print(f"❌ Error getting media URL: {e}")
                        media_url = None
                    
                    # Log incoming media message
                    try:
                        caption = media_info.get("caption", "")
                        filename = media_info.get("filename", f"{media_type}_{media_info['id']}")
                        
                        log_data = MessageLogCreate(
                            owner_id=contact.owner_id,
                            direction="in",
                            kind="media",
                            to_from=phone_number,
                            content=caption or f"[{media_type.upper()}]",
                            cost_estimate="0.00",
                            media_url=media_url,
                            media_type=media_type,
                            media_filename=filename
                        )
                        await create_message_log(db, log_data)
                        print(f"✅ Logged {media_type} from {phone_number} - URL: {media_url}, Type: {media_type}, Filename: {filename}")
                    except Exception as e:
                        print(f"❌ Error saving media message: {e}")
            
            # Handle status updates (delivered, read)
            statuses = processed_data.get("statuses", [])
            for status_update in statuses:
                message_id = status_update.get("id")
                status_value = status_update.get("status")  # sent, delivered, read
                
                if message_id and status_value:
                    logger.info(f"Status update for message {message_id}: {status_value}")
                    
                    # Update message log status
                    from sqlalchemy import select, update, text
                    from app.models import MessageLog
                    
                    try:
                        # Check if status and whatsapp_message_id columns exist
                        check_result = await db.execute(text(
                            "SELECT column_name FROM information_schema.columns "
                            "WHERE table_name='message_logs' AND column_name IN ('status', 'whatsapp_message_id')"
                        ))
                        existing_columns = {row[0] for row in check_result.fetchall()}
                        
                        has_status = 'status' in existing_columns
                        has_whatsapp_message_id = 'whatsapp_message_id' in existing_columns
                        
                        if not has_status or not has_whatsapp_message_id:
                            logger.warning(f"Status columns not yet created in database. Skipping status update.")
                            continue
                        
                        # Find message by whatsapp_message_id
                        result = await db.execute(
                            select(MessageLog).where(MessageLog.whatsapp_message_id == message_id)
                        )
                        message_log = result.scalar_one_or_none()
                        
                        if message_log:
                            # Update status
                            await db.execute(
                                update(MessageLog)
                                .where(MessageLog.id == message_log.id)
                                .values(status=status_value)
                            )
                            await db.commit()
                            logger.info(f"Updated message {message_id} status to {status_value}")
                        else:
                            logger.warning(f"Message {message_id} not found in database")
                    except Exception as e:
                        logger.error(f"Error updating message status: {e}")
        
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
