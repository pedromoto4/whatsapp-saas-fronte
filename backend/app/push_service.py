"""
Push Notification Service
Handles sending push notifications via Expo Push Notification Service
"""
import httpx
import os
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.models import PushToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> bool:
    """
    Send a push notification to a single device using Expo Push Notification Service
    
    Args:
        token: Expo push token (should be in format ExponentPushToken[...])
        title: Notification title
        body: Notification body
        data: Optional data payload
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Log the notification attempt
        logger.info(f"📤 Sending push notification to token: {token[:30]}...")
        logger.info(f"   Title: {title}")
        logger.info(f"   Body: {body[:50]}...")
        # Expo Push API expects an array of messages
        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "messages"
        }
        
        if data:
            message["data"] = data
        
        # Send as array of messages
        payload = [message]
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(EXPO_PUSH_URL, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                # Expo returns an object with "data" array containing results for each message
                if result.get("data") and len(result["data"]) > 0:
                    message_result = result["data"][0]
                    if message_result.get("status") == "ok":
                        logger.info(f"✅ Push notification sent successfully to {token[:30]}...")
                        logger.info(f"   Receipt ID: {message_result.get('id', 'N/A')}")
                        return True
                    else:
                        error_message = message_result.get("message", "Unknown error")
                        error_code = message_result.get("details", {}).get("error", "N/A")
                        logger.warning(f"⚠️  Push notification failed: {error_message} (code: {error_code})")
                        logger.warning(f"   Full result: {message_result}")
                        return False
                else:
                    logger.warning(f"⚠️  Push notification failed: {result}")
                    return False
            else:
                logger.error(f"❌ Failed to send push notification: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False

async def send_push_to_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> int:
    """
    Send push notification to all active devices of a user
    
    Args:
        db: Database session
        user_id: User ID
        title: Notification title
        body: Notification body
        data: Optional data payload
    
    Returns:
        int: Number of notifications sent successfully
    """
    try:
        # Get all active push tokens for the user
        result = await db.execute(
            select(PushToken).where(
                PushToken.owner_id == user_id,
                PushToken.is_active == True
            )
        )
        tokens = result.scalars().all()
        
        if not tokens:
            logger.info(f"⚠️  No active push tokens found for user {user_id}")
            return 0
        
        logger.info(f"📱 Found {len(tokens)} active push token(s) for user {user_id}")
        
        # Send notification to all tokens
        success_count = 0
        for token_obj in tokens:
            logger.info(f"   Token: {token_obj.token[:30]}... (platform: {token_obj.platform})")
            success = await send_push_notification(
                token_obj.token,
                title,
                body,
                data
            )
            if success:
                success_count += 1
                # Update token's updated_at to mark it as recently used
                await db.execute(
                    update(PushToken)
                    .where(PushToken.id == token_obj.id)
                    .values(updated_at=datetime.utcnow())
                )
                await db.commit()
        
        logger.info(f"Sent push notifications to {success_count}/{len(tokens)} devices for user {user_id}")
        return success_count
        
    except Exception as e:
        logger.error(f"Error sending push to user {user_id}: {e}")
        return 0

async def send_new_message_notification(
    db: AsyncSession,
    user_id: int,
    contact_name: str,
    phone_number: str,
    message_preview: str
) -> int:
    """
    Send push notification when a new message is received
    
    Args:
        db: Database session
        user_id: User ID
        contact_name: Name of the contact (or phone number if no name)
        phone_number: Phone number
        message_preview: Preview of the message (first 100 chars)
    
    Returns:
        int: Number of notifications sent
    """
    title = f"Nova mensagem de {contact_name or phone_number}"
    body = message_preview[:100] + ("..." if len(message_preview) > 100 else "")
    
    data = {
        "type": "new_message",
        "phone_number": phone_number,
        "contact_name": contact_name
    }
    
    return await send_push_to_user(db, user_id, title, body, data)

async def cleanup_inactive_tokens(
    db: AsyncSession,
    days_inactive: int = 90
) -> int:
    """
    Clean up inactive push tokens that haven't been updated in the specified number of days
    
    Args:
        db: Database session
        days_inactive: Number of days of inactivity before considering a token inactive
    
    Returns:
        int: Number of tokens deactivated
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_inactive)
        
        # Find tokens that are inactive (not updated recently) or already marked as inactive
        result = await db.execute(
            select(PushToken).where(
                (PushToken.updated_at < cutoff_date) | (PushToken.is_active == False)
            )
        )
        inactive_tokens = result.scalars().all()
        
        if not inactive_tokens:
            logger.info("No inactive push tokens to clean up")
            return 0
        
        # Deactivate tokens that are old but still marked as active
        deactivated_count = 0
        for token in inactive_tokens:
            if token.is_active and token.updated_at < cutoff_date:
                await db.execute(
                    update(PushToken)
                    .where(PushToken.id == token.id)
                    .values(is_active=False)
                )
                deactivated_count += 1
                logger.info(f"Deactivated inactive push token {token.id} (last updated: {token.updated_at})")
        
        await db.commit()
        logger.info(f"Cleaned up {deactivated_count} inactive push tokens (older than {days_inactive} days)")
        return deactivated_count
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error cleaning up inactive push tokens: {e}")
        return 0

