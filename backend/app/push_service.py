"""
Push Notification Service
Handles sending push notifications via Expo Push Notification Service
"""
import httpx
import os
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
        token: Expo push token
        title: Notification title
        body: Notification body
        data: Optional data payload
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        payload = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "messages"
        }
        
        if data:
            payload["data"] = data
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(EXPO_PUSH_URL, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                # Check if notification was successfully queued
                if result.get("data") and result["data"].get("status") == "ok":
                    logger.info(f"Push notification sent successfully to {token[:20]}...")
                    return True
                else:
                    logger.warning(f"Push notification failed: {result}")
                    return False
            else:
                logger.error(f"Failed to send push notification: {response.status_code} - {response.text}")
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
            logger.info(f"No active push tokens found for user {user_id}")
            return 0
        
        # Send notification to all tokens
        success_count = 0
        for token_obj in tokens:
            success = await send_push_notification(
                token_obj.token,
                title,
                body,
                data
            )
            if success:
                success_count += 1
        
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

