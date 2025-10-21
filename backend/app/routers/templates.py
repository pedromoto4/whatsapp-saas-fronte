"""
Templates Router
Handles template creation, management and sending
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import json
import logging

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import TemplateCreate, TemplateUpdate, TemplateResponse, TemplateSendRequest
from app.crud import (
    create_template, 
    get_templates, 
    get_template, 
    update_template, 
    delete_template,
    get_contact_by_phone,
    create_contact_from_webhook,
    create_message_log
)
from app.whatsapp_service import whatsapp_service
from app.schemas import MessageLogCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["Templates"])

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template_endpoint(
    template_data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new template"""
    return await create_template(db, template_data, current_user.id)

@router.get("/", response_model=List[TemplateResponse])
async def get_templates_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all templates for current user"""
    return await get_templates(db, current_user.id)

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template_endpoint(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific template"""
    template = await get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template_endpoint(
    template_id: int,
    template_data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a template"""
    template = await update_template(db, template_id, current_user.id, template_data)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template_endpoint(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a template"""
    success = await delete_template(db, template_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/send", status_code=status.HTTP_200_OK)
async def send_template_endpoint(
    request: TemplateSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a template message via WhatsApp"""
    try:
        # Get template
        template = await get_template(db, request.template_id, current_user.id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        
        # Check if template is approved (in production, you'd enforce this)
        if template.status not in ["approved", "draft"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Template is not approved (status: {template.status})"
            )
        
        # Build message with variable substitution
        message = template.body_text
        
        # Replace variables if provided
        if request.variables and template.variables:
            try:
                template_vars = json.loads(template.variables)
                for var_name in template_vars:
                    if var_name in request.variables:
                        placeholder = f"{{{{{var_name}}}}}"  # {{nome}}
                        message = message.replace(placeholder, str(request.variables[var_name]))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse template variables: {template.variables}")
        
        # Add header if exists
        full_message = ""
        if template.header_text:
            full_message += f"*{template.header_text}*\n\n"
        
        full_message += message
        
        # Add footer if exists
        if template.footer_text:
            full_message += f"\n\n_{template.footer_text}_"
        
        # Find or create contact
        contact = await get_contact_by_phone(db, request.to)
        if not contact:
            contact_data = {
                "phone_number": request.to,
                "name": request.to,
                "owner_id": current_user.id
            }
            contact = await create_contact_from_webhook(db, contact_data)
        
        # Send via WhatsApp
        response = await whatsapp_service.send_message(
            to=request.to,
            message=full_message
        )
        
        # Log message
        log_data = MessageLogCreate(
            owner_id=current_user.id,
            direction="out",
            kind="template",
            to_from=request.to,
            content=full_message,
            template_name=template.name,
            cost_estimate="0.005"
        )
        await create_message_log(db, log_data)
        
        return {
            "status": "success",
            "message": "Template sent successfully",
            "whatsapp_response": response,
            "template_name": template.name,
            "to": request.to
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send template: {str(e)}"
        )

