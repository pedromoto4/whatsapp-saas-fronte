"""
Integrations Router
Handles WhatsApp integration via OAuth Flow
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import os
import logging
import secrets
from typing import Optional
from urllib.parse import urlencode

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import IntegrationCreate, IntegrationResponse
from app.crud_integrations import (
    create_integration,
    get_integration_by_user_id,
    delete_integration,
    update_integration
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations", tags=["Integrations"])

# OAuth Configuration
META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
META_OAUTH_REDIRECT_URI = os.getenv("META_OAUTH_REDIRECT_URI", "http://localhost:5173/api/integrations/oauth/callback")
META_API_VERSION = "v18.0"
META_GRAPH_BASE_URL = f"https://graph.facebook.com/{META_API_VERSION}"

# OAuth Scopes
OAUTH_SCOPES = "whatsapp_business_messaging,whatsapp_business_management,business_management"

@router.get("/whatsapp", response_model=IntegrationResponse)
async def get_whatsapp_integration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's WhatsApp integration"""
    integration = await get_integration_by_user_id(db, current_user.id)
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WhatsApp integration not configured"
        )
    return IntegrationResponse.from_orm(integration)

@router.get("/oauth/authorize")
async def oauth_authorize(
    current_user: User = Depends(get_current_user)
):
    """Generate OAuth authorization URL"""
    if not META_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="META_APP_ID not configured"
        )
    
    # Generate state for CSRF protection (using user ID + random token)
    state = f"{current_user.id}:{secrets.token_urlsafe(32)}"
    
    # Build OAuth URL
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_OAUTH_REDIRECT_URI,
        "scope": OAUTH_SCOPES,
        "response_type": "code",
        "state": state
    }
    
    auth_url = f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth?{urlencode(params)}"
    
    return {
        "auth_url": auth_url,
        "state": state
    }

