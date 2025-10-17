"""
WhatsApp Business API Service
Handles all WhatsApp Business API interactions
"""
import os
import json
import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.webhook_verify_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
        if not all([self.access_token, self.phone_number_id]):
            logger.warning("WhatsApp credentials not configured. Service will run in demo mode.")
    
    async def send_message(self, to: str, message: str, message_type: str = "text") -> Dict[str, Any]:
        """
        Send a message via WhatsApp Business API
        
        Args:
            to: Phone number in international format (e.g., +5511999999999)
            message: Message content
            message_type: Type of message (text, template, etc.)
        
        Returns:
            Dict with API response
        """
        if not self.access_token or not self.phone_number_id:
            # Demo mode - return mock response
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": to, "wa_id": to.replace("+", "")}],
                "messages": [{"id": f"demo_msg_{datetime.now().timestamp()}"}]
            }
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": message_type,
            "text": {"body": message} if message_type == "text" else message
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp API error: {e}")
            raise Exception(f"Failed to send WhatsApp message: {e}")
    
    async def send_template_message(self, to: str, template_name: str, 
                                  template_params: List[str] = None) -> Dict[str, Any]:
        """
        Send a template message via WhatsApp Business API
        
        Args:
            to: Phone number in international format
            template_name: Name of the approved template
            template_params: Parameters for template variables
        
        Returns:
            Dict with API response
        """
        if not self.access_token or not self.phone_number_id:
            # Demo mode
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": to, "wa_id": to.replace("+", "")}],
                "messages": [{"id": f"demo_template_{datetime.now().timestamp()}"}]
            }
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        template_data = {
            "name": template_name,
            "language": {"code": "pt_BR"}
        }
        
        if template_params:
            template_data["components"] = [{
                "type": "body",
                "parameters": [{"type": "text", "text": param} for param in template_params]
            }]
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": template_data
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp template API error: {e}")
            raise Exception(f"Failed to send WhatsApp template: {e}")
    
    async def get_message_templates(self) -> List[Dict[str, Any]]:
        """
        Get approved message templates
        
        Returns:
            List of approved templates
        """
        if not self.access_token:
            # Demo mode - return mock templates
            return [
                {
                    "name": "hello_world",
                    "status": "APPROVED",
                    "category": "UTILITY",
                    "language": "pt_BR",
                    "components": [{"type": "BODY", "text": "Hello {{1}}!"}]
                },
                {
                    "name": "order_confirmation",
                    "status": "APPROVED", 
                    "category": "UTILITY",
                    "language": "pt_BR",
                    "components": [{"type": "BODY", "text": "Seu pedido {{1}} foi confirmado!"}]
                }
            ]
        
        url = f"{self.base_url}/{self.phone_number_id}/message_templates"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp templates API error: {e}")
            return []
    
    async def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """
        Verify webhook for WhatsApp Business API
        
        Args:
            mode: Verification mode
            token: Verification token
            challenge: Challenge string
        
        Returns:
            Challenge string if verification successful, None otherwise
        """
        if mode == "subscribe" and token == self.webhook_verify_token:
            return challenge
        return None
    
    async def process_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming webhook from WhatsApp
        
        Args:
            data: Webhook payload from WhatsApp
        
        Returns:
            Processed webhook data
        """
        try:
            # Extract message data from webhook
            entry = data.get("entry", [])
            if not entry:
                return {"status": "no_entry"}
            
            changes = entry[0].get("changes", [])
            if not changes:
                return {"status": "no_changes"}
            
            value = changes[0].get("value", {})
            messages = value.get("messages", [])
            
            processed_messages = []
            
            for message in messages:
                processed_msg = {
                    "id": message.get("id"),
                    "from": message.get("from"),
                    "timestamp": message.get("timestamp"),
                    "type": message.get("type"),
                    "text": message.get("text", {}).get("body") if message.get("type") == "text" else None,
                    "statuses": value.get("statuses", [])
                }
                processed_messages.append(processed_msg)
            
            return {
                "status": "success",
                "messages": processed_messages,
                "contacts": value.get("contacts", [])
            }
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            return {"status": "error", "error": str(e)}
    
    def is_configured(self) -> bool:
        """
        Check if WhatsApp service is properly configured
        
        Returns:
            True if configured, False otherwise
        """
        return bool(self.access_token and self.phone_number_id)

# Global instance
whatsapp_service = WhatsAppService()
