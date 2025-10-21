from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    firebase_uid: str

class UserResponse(UserBase):
    id: int
    firebase_uid: str
    is_active: bool
    subscription_tier: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Contact Schemas
class ContactBase(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    tags: Optional[str] = None
    notes: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ContactResponse(ContactBase):
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Campaign Schemas
class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    message_template: str
    target_tags: Optional[str] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    message_template: Optional[str] = None
    status: Optional[str] = None
    target_tags: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class CampaignResponse(CampaignBase):
    id: int
    owner_id: int
    status: str
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    contact_id: Optional[int] = None
    campaign_id: Optional[int] = None
    phone_number: Optional[str] = None  # For WhatsApp direct sending

class MessageResponse(MessageBase):
    id: int
    contact_id: int
    campaign_id: Optional[int] = None
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response models for lists
class ContactListResponse(BaseModel):
    contacts: List[ContactResponse]
    total: int

class CampaignListResponse(BaseModel):
    campaigns: List[CampaignResponse]
    total: int

class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int

# WhatsApp-specific Schemas
class WhatsAppMessageSend(BaseModel):
    phone_number: str
    content: str
    message_type: str = "text"

class WhatsAppTemplateSend(BaseModel):
    phone_number: str
    template_name: str
    template_params: Optional[List[str]] = None

class WhatsAppTemplate(BaseModel):
    name: str
    status: str
    category: str
    language: str
    components: List[dict]

# FAQ Schemas
class FAQBase(BaseModel):
    question: str
    answer: str
    keywords: Optional[str] = None

class FAQCreate(FAQBase):
    pass

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    keywords: Optional[str] = None

class FAQResponse(FAQBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Catalog Schemas
class CatalogBase(BaseModel):
    name: str
    price: str
    image_url: Optional[str] = None
    description: Optional[str] = None

class CatalogCreate(CatalogBase):
    pass

class CatalogUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None

class CatalogResponse(CatalogBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# MessageLog Schemas
class MessageLogCreate(BaseModel):
    owner_id: int
    direction: str  # 'in' or 'out'
    kind: str  # 'text', 'template', 'media'
    to_from: str
    content: Optional[str] = None
    template_name: Optional[str] = None
    cost_estimate: Optional[str] = "0.00"

class MessageLogResponse(BaseModel):
    id: int
    owner_id: int
    direction: str
    kind: str
    to_from: str
    content: Optional[str]
    template_name: Optional[str]
    cost_estimate: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class WhatsAppWebhookData(BaseModel):
    entry: List[dict]
    object: str

class WhatsAppStatusResponse(BaseModel):
    configured: bool
    service: str
    demo_mode: bool