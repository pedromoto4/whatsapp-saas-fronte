"""
Templates Router
Handles template creation, management and sending
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
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

@router.post("/sync-status")
async def sync_template_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync template status from WhatsApp API to database
    """
    try:
        logger.info("Starting template sync...")
        # Get templates from WhatsApp
        whatsapp_templates = await whatsapp_service.get_message_templates()
        
        logger.info(f"WhatsApp returned {len(whatsapp_templates)} templates")
        
        if not whatsapp_templates or len(whatsapp_templates) == 0:
            logger.warning("No templates returned from WhatsApp API")
            return {"message": "No templates found in WhatsApp", "synced": 0}
        
        # Get all templates from database
        db_templates = await get_templates(db, current_user.id)
        logger.info(f"Database has {len(db_templates)} templates")
        
        synced_count = 0
        for wt in whatsapp_templates:
            logger.info(f"Processing template from WhatsApp: {wt}")
            # Find matching template in database by name or whatsapp_template_id
            for db_template in db_templates:
                template_name = wt.get("name", "")
                template_id = wt.get("id", "")
                
                # Match by name or WhatsApp template ID
                if (db_template.name == template_name or 
                    db_template.whatsapp_template_id == template_id):
                    
                    # Update status if different
                    new_status = wt.get("status", "").lower()
                    rejection_reason = wt.get("reason", "")
                    
                    if db_template.status != new_status:
                        update_data = {"status": new_status}
                        
                        # If rejected, also update rejection reason
                        if new_status == "rejected" and rejection_reason:
                            update_data["rejection_reason"] = rejection_reason
                        
                        await update_template(db, db_template.id, current_user.id, TemplateUpdate(**update_data))
                        synced_count += 1
                        logger.info(f"Updated template {db_template.name} status to {new_status}")
                        if rejection_reason:
                            logger.info(f"Rejection reason: {rejection_reason}")
        
        return {
            "message": f"Synced {synced_count} template(s)",
            "synced": synced_count
        }
        
    except Exception as e:
        logger.error(f"Error syncing template status: {e}")
        # Don't raise error if it's just an auth issue - templates will still load from database
        if "401" in str(e) or "Unauthorized" in str(e):
            return {
                "message": "Could not sync with WhatsApp API (token may be expired)",
                "synced": 0
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync template status: {str(e)}"
        )

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
        
        # Validate template status before sending
        if template.status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Template foi rejeitado pelo WhatsApp. Edite e resubmeta para aprovação."
            )
        
        # Warning for non-approved templates
        is_test_mode = template.status in ["draft", "pending"]
        if is_test_mode:
            logger.warning(f"Sending template '{template.name}' in {template.status} mode (not officially approved)")
        
        # Only approved templates can be used in production at scale
        if template.status != "approved":
            # Allow sending for testing, but add warning to response
            pass  # We'll add a warning in the response
        
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
        
        # Build response with status warning if needed
        response_data = {
            "status": "success",
            "message": "Template sent successfully",
            "whatsapp_response": response,
            "template_name": template.name,
            "to": request.to,
            "template_status": template.status
        }
        
        # Add warning for non-approved templates
        if is_test_mode:
            response_data["warning"] = f"⚠️ Template está em modo '{template.status}'. Para uso em produção, aguarde aprovação do WhatsApp."
            response_data["note"] = "Mensagens de templates não aprovados podem ter menor taxa de entrega."
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send template: {str(e)}"
        )