@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_reason: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Handle OAuth callback from Meta"""
    
    # Check for OAuth errors
    if error:
        error_msg = f"OAuth error: {error}"
        if error_description:
            error_msg += f" - {error_description}"
        logger.error(error_msg)
        # Redirect to frontend with error
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(
            url=f"{frontend_url}/dashboard?integration_error={error}"
        )
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )
    
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth not configured. Please set META_APP_ID and META_APP_SECRET"
        )
    
    try:
        # Extract user ID from state (format: "user_id:token")
        user_id = None
        if state:
            parts = state.split(":")
            if parts:
                try:
                    user_id = int(parts[0])
                except ValueError:
                    pass
        
        # If state doesn't have user ID, we need to get it from session/token
        # For now, we'll use a workaround: store state in session or get from token
        # In production, you might want to store state in Redis/database temporarily
        
        # For this implementation, we'll require the user to be authenticated
        # and get user_id from the request (this requires frontend to send token)
        # Alternative: Use session-based state storage
        
        # Step 1: Exchange code for access token
        token_url = f"{META_GRAPH_BASE_URL}/oauth/access_token"
        token_params = {
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "redirect_uri": META_OAUTH_REDIRECT_URI,
            "code": code
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.get(token_url, params=token_params)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to obtain access token"
                )
            
            # Step 2: Get user's businesses (WABA)
            businesses_url = f"{META_GRAPH_BASE_URL}/me/businesses"
            headers = {"Authorization": f"Bearer {access_token}"}
            businesses_response = await client.get(businesses_url, headers=headers)
            
            if businesses_response.status_code != 200:
                logger.error(f"Failed to get businesses: {businesses_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get WhatsApp Business Account. Please ensure you have a WABA."
                )
            
            businesses_data = businesses_response.json()
            businesses = businesses_data.get("data", [])
            
            if not businesses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No WhatsApp Business Account found. Please create one in Meta Business Manager first."
                )
            
            waba_id = businesses[0].get("id")
            
            # Step 3: Get phone numbers from WABA
            phone_numbers_url = f"{META_GRAPH_BASE_URL}/{waba_id}/phone_numbers"
            phone_response = await client.get(phone_numbers_url, headers=headers)
            
            if phone_response.status_code != 200:
                logger.error(f"Failed to get phone numbers: {phone_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get phone number. Please ensure your WABA has a phone number configured."
                )
            
            phone_data = phone_response.json()
            phone_numbers = phone_data.get("data", [])
            
            if not phone_numbers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No phone number found in WhatsApp Business Account."
                )
            
            phone_number_id = phone_numbers[0].get("id")
            
            # Step 4: Exchange for long-lived token (optional, but recommended)
            # Tokens from OAuth are short-lived (1-2 hours)
            # Exchange for long-lived token (60 days)
            exchange_url = f"{META_GRAPH_BASE_URL}/oauth/access_token"
            exchange_params = {
                "grant_type": "fb_exchange_token",
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "fb_exchange_token": access_token
            }
            
            exchange_response = await client.get(exchange_url, params=exchange_params)
            if exchange_response.status_code == 200:
                exchange_data = exchange_response.json()
                access_token = exchange_data.get("access_token", access_token)  # Use long-lived if available
            
            # Note: In a real implementation, user_id should come from authenticated session
            # For now, we'll need to handle this differently - the callback needs to know which user
            # Options:
            # 1. Store state in database/cache with user_id
            # 2. Have frontend send user_id as query param (less secure)
            # 3. Use session cookies
            
            # For this implementation, we'll assume the frontend will handle the redirect
            # and call a separate endpoint to complete the integration
            # OR we can store the integration data temporarily and have user confirm
            
            # Temporary solution: Return data to frontend, frontend calls POST endpoint
            # But OAuth callback should ideally complete the flow
            
            # For now, return redirect with success - frontend will handle completion
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            return RedirectResponse(
                url=f"{frontend_url}/dashboard/integration?code={code}&state={state}"
            )
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error in OAuth callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during OAuth flow: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error in OAuth callback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/oauth/complete")
async def oauth_complete(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete OAuth flow - exchange code for tokens and save integration"""
    
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth not configured"
        )
    
    try:
        # Step 1: Exchange code for access token
        token_url = f"{META_GRAPH_BASE_URL}/oauth/access_token"
        token_params = {
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "redirect_uri": META_OAUTH_REDIRECT_URI,
            "code": code
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.get(token_url, params=token_params)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to obtain access token"
                )
            
            # Step 2: Get user's businesses (WABA)
            businesses_url = f"{META_GRAPH_BASE_URL}/me/businesses"
            headers = {"Authorization": f"Bearer {access_token}"}
            businesses_response = await client.get(businesses_url, headers=headers)
            businesses_response.raise_for_status()
            businesses_data = businesses_response.json()
            businesses = businesses_data.get("data", [])
            
            if not businesses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No WhatsApp Business Account found. Please create one in Meta Business Manager first."
                )
            
            waba_id = businesses[0].get("id")
            
            # Step 3: Get phone numbers from WABA
            phone_numbers_url = f"{META_GRAPH_BASE_URL}/{waba_id}/phone_numbers"
            phone_response = await client.get(phone_numbers_url, headers=headers)
            phone_response.raise_for_status()
            phone_data = phone_response.json()
            phone_numbers = phone_data.get("data", [])
            
            if not phone_numbers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No phone number found in WhatsApp Business Account."
                )
            
            phone_number_id = phone_numbers[0].get("id")
            
            # Step 4: Exchange for long-lived token
            exchange_url = f"{META_GRAPH_BASE_URL}/oauth/access_token"
            exchange_params = {
                "grant_type": "fb_exchange_token",
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "fb_exchange_token": access_token
            }
            
            exchange_response = await client.get(exchange_url, params=exchange_params)
            if exchange_response.status_code == 200:
                exchange_data = exchange_response.json()
                access_token = exchange_data.get("access_token", access_token)
            
            # Step 5: Check if integration already exists
            existing = await get_integration_by_user_id(db, current_user.id)
            
            integration_data = IntegrationCreate(
                wa_phone_number_id=phone_number_id,
                wa_access_token=access_token,
                wa_business_account_id=waba_id
            )
            
            if existing:
                # Update existing integration
                await update_integration(db, current_user.id, {
                    "wa_phone_number_id": phone_number_id,
                    "wa_access_token": access_token,
                    "wa_business_account_id": waba_id,
                    "is_active": True
                })
                await db.refresh(existing)
                return IntegrationResponse.from_orm(existing)
            else:
                # Create new integration
                integration = await create_integration(db, current_user.id, integration_data)
                return IntegrationResponse.from_orm(integration)
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error completing OAuth: {e}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Response: {e.response.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error completing OAuth: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error completing OAuth: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/whatsapp/test")
async def test_whatsapp_integration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test WhatsApp integration by getting phone number info"""
    integration = await get_integration_by_user_id(db, current_user.id)
    if not integration or not integration.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WhatsApp integration not configured"
        )
    
    try:
        # Test by getting phone number info
        url = f"{META_GRAPH_BASE_URL}/{integration.wa_phone_number_id}"
        headers = {"Authorization": f"Bearer {integration.wa_access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            return {
                "status": "success",
                "message": "Integration is working correctly",
                "phone_number_info": data
            }
            
    except httpx.HTTPError as e:
        logger.error(f"Test failed: {e}")
        if hasattr(e, 'response') and e.response:
            error_text = e.response.text
            if e.response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Access token is invalid or expired. Please reconnect your WhatsApp integration."
                )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Test failed: {str(e)}"
        )

@router.delete("/whatsapp")
async def delete_whatsapp_integration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete WhatsApp integration"""
    deleted = await delete_integration(db, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    return {"status": "success", "message": "Integration deleted successfully"}

