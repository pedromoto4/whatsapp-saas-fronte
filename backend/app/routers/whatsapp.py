"""
WhatsApp Business API Router
Handles WhatsApp-specific endpoints and webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
import logging
import os
import httpx
import uuid
from pathlib import Path
import mimetypes
import shutil
from datetime import datetime, timedelta

from app.dependencies import get_current_user, get_db
from app.models import User, Contact, Message
from app.schemas import MessageCreate, MessageResponse, ContactResponse
from app.whatsapp_service import whatsapp_service
from app.ai_service import ai_service
from app.crud import (
    create_message, 
    get_contact_by_phone, 
    create_contact_from_webhook, 
    match_faq_by_keywords, 
    build_catalog_message, 
    create_message_log, 
    get_faqs,
    get_catalog_items
)
from app.schemas import MessageLogCreate

logger = logging.getLogger(__name__)

# Media proxy endpoint handles authentication automatically

# Upload configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# File validation
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/avi", "video/mov", "video/wmv"]
ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"]

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB (WhatsApp limit)

def cleanup_old_files(days_old: int = 90):
    """
    Remove files older than specified days from /uploads directory
    Returns (deleted_count, total_size_freed)
    """
    if not UPLOAD_DIR.exists():
        return 0, 0
    
    cutoff_date = datetime.now() - timedelta(days=days_old)
    deleted_count = 0
    total_size_freed = 0
    
    try:
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                # Check file modification time
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                
                if file_mtime < cutoff_date:
                    file_size = file_path.stat().st_size
                    file_path.unlink()
                    deleted_count += 1
                    total_size_freed += file_size
                    logger.info(f"Deleted old file: {file_path.name} ({file_size} bytes)")
        
        if deleted_count > 0:
            logger.info(f"Cleanup complete: {deleted_count} files deleted, {total_size_freed / 1024 / 1024:.2f} MB freed")
        else:
            logger.info("No old files to cleanup")
            
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
    
    return deleted_count, total_size_freed

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

@router.post("/cleanup")
async def cleanup_old_files_endpoint(
    days_old: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger cleanup of old uploaded files
    Only accessible to authenticated users
    """
    deleted_count, total_size_freed = cleanup_old_files(days_old=days_old)
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "total_size_freed_mb": round(total_size_freed / 1024 / 1024, 2),
        "message": f"Cleanup complete: {deleted_count} files deleted, {round(total_size_freed / 1024 / 1024, 2)} MB freed"
    }


@router.get("/media/{media_id}")
async def serve_media_proxy(media_id: str):
    """
    Proxy media from WhatsApp with proper authentication
    Downloads and serves media directly without storing locally
    """
    try:
        # Get media URL from WhatsApp
        media_url = await whatsapp_service.get_media_url(media_id)
        if not media_url:
            raise HTTPException(status_code=404, detail="Media not found")
        
        # Download with authentication
        headers = {}
        if whatsapp_service.access_token:
            headers["Authorization"] = f"Bearer {whatsapp_service.access_token}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(media_url, headers=headers)
            response.raise_for_status()
            
            # Return the media content directly
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "image/jpeg"),
                headers={
                    "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                    "Content-Disposition": f"inline; filename={media_id}"
                }
            )
            
    except Exception as e:
        logger.error(f"Error proxying media {media_id}: {e}")
        raise HTTPException(status_code=500, detail="Error loading media")

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload media file for sending via WhatsApp
    """
    try:
        # Validate file size
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size after reading
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Validate file type
        file_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if not file_type:
            raise HTTPException(status_code=400, detail="Could not determine file type")
        
        # Check if file type is allowed
        allowed_types = ALLOWED_IMAGE_TYPES + ALLOWED_DOCUMENT_TYPES + ALLOWED_VIDEO_TYPES + ALLOWED_AUDIO_TYPES
        if file_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_type} not allowed. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Determine media type for WhatsApp
        if file_type in ALLOWED_IMAGE_TYPES:
            media_type = "image"
        elif file_type in ALLOWED_DOCUMENT_TYPES:
            media_type = "document"
        elif file_type in ALLOWED_VIDEO_TYPES:
            media_type = "video"
        elif file_type in ALLOWED_AUDIO_TYPES:
            media_type = "audio"
        else:
            media_type = "document"  # fallback
        
        # Generate public URL
        public_url = f"https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/uploads/{unique_filename}"
        
        logger.info(f"File uploaded: {file.filename} -> {unique_filename} ({media_type})")
        
        return {
            "success": True,
            "filename": unique_filename,
            "original_filename": file.filename,
            "media_type": media_type,
            "file_type": file_type,
            "size": len(content),
            "public_url": public_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Error uploading file")

@router.get("/uploads/{filename}")
async def serve_uploaded_file(filename: str):
    """
    Serve uploaded files publicly
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"
    
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename,
        headers={
            "Cache-Control": "public, max-age=3600"  # Cache for 1 hour
        }
    )