@router.post("/{template_id}/submit", status_code=status.HTTP_200_OK)
async def submit_template_for_approval(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a template to WhatsApp for approval"""
    try:
        # Get template
        template = await get_template(db, template_id, current_user.id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        
        # Check if already submitted
        if template.status in ["pending", "approved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template is already {template.status}"
            )
        
        # Build WhatsApp components
        components = []
        
        # Add HEADER component if exists
        if template.header_text:
            components.append({
                "type": "HEADER",
                "format": "TEXT",
                "text": template.header_text
            })
        
        # Add BODY component (required)
        body_text = template.body_text
        
        # Parse variables and replace with WhatsApp format
        if template.variables:
            try:
                variables = json.loads(template.variables)
                # Replace {{variable}} with {{1}}, {{2}}, etc. for WhatsApp
                for i, var in enumerate(variables, start=1):
                    body_text = body_text.replace(f"{{{{{var}}}}}", f"{{{{{i}}}}}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse variables: {template.variables}")
        
        components.append({
            "type": "BODY",
            "text": body_text
        })
        
        # Add FOOTER component if exists
        if template.footer_text:
            components.append({
                "type": "FOOTER",
                "text": template.footer_text
            })
        
        # Add BUTTONS component if exists
        if template.buttons:
            try:
                buttons = json.loads(template.buttons)
                if buttons:
                    components.append({
                        "type": "BUTTONS",
                        "buttons": buttons
                    })
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse buttons: {template.buttons}")
        
        # Submit to WhatsApp
        result = await whatsapp_service.submit_template_for_approval(
            name=template.name.lower().replace(" ", "_"),  # Ensure proper format
            category=template.category,
            language=template.language,
            components=components
        )
        
        # Update template status to pending
        from app.schemas import TemplateUpdate
        template_update = TemplateUpdate(
            status="pending",
            whatsapp_template_id=result.get("template_id")
        )
        await update_template(db, template_id, current_user.id, template_update)
        
        return {
            "status": "success",
            "message": result.get("message"),
            "template_id": result.get("template_id"),
            "template_name": template.name,
            "note": "WhatsApp will review your template within 24-48 hours. You'll be notified of the approval status."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit template: {str(e)}"
        )

@router.get("/{template_id}/status", status_code=status.HTTP_200_OK)
async def get_template_status_endpoint(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current approval status of a template from WhatsApp"""
    try:
        # Get template from database
        template = await get_template(db, template_id, current_user.id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        
        if not template.whatsapp_template_id:
            return {
                "status": template.status,
                "message": "Template not yet submitted to WhatsApp"
            }
        
        # Get status from WhatsApp
        whatsapp_status = await whatsapp_service.get_template_status(template.whatsapp_template_id)
        
        # Update local status if different
        new_status = whatsapp_status.get("status", template.status)
        if new_status != template.status:
            from app.schemas import TemplateUpdate
            template_update = TemplateUpdate(status=new_status)
            await update_template(db, template_id, current_user.id, template_update)
        
        return {
            "local_status": template.status,
            "whatsapp_status": new_status,
            "whatsapp_data": whatsapp_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template status: {str(e)}"
        )

@router.post("/webhook/status", status_code=status.HTTP_200_OK)
async def template_status_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook to receive template status updates from WhatsApp
    
    WhatsApp sends notifications when template status changes:
    - PENDING → APPROVED
    - PENDING → REJECTED
    
    Configure this webhook in Meta Developer Console:
    URL: https://your-domain.com/api/templates/webhook/status
    """
    try:
        data = await request.json()
        logger.info(f"Received template status webhook: {data}")
        
        # WhatsApp webhook structure for template status updates
        if data.get("object") == "whatsapp_business_account":
            for entry in data.get("entry", []):
                for change in entry.get("changes", []):
                    if change.get("field") == "message_template_status_update":
                        value = change.get("value", {})
                        
                        # Extract template information
                        template_id = value.get("message_template_id")
                        template_name = value.get("message_template_name")
                        event = value.get("event")  # APPROVED, REJECTED, PAUSED, DISABLED
                        reason = value.get("reason")  # Rejection reason if applicable
                        
                        logger.info(f"Template '{template_name}' ({template_id}): {event}")
                        
                        # Find template in database by whatsapp_template_id
                        from sqlalchemy import select
                        from app.models import Template
                        
                        result = await db.execute(
                            select(Template).where(Template.whatsapp_template_id == str(template_id))
                        )
                        template = result.scalar_one_or_none()
                        
                        if template:
                            # Map WhatsApp event to our status
                            status_mapping = {
                                "APPROVED": "approved",
                                "REJECTED": "rejected",
                                "PAUSED": "rejected",
                                "DISABLED": "rejected"
                            }
                            
                            new_status = status_mapping.get(event, template.status)
                            
                            # Update template status
                            from app.schemas import TemplateUpdate
                            template_update = TemplateUpdate(
                                status=new_status,
                                rejection_reason=reason if event in ["REJECTED", "PAUSED", "DISABLED"] else None
                            )
                            
                            await update_template(db, template.id, template.owner_id, template_update)
                            
                            logger.info(f"✅ Template '{template.name}' status updated: {template.status} → {new_status}")
                            
                            if reason:
                                logger.info(f"Rejection reason: {reason}")
                        else:
                            logger.warning(f"Template with WhatsApp ID {template_id} not found in database")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing template webhook: {e}")
        # Return 200 anyway to avoid WhatsApp retrying
        return {"status": "error", "error": str(e)}

