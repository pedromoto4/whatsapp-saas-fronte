from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String, default="free")  # free, basic, premium
    ai_enabled = Column(Boolean, default=True)  # Enable/disable AI responses
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaigns = relationship("Campaign", back_populates="owner")
    contacts = relationship("Contact", back_populates="owner")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    phone_number = Column(String, nullable=False)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string for tags
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)  # Archive conversation
    ai_enabled = Column(Boolean, nullable=True)  # None = use user setting, True/False = override
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="contacts")
    messages = relationship("Message", back_populates="contact")

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    message_template = Column(Text, nullable=False)
    status = Column(String, default="draft")  # draft, active, paused, completed
    target_tags = Column(Text, nullable=True)  # JSON string for target tags
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="campaigns")
    messages = relationship("Message", back_populates="campaign")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, sent, delivered, failed
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    contact = relationship("Contact", back_populates="messages")
    campaign = relationship("Campaign", back_populates="messages")

class FAQ(Base):
    __tablename__ = "faqs"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    keywords = Column(Text, nullable=True)  # keywords separadas por vírgula
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User")

class Catalog(Base):
    __tablename__ = "catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    price = Column(String, nullable=False)  # Guardamos como string para flexibilidade (€50, $100, etc)
    image_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User")

class MessageLog(Base):
    __tablename__ = "message_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    direction = Column(String, nullable=False)  # 'in' ou 'out'
    kind = Column(String, nullable=False)  # 'text', 'template', 'media'
    to_from = Column(String, nullable=False)  # número de telefone
    content = Column(Text, nullable=True)  # conteúdo da mensagem
    template_name = Column(String, nullable=True)  # nome do template (se aplicável)
    cost_estimate = Column(String, default="0.00")  # custo estimado
    is_automated = Column(Boolean, default=False)  # True se foi resposta automática (FAQ/Catalog)
    status = Column(String, default="sent")  # sent, delivered, read (apenas para mensagens 'out')
    whatsapp_message_id = Column(String, nullable=True)  # ID da mensagem no WhatsApp (para tracking)
    media_url = Column(String, nullable=True)  # URL do arquivo de media
    media_type = Column(String, nullable=True)  # image, document, video, audio
    media_filename = Column(String, nullable=True)  # Nome original do arquivo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User")

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)  # Nome interno do template
    category = Column(String, nullable=False)  # MARKETING, UTILITY, AUTHENTICATION
    language = Column(String, default="pt_BR")  # Código de idioma
    status = Column(String, default="draft")  # draft, pending, approved, rejected
    
    # Template content
    header_text = Column(Text, nullable=True)  # Cabeçalho (opcional)
    body_text = Column(Text, nullable=False)  # Corpo da mensagem (obrigatório)
    footer_text = Column(Text, nullable=True)  # Rodapé (opcional)
    
    # Buttons (JSON string)
    buttons = Column(Text, nullable=True)  # JSON com botões [{"type": "URL", "text": "Ver Site", "url": "..."}]
    
    # Variables
    variables = Column(Text, nullable=True)  # JSON com variáveis: ["nome", "data", "valor"]
    
    # WhatsApp metadata
    whatsapp_template_id = Column(String, nullable=True)  # ID retornado pelo WhatsApp após aprovação
    rejection_reason = Column(Text, nullable=True)  # Motivo de rejeição (se aplicável)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")

class ServiceType(Base):
    __tablename__ = "service_types"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # ex: "Consulta", "Atendimento", "Revisão"
    duration_minutes = Column(Integer, nullable=False, default=30)  # Duração padrão em minutos
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")
    appointments = relationship("Appointment", back_populates="service_type")

class RecurringAvailability(Base):
    __tablename__ = "recurring_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)  # Horário de início (ex: 09:00)
    end_time = Column(Time, nullable=False)  # Horário de fim (ex: 18:00)
    slot_duration_minutes = Column(Integer, nullable=False, default=30)  # Duração de cada slot
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")

class AvailabilityException(Base):
    __tablename__ = "availability_exceptions"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)  # Data específica
    is_blocked = Column(Boolean, default=False)  # True = dia bloqueado, False = horários especiais
    custom_slots = Column(Text, nullable=True)  # JSON com slots customizados para este dia
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    service_type_id = Column(Integer, ForeignKey("service_types.id"), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)  # Data e hora do agendamento
    status = Column(String, default="pending")  # pending, confirmed, cancelled, completed
    notes = Column(Text, nullable=True)  # Notas adicionais do agendamento
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")
    contact = relationship("Contact")
    service_type = relationship("ServiceType", back_populates="appointments")

class PushToken(Base):
    __tablename__ = "push_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True, index=True)  # Expo push token
    platform = Column(String, nullable=False)  # ios, android
    device_name = Column(String, nullable=True)  # Nome do dispositivo
    is_active = Column(Boolean, default=True)  # Para desativar tokens sem deletar
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User")