@router.post("/send-media")
async def send_media_message(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send media message via WhatsApp
    """
    try:
        # Get data from request body
        data = await request.json()
        logger.info(f"Received send-media request: {data}")
        
        phone_number = data.get("phone_number")
        media_url = data.get("media_url")
        media_type = data.get("media_type")
        caption = data.get("caption", "")
        
        logger.info(f"Parsed data - phone: {phone_number}, media_url: {media_url}, media_type: {media_type}, caption: {caption}")
        
        if not phone_number or not media_url or not media_type:
            logger.error(f"Missing required fields - phone: {phone_number}, media_url: {media_url}, media_type: {media_type}")
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: phone_number, media_url, media_type"
            )
        
        # Find or create contact
        contact = await get_contact_by_phone(db, phone_number)
        if not contact:
            contact_data = {
                "phone_number": phone_number,
                "name": phone_number,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
        
        # Send media via WhatsApp
        logger.info(f"Sending media to WhatsApp - to: {phone_number}, media_url: {media_url}, media_type: {media_type}")
        result = await whatsapp_service.send_media_message(
            to=phone_number,
            media_url=media_url,
            media_type=media_type,
            caption=caption
        )
        logger.info(f"WhatsApp response: {result}")
        
        # Log outgoing media message
        log_data = MessageLogCreate(
            owner_id=contact.owner_id,
            direction="out",
            kind="media",
            to_from=phone_number,
            content=caption or f"[{media_type.upper()}]",
            cost_estimate="0.00",
            media_url=media_url,
            media_type=media_type,
            media_filename=media_url.split('/')[-1]
        )
        await create_message_log(db, log_data)
        
        logger.info(f"Media message sent to {phone_number}: {media_type}")
        
        return {
            "success": True,
            "message": "Media message sent successfully",
            "message_id": result.get("messages", [{}])[0].get("id"),
            "media_type": media_type
        }
        
    except Exception as e:
        logger.error(f"Error sending media message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send media message: {str(e)}"
        )

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
        logger.info(f"🔔 Webhook recebido: {data}")
        
        # Process webhook data
        processed_data = await whatsapp_service.process_webhook(data)
        logger.info(f"📦 Dados processados: status={processed_data.get('status')}")
        
        # Handle incoming messages
        if processed_data.get("status") == "success":
            messages = processed_data.get("messages", [])
            logger.info(f"📨 Mensagens encontradas: {len(messages)}")
            
            if not messages:
                logger.warning("⚠️ Nenhuma mensagem encontrada no webhook")
                return {"status": "success", "detail": "No messages to process"}
            
            # Get default owner_id - try to find first active user, or use env variable
            from app.crud import get_user_by_id
            default_owner_id = int(os.getenv("WHATSAPP_DEFAULT_OWNER_ID", "1"))
            
            # Verify user exists
            default_user = await get_user_by_id(db, default_owner_id)
            if not default_user:
                # Try to get first active user
                from sqlalchemy import select
                from app.models import User
                result = await db.execute(select(User).where(User.is_active == True).limit(1))
                first_user = result.scalar_one_or_none()
                if first_user:
                    default_owner_id = first_user.id
                    logger.info(f"✅ Usando primeiro usuário ativo como padrão: {default_owner_id}")
                else:
                    logger.error(f"❌ Nenhum usuário ativo encontrado! Não é possível processar mensagens.")
                    return {"status": "error", "detail": "No active users found"}
            else:
                logger.info(f"✅ Usando owner_id configurado: {default_owner_id} ({default_user.email})")
            
            for msg in messages:
                # Find or create contact
                phone_number = f"+{msg['from']}"
                contact = await get_contact_by_phone(db, phone_number)
                
                if not contact:
                    # Create contact for incoming message
                    contact_data = {
                        "phone_number": phone_number,
                        "name": phone_number,
                        "owner_id": default_owner_id
                    }
                    contact = await create_contact_from_webhook(db, contact_data)
                    logger.info(f"Created new contact {phone_number} for owner_id={default_owner_id}")
                
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
                    logger.info(f"Processing message for owner_id={contact.owner_id}, text='{normalized_text}'")
                    
                    # Check if it's a catalog request
                    catalog_keywords = ["lista", "preços", "precos", "catálogo", "catalogo", "produtos", "menu"]
                    is_catalog_request = any(keyword in normalized_text for keyword in catalog_keywords)
                    
                    if is_catalog_request:
                        logger.info(f"Catalog request detected: {message_text}")
                        try:
                            catalog_message = await build_catalog_message(db, contact.owner_id)
                            if catalog_message:
                                await whatsapp_service.send_message(
                                    to=phone_number,
                                    message=catalog_message
                                )
                                logger.info(f"Catalog sent to {phone_number}")
                            else:
                                logger.warning(f"No catalog items found for owner_id={contact.owner_id}")
                            
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
                        logger.info(f"Attempting FAQ match for owner_id={contact.owner_id}")
                        matched_faq = await match_faq_by_keywords(db, contact.owner_id, message_text)
                        logger.info(f"FAQ match result for '{message_text}': {matched_faq is not None}")
                        
                        if matched_faq:
                            logger.info(f"FAQ matched: {matched_faq.question}")
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
                            # No FAQ matched - try AI fallback (if enabled)
                            logger.info(f"No FAQ or catalog matched for message: {message_text}")
                            
                            # Check if AI is enabled for this contact/user
                            # First check contact override, then user setting
                            contact_ai_enabled = getattr(contact, 'ai_enabled', None)
                            
                            if contact_ai_enabled is None:
                                # Use user setting
                                from app.crud import get_user_by_id
                                user = await get_user_by_id(db, contact.owner_id)
                                ai_enabled = getattr(user, 'ai_enabled', True)  # Default to True
                            else:
                                # Use contact override
                                ai_enabled = contact_ai_enabled
            
                            if ai_enabled:
                                try:
                                    # Get FAQs and catalog for context
                                    faqs = await get_faqs(db, contact.owner_id)
                                    catalog = await get_catalog_items(db, contact.owner_id)
                                    
                                    # Prepare context
                                    faq_list = [{"question": faq.question, "answer": faq.answer} for faq in faqs]
                                    catalog_list = [{"name": item.name, "price": item.price} for item in catalog]
                                    
                                    # Generate AI response
                                    ai_response = await ai_service.generate_fallback_response(
                                        user_message=message_text,
                                        faqs=faq_list,
                                        catalog_items=catalog_list
                                    )
                                    
                                    if ai_response:
                                        logger.info(f"AI generated response: {ai_response[:50]}...")
                                        await whatsapp_service.send_message(
                                            to=phone_number,
                                            message=ai_response
                                        )
                                        
                                        # Log AI response
                                        out_log = MessageLogCreate(
                                            owner_id=contact.owner_id,
                                            direction="out",
                                            kind="text",
                                            to_from=phone_number,
                                            content=ai_response,
                                            cost_estimate="0.015",  # AI responses cost more
                                            is_automated=True
                                        )
                                        await create_message_log(db, out_log)
                                        logger.info(f"AI response sent to {phone_number}")
                                    else:
                                        logger.info(f"AI not configured or failed - no response sent")
                                        
                                except Exception as e:
                                    logger.error(f"Failed to generate AI response: {e}")
                            else:
                                logger.info(f"AI responses disabled for user {contact.owner_id} - no response sent")
                    
                    # Save incoming message to messages table
                    message_data = {
                        "contact_id": contact.id,
                        "content": msg["text"],
                        "status": "received"
                    }
                    await create_message(db, message_data)
                
                # Handle media messages (image, document, video, audio)
                elif msg.get("type") in ["image", "document", "video", "audio"] and msg.get("media"):
                    media_info = msg["media"]
                    media_type = msg["type"]
                    logger.info(f"Received {media_type} from {phone_number}")
                    
                    # Get media URL from WhatsApp
                    try:
                        media_url = await whatsapp_service.get_media_url(media_info["id"])
                    except Exception as e:
                        logger.error(f"Error getting media URL: {e}")
                        media_url = None
                    
                    # Log incoming media message
                    try:
                        caption = media_info.get("caption", "")
                        filename = media_info.get("filename", f"{media_type}_{media_info['id']}")
                        
                        # Store media_id for proxy endpoint (no need to download/store locally)
                        final_media_url = media_info["id"]  # Store the media_id, not the URL
                        
                        log_data = MessageLogCreate(
                            owner_id=contact.owner_id,
                            direction="in",
                            kind="media",
                            to_from=phone_number,
                            content=caption or f"[{media_type.upper()}]",
                            cost_estimate="0.00",
                            media_url=final_media_url,
                            media_type=media_type,
                            media_filename=filename
                        )
                        await create_message_log(db, log_data)
                        logger.info(f"Logged {media_type} from {phone_number} (media_id: {media_info['id']})")
                    except Exception as e:
                        logger.error(f"Error saving media message: {e}")
            
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
        import traceback
        logger.error(f"❌ Erro ao processar webhook: {e}")
        logger.error(f"Traceback completo:\n{traceback.format_exc()}")
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
