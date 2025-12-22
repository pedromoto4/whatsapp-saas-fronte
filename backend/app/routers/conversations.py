"""
Conversations Router
Handles WhatsApp-style conversation management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging
import asyncio
import json

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
    # FORCE LOG - This should always appear
    import sys
    sys.stdout.write(f"\n\n{'='*80}\n")
    sys.stdout.write(f"[PRODUCT] ENDPOINT CALLED - product_id={product_id}, phone={phone_number}, user={current_user.id}\n")
    sys.stdout.write(f"{'='*80}\n\n")
    sys.stdout.flush()
    
    logger.info(f"[PRODUCT] Received request to send product {product_id} to {phone_number} (user: {current_user.id})")
    print(f"[PRODUCT] Received request to send product {product_id} to {phone_number} (user: {current_user.id})")
    try:
        # Get the product from catalog
        product = await get_catalog_item(db, product_id, current_user.id)
        if not product:
            logger.error(f"[PRODUCT] Product {product_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        logger.info(f"[PRODUCT] Product found: {product.name}, has_image_url: {bool(product.image_url)}, image_url: {product.image_url}")
        print(f"[PRODUCT] Product found: {product.name}, has_image_url: {bool(product.image_url)}, image_url: {product.image_url}")
        
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
        
        # Build the product description message
        description = f"🏷️ Produto: {product.name}\n"
        description += f"💰 Preço: {product.price}\n"
        if product.description:
            description += f"📝 Descrição: {product.description}"
        
        responses = []
        image_sent = False
        text_sent = False
        
        # Send image and description as separate messages (if product has image)
        if product.image_url:
            logger.info(f"[PRODUCT] Product has image URL, will send image first: {product.image_url}")
            print(f"[PRODUCT] Product has image URL, will send image first: {product.image_url}")
            
            # Validate image URL format
            if not product.image_url.startswith(('http://', 'https://')):
                logger.error(f"[PRODUCT] Invalid image URL format (must start with http:// or https://): {product.image_url}")
                print(f"[PRODUCT] ❌ Invalid image URL format: {product.image_url}")
                image_sent = False
            else:
                # First: Try to send image without caption
                try:
                    logger.info(f"[PRODUCT] Attempting to send image to {phone_number}, URL: {product.image_url}")
                    print(f"[PRODUCT] Attempting to send image to {phone_number}, URL: {product.image_url}")
                    image_response = await whatsapp_service.send_media_message(
                        to=phone_number,
                        media_url=product.image_url,
                        media_type="image",
                        caption=""  # No caption - send image first
                    )
                
                logger.info(f"[PRODUCT] Image response received: {image_response}")
                print(f"[PRODUCT] Image response received: {json.dumps(image_response, indent=2)}")
                
                # Check for errors first (including 24h window, invalid URL, etc.)
                if image_response and image_response.get("errors"):
                    error_details = image_response.get("errors", [])
                    logger.error(f"[PRODUCT] Failed to send image - WhatsApp errors: {error_details}")
                    print(f"[PRODUCT] Failed to send image - WhatsApp errors: {error_details}")
                    # Check for specific error types
                    for error in error_details:
                        error_code = error.get("code", 0)
                        error_message = error.get("message", "").lower()
                        error_subcode = error.get("error_subcode", 0)
                        logger.error(f"[PRODUCT] Image error - Code: {error_code}, Subcode: {error_subcode}, Message: {error_message}")
                        print(f"[PRODUCT] Image error - Code: {error_code}, Subcode: {error_subcode}, Message: {error_message}")
                        # Common errors:
                        # - 131047: 24h window
                        # - 131026: Invalid media URL
                        # - 131051: Media download failed
                        if error_code == 131047 or "24 hour" in error_message or "window" in error_message:
                            logger.warning(f"[PRODUCT] ⚠️ 24h window issue for image")
                            print(f"[PRODUCT] ⚠️ 24h window issue for image")
                        elif error_code == 131026 or "invalid" in error_message or "url" in error_message:
                            logger.error(f"[PRODUCT] ❌ Invalid image URL: {product.image_url}")
                            print(f"[PRODUCT] ❌ Invalid image URL: {product.image_url}")
                        elif error_code == 131051 or "download" in error_message or "fetch" in error_message:
                            logger.error(f"[PRODUCT] ❌ Failed to download image from URL: {product.image_url}")
                            print(f"[PRODUCT] ❌ Failed to download image from URL: {product.image_url}")
                    image_sent = False
                # Check if image was sent successfully
                elif image_response and image_response.get("messages") and len(image_response.get("messages", [])) > 0:
                    image_sent = True
                    responses.append(image_response)
                    
                    # Log the image message
                    image_message_id = image_response["messages"][0].get("id")
                    logger.info(f"[PRODUCT] Image message ID: {image_message_id}")
                    print(f"[PRODUCT] ✅ Image message ID: {image_message_id}")
                    
                    image_log_data = MessageLogCreate(
                        owner_id=current_user.id,
                        direction="out",
                        kind="catalog",
                        to_from=phone_number,
                        content="[Imagem do Produto]",
                        cost_estimate="0.005",
                        status="sent",
                        whatsapp_message_id=image_message_id,
                        media_url=product.image_url,
                        media_type="image",
                        media_filename=f"{product.name}.jpg"
                    )
                    await create_message_log(db, image_log_data)
                    logger.info(f"[PRODUCT] Image sent successfully to {phone_number}")
                    print(f"[PRODUCT] ✅ Image sent successfully to {phone_number}")
                else:
                    # No messages and no errors - this is suspicious
                    logger.warning(f"[PRODUCT] Image response has no messages and no errors: {image_response}")
                    print(f"[PRODUCT] ⚠️ Image response has no messages and no errors: {json.dumps(image_response, indent=2)}")
                    # Check if there's an error object instead of errors array
                    if image_response and image_response.get("error"):
                        error_obj = image_response.get("error", {})
                        logger.error(f"[PRODUCT] Image error object found: {error_obj}")
                        print(f"[PRODUCT] ❌ Image error object: {json.dumps(error_obj, indent=2)}")
                    image_sent = False
                        
                except Exception as image_error:
                    logger.error(f"[PRODUCT] Exception sending image to {phone_number}: {str(image_error)}", exc_info=True)
                    print(f"[PRODUCT] Exception sending image to {phone_number}: {str(image_error)}")
                    import traceback
                    print(f"[PRODUCT] Traceback: {traceback.format_exc()}")
                    image_sent = False
                    # Continue to send description even if image fails - DO NOT RAISE
            
            # Small delay to ensure image is sent before text (if image was sent)
            if image_sent:
                await asyncio.sleep(0.5)
            
            # Second: Always send description as text message (even if image failed)
            # This is CRITICAL - must always execute
            logger.info(f"[PRODUCT] Now sending description to {phone_number} (image_sent={image_sent})")
            print(f"[PRODUCT] Now sending description to {phone_number} (image_sent={image_sent})")
            print(f"[PRODUCT] Description text: {description[:100]}...")  # Log first 100 chars
            
            text_response = None
            try:
                text_response = await whatsapp_service.send_message(
                    to=phone_number,
                    message=description
                )
                
                logger.info(f"[PRODUCT] Text response received: {text_response}")
                print(f"[PRODUCT] Text response received: {json.dumps(text_response, indent=2)}")
                
                # Check for errors first (24h window, etc.)
                if text_response and text_response.get("errors"):
                    error_details = text_response.get("errors", [])
                    logger.error(f"[PRODUCT] WhatsApp errors when sending description: {error_details}")
                    print(f"[PRODUCT] WhatsApp errors when sending description: {error_details}")
                    # Check for 24h window error
                    for error in error_details:
                        error_code = error.get("code", 0)
                        error_message = error.get("message", "").lower()
                        if error_code == 131047 or "24 hour" in error_message or "window" in error_message:
                            logger.warning(f"[PRODUCT] 24h window issue - recipient may not have messaged in last 24h")
                            print(f"[PRODUCT] ⚠️ 24h window issue - recipient may not have messaged in last 24h")
                
                if text_response and text_response.get("messages") and len(text_response.get("messages", [])) > 0:
                    responses.append(text_response)
                    text_sent = True
                    print(f"[PRODUCT] Text message added to responses. Total responses: {len(responses)}")
                    
                    # Log the text message
                    text_message_id = text_response["messages"][0].get("id")
                    text_log_data = MessageLogCreate(
                        owner_id=current_user.id,
                        direction="out",
                        kind="text",
                        to_from=phone_number,
                        content=description,
                        cost_estimate="0.005",
                        status="sent",
                        whatsapp_message_id=text_message_id
                    )
                    await create_message_log(db, text_log_data)
                    logger.info(f"[PRODUCT] Description sent successfully to {phone_number}")
                    print(f"[PRODUCT] Description sent successfully to {phone_number}")
                else:
                    logger.error(f"[PRODUCT] Failed to send description - response: {text_response}")
                    print(f"[PRODUCT] Failed to send description - response: {json.dumps(text_response, indent=2)}")
            except Exception as text_error:
                logger.error(f"[PRODUCT] Exception sending description to {phone_number}: {str(text_error)}", exc_info=True)
                print(f"[PRODUCT] Exception sending description to {phone_number}: {str(text_error)}")
                import traceback
                print(f"[PRODUCT] Description exception traceback: {traceback.format_exc()}")
                # Don't raise - if image was sent, we still have partial success
                # Only raise if both image and text failed
                if not image_sent:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to send product: {str(text_error)}"
                    )
            
            print(f"[PRODUCT] After description send attempt - text_sent={text_sent}, responses_count={len(responses)}")
            
        else:
            # If no image, send as text message only
            try:
                response = await whatsapp_service.send_message(
                    to=phone_number,
                    message=description
                )
                responses.append(response)
                
                # Check if text was sent successfully
                if response and response.get("messages") and len(response.get("messages", [])) > 0:
                    text_sent = True
                
                # Log the outgoing message
                whatsapp_message_id = None
                if response.get("messages"):
                    whatsapp_message_id = response["messages"][0].get("id")
                
                log_data = MessageLogCreate(
                    owner_id=current_user.id,
                    direction="out",
                    kind="text",
                    to_from=phone_number,
                    content=description,
                    cost_estimate="0.005",
                    status="sent",
                    whatsapp_message_id=whatsapp_message_id
                )
                await create_message_log(db, log_data)
                logger.info(f"[PRODUCT] Description sent successfully to {phone_number} (no image)")
            except Exception as text_error:
                logger.error(f"[PRODUCT] Exception sending description to {phone_number}: {str(text_error)}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to send product: {str(text_error)}"
                )
        
        # Determine what was sent successfully
        # Use the flags we set during sending
        image_sent_success = image_sent
        text_sent_success = text_sent
        
        logger.info(f"[PRODUCT] Product '{product.name}' sent to {phone_number} - Responses: {len(responses)}, Image: {image_sent_success}, Text: {text_sent_success}")
        print(f"[PRODUCT] Product '{product.name}' sent to {phone_number} - Responses: {len(responses)}, Image: {image_sent_success}, Text: {text_sent_success}")
        
        # If text was sent OR image was sent, consider it a success
        if text_sent_success or image_sent_success:
            logger.info(f"[PRODUCT] Returning success response")
            print(f"[PRODUCT] Returning success response")
            status_message = "Product sent successfully"
            if product.image_url and not image_sent_success and text_sent_success:
                status_message = "Product description sent, but image failed to send. Please check image URL."
            elif product.image_url and image_sent_success and not text_sent_success:
                status_message = "Product image sent, but description failed to send."
            
            result = {
                "status": "success",
                "message": status_message,
                "product_name": product.name,
                "image_sent": image_sent_success,
                "description_sent": text_sent_success,
                "whatsapp_response": responses[-1] if responses else {},  # Return last response for compatibility
                "whatsapp_responses": responses,  # Return ALL responses (image + text)
                "messages_sent": len(responses),
                "note": "Se o destinatário não receber as mensagens, verifique se ele respondeu nas últimas 24 horas (janela de 24h do WhatsApp). Mensagens normais só podem ser enviadas dentro desta janela."
            }
            logger.info(f"[PRODUCT] Returning result: {json.dumps(result, indent=2)}")
            print(f"[PRODUCT] Returning result: {json.dumps(result, indent=2)}")
            return result
        else:
            # Nothing was sent - this is a real failure
            logger.error(f"[PRODUCT] Failed to send product '{product.name}' to {phone_number} - No successful responses")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send product. Please try again."
            )
        
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

