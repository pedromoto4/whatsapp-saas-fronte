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
    contact_id: int
    campaign_id: Optional[int] = None

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