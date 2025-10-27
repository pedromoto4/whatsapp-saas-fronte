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
        
        # Check if demo mode is enabled
        demo_mode_env = os.getenv("WHATSAPP_DEMO_MODE", "true").lower()
        self.demo_mode = demo_mode_env == "true" or not all([self.access_token, self.phone_number_id])
        
        if self.demo_mode:
            logger.warning("WhatsApp service running in DEMO MODE.")
        else:
            logger.info("WhatsApp service running in PRODUCTION MODE.")
    
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
        
        # Normalize phone number
        normalized_to = to.strip()
        if not normalized_to.startswith('+'):
            normalized_to = '+' + normalized_to
        
        # Log attempt
        logger.info(f"Attempting to send message to: {normalized_to}")
        logger.info(f"Message content: {message[:50]}..." if len(message) > 50 else f"Message content: {message}")
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": message_type,
            "text": {"body": message} if message_type == "text" else message
        }
        
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                
                # Log detailed response for debugging
                logger.info(f"WhatsApp API Response Status: {response.status_code}")
                logger.info(f"WhatsApp API Response Body: {response.text}")
                
                response.raise_for_status()
                response_data = response.json()
                
                # Add delivery status information
                if response_data.get("messages"):
                    message_id = response_data["messages"][0].get("id")
                    logger.info(f"Message sent successfully with ID: {message_id}")
                    
                    # Add helpful information about delivery
                    response_data["delivery_info"] = {
                        "message_id": message_id,
                        "status": "sent",
                        "note": "Message sent to WhatsApp. Delivery depends on 24h window rule and recipient's WhatsApp status."
                    }
                
                return response_data
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp API error: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Error response: {e.response.text}")
                try:
                    error_data = e.response.json()
                    error_message = error_data.get("error", {}).get("message", str(e))
                    error_code = error_data.get("error", {}).get("code", "unknown")
                    logger.error(f"Error code: {error_code}, Message: {error_message}")
                except:
                    pass
            raise Exception(f"Failed to send WhatsApp message: {e}")
        except Exception as e:
            logger.error(f"Unexpected error sending message: {e}")
            raise Exception(f"Failed to send WhatsApp message: {e}")

    async def send_media_message(self, to: str, media_url: str, media_type: str, caption: str = "") -> Dict[str, Any]:
        """
        Send a media message via WhatsApp Business API
        
        Args:
            to: Phone number in international format (e.g., +5511999999999)
            media_url: Public URL of the media file
            media_type: Type of media (image, document, video, audio)
            caption: Optional caption for the media
        
        Returns:
            Dict with API response
        """
        if not self.access_token or not self.phone_number_id:
            # Demo mode - return mock response
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": to, "wa_id": to.replace("+", "")}],
                "messages": [{"id": f"demo_media_{datetime.now().timestamp()}"}]
            }
        
        # Normalize phone number
        normalized_to = to.strip()
        if not normalized_to.startswith('+'):
            normalized_to = '+' + normalized_to
        
        # Log attempt
        logger.info(f"Attempting to send {media_type} to: {normalized_to}")
        logger.info(f"Media URL: {media_url}")
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Build media payload based on type
        media_payload = {
            "link": media_url
        }
        
        if caption:
            media_payload["caption"] = caption
        
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": media_type,
            media_type: media_payload
        }
        
        logger.info(f"Media payload: {json.dumps(payload, indent=2)}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                
                # Log detailed response for debugging
                logger.info(f"WhatsApp API Response Status: {response.status_code}")
                logger.info(f"WhatsApp API Response Body: {response.text}")
                
                response.raise_for_status()
                response_data = response.json()
                
                # Add delivery status information
                if response_data.get("messages"):
                    message_id = response_data["messages"][0].get("id")
                    logger.info(f"Media message sent successfully with ID: {message_id}")
                    
                    response_data["delivery_info"] = {
                        "message_id": message_id,
                        "status": "sent",
                        "media_type": media_type,
                        "note": "Media message sent to WhatsApp. Delivery depends on 24h window rule and recipient's WhatsApp status."
                    }
                
                return response_data
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp API error: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Error response: {e.response.text}")
                try:
                    error_data = e.response.json()
                    error_message = error_data.get("error", {}).get("message", str(e))
                    error_code = error_data.get("error", {}).get("code", "unknown")
                    logger.error(f"Error code: {error_code}, Message: {error_message}")
                except:
                    pass
            raise Exception(f"Failed to send WhatsApp message: {e}")
    
    async def get_contact_info(self, phone_number: str) -> Dict[str, Any]:
        """
        Get contact information from WhatsApp
        
        Args:
            phone_number: Phone number in international format (e.g., +5511999999999)
        
        Returns:
            Dict with contact information (name, verified_name, etc.)
        """
        if not self.access_token or not self.phone_number_id:
            return {
                "name": phone_number,
                "verified_name": None,
                "profile_picture_url": None
            }
        
        # Normalize phone number
        normalized_phone = phone_number.strip().replace("+", "")
        
        url = f"{self.base_url}/{self.phone_number_id}"
        params = {
            "fields": "profile"
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                # Get profile picture
                picture_response = await client.get(
                    f"{self.base_url}/{normalized_phone}",
                    headers=headers,
                    params={"fields": "profile_picture"}
                )
                
                profile_picture_url = None
                if picture_response.status_code == 200:
                    picture_data = picture_response.json()
                    profile_picture_url = picture_data.get("profile_picture", {}).get("url")
                
                return {
                    "phone_number": phone_number,
                    "name": phone_number,  # WhatsApp doesn't provide name directly
                    "verified_name": None,
                    "profile_picture_url": profile_picture_url,
                    "has_picture": profile_picture_url is not None
                }
                
        except Exception as e:
            logger.error(f"Error getting contact info for {phone_number}: {e}")
            return {
                "phone_number": phone_number,
                "name": phone_number,
                "verified_name": None,
                "profile_picture_url": None,
                "has_picture": False
            }
    
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
        
        # Need to use the business account ID, not phone number ID
        business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
        
        if not business_account_id:
            logger.error("WHATSAPP_BUSINESS_ACCOUNT_ID not configured")
            return []
        
        url = f"{self.base_url}/{business_account_id}/message_templates"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        # Add query parameters
        params = {
            "limit": 100
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp templates API error: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Error response: {e.response.text}")
            return []
    
    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """
        Verify webhook for WhatsApp Business API
        
        Args:
            mode: Verification mode
            token: Verification token
            challenge: Challenge string
        
        Returns:
            Challenge string if verification successful, None otherwise
        """
        logger.info(f"Webhook verification: mode={mode}, token_length={len(token) if token else 0}, challenge={challenge}")
        
        if mode == "subscribe" and token == self.webhook_verify_token:
            logger.info("Webhook verification successful")
            return challenge
        else:
            logger.warning(f"Webhook verification failed: mode={mode}, token_match={token == self.webhook_verify_token}")
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
            statuses = value.get("statuses", [])
            
            processed_messages = []
            
            for message in messages:
                msg_type = message.get("type")
                processed_msg = {
                    "id": message.get("id"),
                    "from": message.get("from"),
                    "timestamp": message.get("timestamp"),
                    "type": msg_type,
                    "text": message.get("text", {}).get("body") if msg_type == "text" else None
                }
                
                # Process media messages (image, document, video, audio)
                if msg_type in ["image", "document", "video", "audio"]:
                    media_data = message.get(msg_type, {})
                    processed_msg["media"] = {
                        "id": media_data.get("id"),
                        "mime_type": media_data.get("mime_type"),
                        "sha256": media_data.get("sha256"),
                        "filename": media_data.get("filename"),  # Only for documents
                        "caption": media_data.get("caption")  # Optional caption
                    }
                
                processed_messages.append(processed_msg)
            
            # Process status updates
            processed_statuses = []
            for status_obj in statuses:
                processed_status = {
                    "id": status_obj.get("id"),  # WhatsApp message ID
                    "status": status_obj.get("status"),  # sent, delivered, read
                    "timestamp": status_obj.get("timestamp"),
                    "recipient_id": status_obj.get("recipient_id")
                }
                processed_statuses.append(processed_status)
            
            return {
                "status": "success",
                "messages": processed_messages,
                "statuses": processed_statuses,
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
    
    async def get_media_url(self, media_id: str) -> Optional[str]:
        """
        Get the download URL for a media file from WhatsApp
        
        Args:
            media_id: The media ID from WhatsApp webhook
        
        Returns:
            The download URL for the media file, or None if error
        """
        if not self.access_token:
            logger.warning("WhatsApp not configured, cannot get media URL")
            return None
        
        url = f"{self.base_url}/{media_id}"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data.get("url")
        except Exception as e:
            logger.error(f"Error getting media URL: {e}")
            return None
    
    async def submit_template_for_approval(
        self, 
        name: str,
        category: str,
        language: str,
        components: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Submit a message template to WhatsApp for approval
        
        Args:
            name: Template name (lowercase, no spaces, use underscores)
            category: MARKETING, UTILITY, or AUTHENTICATION
            language: Language code (e.g., pt_BR, en, es)
            components: List of template components (header, body, footer, buttons)
        
        Returns:
            Dict with API response including template ID
        
        References:
            https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
        """
        if not self.access_token:
            raise Exception("WhatsApp access token not configured")
        
        # Get WhatsApp Business Account ID from environment
        waba_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
        if not waba_id:
            raise Exception("WHATSAPP_BUSINESS_ACCOUNT_ID not configured. Get it from Meta Business Manager.")
        
        url = f"{self.base_url}/{waba_id}/message_templates"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "name": name,
            "category": category,
            "language": language,
            "components": components
        }
        
        logger.info(f"Submitting template '{name}' for approval to WhatsApp")
        print(f"📤 PAYLOAD TO WHATSAPP: {json.dumps(payload, indent=2)}")
        logger.info(f"Template payload: {json.dumps(payload, indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                logger.info(f"WhatsApp Template API Response Status: {response.status_code}")
                logger.info(f"WhatsApp Template API Response Body: {response.text}")
                
                response.raise_for_status()
                response_data = response.json()
                
                return {
                    "status": "success",
                    "template_id": response_data.get("id"),
                    "template_name": name,
                    "category": category,
                    "message": "Template submitted for approval. It will be reviewed by WhatsApp within 24-48 hours."
                }
                
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp Template API error: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Error response: {e.response.text}")
                try:
                    error_data = e.response.json()
                    error_message = error_data.get("error", {}).get("message", str(e))
                    error_code = error_data.get("error", {}).get("code", "unknown")
                    logger.error(f"Error code: {error_code}, Message: {error_message}")
                    raise Exception(f"WhatsApp API Error: {error_message}")
                except:
                    raise Exception(f"Failed to submit template: {str(e)}")
            raise Exception(f"Failed to submit template: {str(e)}")
    
    async def get_template_status(self, template_id: str) -> Dict[str, Any]:
        """
        Get the current status of a template from WhatsApp
        
        Args:
            template_id: WhatsApp template ID
        
        Returns:
            Dict with template status information
        """
        if not self.access_token:
            raise Exception("WhatsApp access token not configured")
        
        url = f"{self.base_url}/{template_id}"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get template status: {e}")
            raise Exception(f"Failed to get template status: {str(e)}")

# Global instance
whatsapp_service = WhatsAppService()
