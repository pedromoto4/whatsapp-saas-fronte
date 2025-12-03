"""
AI Service
Handles AI-powered responses using OpenAI API
"""
import os
from openai import AsyncOpenAI
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = None
        
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized")
        else:
            logger.warning("OPENAI_API_KEY not configured - AI features will be disabled")
    
    async def generate_fallback_response(
        self, 
        user_message: str, 
        faqs: List[Dict[str, str]], 
        catalog_items: List[Dict[str, str]] = None,
        business_name: str = None
    ) -> Optional[str]:
        """
        Generate an AI-powered response when no FAQ matches
        
        Args:
            user_message: The message from the user
            faqs: List of FAQs (for context)
            catalog_items: List of catalog items (optional, for context)
            business_name: Business name (optional)
        
        Returns:
            Generated response or None if AI is not configured
        """
        if not self.client:
            logger.info("AI service not available")
            return None
        
        try:
            # Build context from FAQs
            faq_context = ""
            if faqs:
                faq_context = "\n".join([
                    f"Q: {faq['question']}\nA: {faq['answer']}"
                    for faq in faqs[:5]  # Limit to 5 FAQs for context
                ])
            
            # Build context from catalog
            catalog_context = ""
            if catalog_items:
                catalog_items_text = "\n".join([
                    f"- {item['name']}: {item['price']}"
                    for item in catalog_items[:5]  # Limit to 5 items
                ])
                catalog_context = f"\n\nNossos produtos:\n{catalog_items_text}"
            
            # Build the prompt
            prompt = f"""Você é um assistente virtual de atendimento ao cliente{' de ' + business_name if business_name else ''}.

Contexto do negócio:
{faq_context}{catalog_context}

Instruções:
- Responda de forma amigável e profissional
- Se não souber, seja honesto
- Se o cliente perguntar sobre produtos/pedidos, sugira que envie "catálogo" ou "lista"
- Mantenha respostas curtas (máximo 2 frases)
- Use emoji se apropriado (máximo 2 por mensagem)

Pergunta do cliente: {user_message}

Resposta:"""

            logger.info(f"Generating AI response for: {user_message[:50]}...")
            
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um assistente virtual amigável e profissional."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150  # Limit response length
            )
            
            ai_response = response.choices[0].message.content.strip()
            logger.info(f"Generated AI response: {ai_response[:50]}...")
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return None
    
    async def detect_appointment_intent(self, message: str) -> Optional[Dict]:
        """
        Detect if a message contains an appointment-related intent and its type
        
        Args:
            message: The message from the user
        
        Returns:
            Dict with intent info: {"intent_type": "schedule|modify|cancel|suggest", "confidence": 0.0-1.0}
            or None if not an appointment-related request
        """
        if not self.client:
            return None
        
        try:
            prompt = f"""Analise a seguinte mensagem e determine se é relacionada a agendamentos e qual o tipo de ação.

Mensagem: "{message}"

Responda APENAS com JSON no formato:
{{
    "intent_type": "schedule|modify|cancel|suggest|list|none",
    "confidence": 0.0-1.0
}}

Tipos de intenção:
- "schedule": Cliente quer agendar um novo agendamento
- "modify": Cliente quer alterar/mudar um agendamento existente
- "cancel": Cliente quer cancelar um agendamento
- "suggest": Cliente pede sugestões de horários disponíveis
- "list": Cliente quer consultar/ver seus agendamentos
- "none": Não é relacionado a agendamentos

Exemplos:
- "Quero agendar para amanhã" -> schedule
- "Quero mudar meu agendamento" -> modify
- "Quero cancelar" -> cancel
- "Quais horários vocês têm disponíveis?" -> suggest
- "Quais são os meus agendamentos?" -> list
- "Quero ver meus agendamentos" -> list
- "Tenho algum agendamento?" -> list"""

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um assistente que analisa mensagens para detectar intenções relacionadas a agendamentos. Responda APENAS com JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            import json
            result_text = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            result = json.loads(result_text)
            
            intent_type = result.get("intent_type", "none")
            confidence = result.get("confidence", 0)
            
            if intent_type != "none" and confidence > 0.7:
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting appointment intent: {e}")
            return None
    
    async def extract_appointment_details(self, message: str) -> Dict:
        """
        Extract appointment details from a message
        
        Args:
            message: The message containing appointment request
        
        Returns:
            Dict with extracted details: date, time, service_type, notes
        """
        if not self.client:
            return {}
        
        try:
            prompt = f"""Extraia informações de agendamento da seguinte mensagem.

Mensagem: "{message}"

Data atual: {datetime.now().strftime('%Y-%m-%d %H:%M')}

Extraia e retorne APENAS JSON no formato:
{{
    "date": "YYYY-MM-DD" ou null,
    "time": "HH:MM" ou null,
    "service_type": "tipo de serviço mencionado" ou null,
    "notes": "informações adicionais" ou null
}}

Use referências relativas:
- "amanhã" = data de amanhã
- "hoje" = data de hoje
- "próxima semana" = próxima semana
- "segunda-feira" = próxima segunda-feira
- etc.

Se não conseguir extrair uma informação, use null."""

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você extrai informações de agendamento de mensagens. Responda APENAS com JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            import json
            result_text = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            result = json.loads(result_text)
            return result
            
        except Exception as e:
            logger.error(f"Error extracting appointment details: {e}")
            return {}
    
    async def process_appointment_request(
        self,
        message: str,
        owner_id: int,
        contact_id: int,
        db
    ) -> Dict:
        """
        Process an appointment request: check availability and suggest alternatives
        
        Args:
            message: The appointment request message
            owner_id: The business owner ID
            contact_id: The contact ID
            db: Database session
        
        Returns:
            Dict with response message and appointment data (if created)
        """
        from app.crud_appointments import (
            get_available_slots, check_availability, create_appointment,
            get_service_types, get_service_type
        )
        import json
        
        # Extract appointment details
        details = await self.extract_appointment_details(message)
        
        if not details.get("date") or not details.get("time"):
            return {
                "response": "Para agendar, preciso saber a data e hora desejada. Por exemplo: 'Quero agendar para amanhã às 14h'",
                "appointment": None
            }
        
        # Parse date and time
        try:
            # Try to parse the date
            date_str = details["date"]
            time_str = details["time"]
            
            # Combine date and time
            if "T" in date_str:
                scheduled_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                # Create naive datetime first
                naive_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
                # Make it timezone-aware (use UTC)
                from datetime import timezone
                scheduled_at = naive_datetime.replace(tzinfo=timezone.utc)
            
            # Get service type if mentioned
            service_type_id = None
            duration_minutes = 30  # default
            
            if details.get("service_type"):
                # Try to find matching service type
                service_types = await get_service_types(db, owner_id)
                for st in service_types:
                    if details["service_type"].lower() in st.name.lower():
                        service_type_id = st.id
                        duration_minutes = st.duration_minutes
                        break
            
            # Check availability (no exclusion needed for new appointments)
            is_available = await check_availability(db, owner_id, scheduled_at, duration_minutes, exclude_appointment_id=None)
            
            if is_available:
                # Create appointment
                from app.schemas import AppointmentCreate
                appointment_data = AppointmentCreate(
                    contact_id=contact_id,
                    service_type_id=service_type_id,
                    scheduled_at=scheduled_at,
                    status="pending",
                    notes=details.get("notes")
                )
                appointment = await create_appointment(db, appointment_data, owner_id)
                
                # Format response
                date_formatted = scheduled_at.strftime("%d/%m/%Y")
                time_formatted = scheduled_at.strftime("%H:%M")
                response = f"✅ Agendamento confirmado para {date_formatted} às {time_formatted}!"
                
                if details.get("notes"):
                    response += f"\n\nNota: {details['notes']}"
                
                return {
                    "response": response,
                    "appointment": {
                        "id": appointment.id,
                        "scheduled_at": appointment.scheduled_at.isoformat(),
                        "status": appointment.status
                    }
                }
            else:
                # Suggest alternatives
                target_date = scheduled_at.date()
                alternatives = await get_available_slots(db, owner_id, scheduled_at, service_type_id)
                
                # Get slots for the same day and next few days
                suggestions = []
                for i in range(5):  # Check next 5 days
                    check_date = target_date + timedelta(days=i)
                    check_datetime = datetime.combine(check_date, scheduled_at.time())
                    slots = await get_available_slots(db, owner_id, check_datetime, service_type_id)
                    
                    # Take first 3 slots from each day
                    for slot in slots[:3]:
                        suggestions.append(slot)
                        if len(suggestions) >= 5:
                            break
                    
                    if len(suggestions) >= 5:
                        break
                
                if suggestions:
                    response = f"❌ O horário solicitado ({scheduled_at.strftime('%d/%m/%Y às %H:%M')}) não está disponível.\n\n"
                    response += "Horários disponíveis:\n"
                    for i, slot in enumerate(suggestions[:5], 1):
                        response += f"{i}. {slot.strftime('%d/%m/%Y às %H:%M')}\n"
                    response += "\nPor favor, escolha um dos horários acima ou sugira outro."
                else:
                    response = f"❌ Não há horários disponíveis próximos à data solicitada ({scheduled_at.strftime('%d/%m/%Y')}).\n\nPor favor, sugira outra data."
                
                return {
                    "response": response,
                    "appointment": None,
                    "suggestions": [s.isoformat() for s in suggestions[:5]]
                }
        
        except ValueError as e:
            logger.error(f"Error parsing appointment date/time: {e}")
            return {
                "response": "Não consegui entender a data/hora solicitada. Por favor, tente novamente com uma data específica, por exemplo: 'Quero agendar para 25/01/2024 às 14h'",
                "appointment": None
            }
        except Exception as e:
            logger.error(f"Error processing appointment request: {e}")
            return {
                "response": "Ocorreu um erro ao processar seu agendamento. Por favor, tente novamente ou entre em contato conosco.",
                "appointment": None
            }
    
    async def process_modify_appointment_request(
        self,
        message: str,
        owner_id: int,
        contact_id: int,
        db
    ) -> Dict:
        """
        Process a request to modify an existing appointment
        
        Args:
            message: The modification request message
            owner_id: The business owner ID
            contact_id: The contact ID
            db: Database session
        
        Returns:
            Dict with response message and updated appointment data
        """
        from app.crud_appointments import (
            get_appointments_by_contact, update_appointment,
            check_availability, get_service_type, get_service_types
        )
        
        try:
            # Get user's existing appointments
            appointments = await get_appointments_by_contact(db, contact_id, owner_id, status="pending")
            appointments.extend(await get_appointments_by_contact(db, contact_id, owner_id, status="confirmed"))
            
            if not appointments:
                return {
                    "response": "Não encontrei nenhum agendamento ativo para alterar. Você tem algum agendamento confirmado?",
                    "appointment": None
                }
            
            # Extract new date/time from message
            details = await self.extract_appointment_details(message)
            
            if not details.get("date") or not details.get("time"):
                # List existing appointments and ask which one to modify
                response = "Encontrei os seguintes agendamentos:\n\n"
                for i, apt in enumerate(appointments[:5], 1):
                    date_str = apt.scheduled_at.strftime("%d/%m/%Y às %H:%M")
                    response += f"{i}. {date_str} (ID: {apt.id})\n"
                response += "\nPara qual agendamento você quer alterar? E para qual nova data/hora?"
                return {
                    "response": response,
                    "appointment": None,
                    "appointments": [{"id": a.id, "scheduled_at": a.scheduled_at.isoformat()} for a in appointments[:5]]
                }
            
            # Try to find which appointment to modify (use the most recent one if not specified)
            appointment_to_modify = appointments[0]  # Most recent
            
            # Parse new date and time
            date_str = details["date"]
            time_str = details["time"]
            
            if "T" in date_str:
                new_scheduled_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                # Create naive datetime first
                naive_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
                # Make it timezone-aware (use UTC or local timezone)
                from datetime import timezone
                # Assume local timezone if not specified
                new_scheduled_at = naive_datetime.replace(tzinfo=timezone.utc)
            
            # Get service duration
            duration_minutes = 30  # default
            if appointment_to_modify.service_type_id:
                service_type = await get_service_type(db, appointment_to_modify.service_type_id, owner_id)
                if service_type:
                    duration_minutes = service_type.duration_minutes
            
            # Check if new time is available (exclude the appointment being modified)
            if not await check_availability(db, owner_id, new_scheduled_at, duration_minutes, exclude_appointment_id=appointment_to_modify.id):
                return {
                    "response": f"❌ O horário solicitado ({new_scheduled_at.strftime('%d/%m/%Y às %H:%M')}) não está disponível. Por favor, sugira outro horário.",
                    "appointment": None
                }
            
            # Update appointment
            from app.schemas import AppointmentUpdate
            
            # Prepare update data - only include notes if provided, otherwise keep existing
            update_dict = {"scheduled_at": new_scheduled_at}
            if details.get("notes"):
                update_dict["notes"] = details["notes"]
            # If notes not provided, don't include it (will keep existing notes)
            
            update_data = AppointmentUpdate(**update_dict)
            
            logger.info(f"Updating appointment {appointment_to_modify.id} with new scheduled_at: {new_scheduled_at}")
            logger.info(f"Update data: {update_data.dict(exclude_unset=True)}")
            
            try:
                updated_appointment = await update_appointment(
                    db, appointment_to_modify.id, owner_id, update_data
                )
                logger.info(f"Appointment updated successfully: {updated_appointment.id if updated_appointment else 'None'}")
            except Exception as update_error:
                logger.error(f"Error in update_appointment call: {update_error}", exc_info=True)
                raise
            
            if updated_appointment:
                date_formatted = new_scheduled_at.strftime("%d/%m/%Y")
                time_formatted = new_scheduled_at.strftime("%H:%M")
                response = f"✅ Agendamento alterado com sucesso para {date_formatted} às {time_formatted}!"
                
                return {
                    "response": response,
                    "appointment": {
                        "id": updated_appointment.id,
                        "scheduled_at": updated_appointment.scheduled_at.isoformat(),
                        "status": updated_appointment.status
                    }
                }
            else:
                return {
                    "response": "❌ Não foi possível alterar o agendamento. Por favor, tente novamente.",
                    "appointment": None
                }
        
        except ValueError as e:
            logger.error(f"Error parsing date/time in modify request: {e}", exc_info=True)
            return {
                "response": "Não consegui entender a nova data/hora. Por favor, tente novamente com uma data específica, por exemplo: 'Quero mudar para 25/01/2024 às 14h'",
                "appointment": None
            }
        except Exception as e:
            logger.error(f"Error processing modify appointment request: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "response": f"Ocorreu um erro ao alterar o agendamento: {str(e)}. Por favor, tente novamente.",
                "appointment": None
            }
    
    async def process_cancel_appointment_request(
        self,
        message: str,
        owner_id: int,
        contact_id: int,
        db
    ) -> Dict:
        """
        Process a request to cancel an appointment
        
        Args:
            message: The cancellation request message
            owner_id: The business owner ID
            contact_id: The contact ID
            db: Database session
        
        Returns:
            Dict with response message
        """
        from app.crud_appointments import get_appointments_by_contact, cancel_appointment
        
        try:
            # Get user's active appointments
            appointments = await get_appointments_by_contact(db, contact_id, owner_id, status="pending")
            appointments.extend(await get_appointments_by_contact(db, contact_id, owner_id, status="confirmed"))
            
            if not appointments:
                return {
                    "response": "Não encontrei nenhum agendamento ativo para cancelar.",
                    "appointment": None
                }
            
            # If only one appointment, cancel it directly
            if len(appointments) == 1:
                appointment = appointments[0]
                cancelled = await cancel_appointment(db, appointment.id, owner_id)
                
                if cancelled:
                    date_str = appointment.scheduled_at.strftime("%d/%m/%Y às %H:%M")
                    return {
                        "response": f"✅ Agendamento de {date_str} cancelado com sucesso.",
                        "appointment": {
                            "id": appointment.id,
                            "status": "cancelled"
                        }
                    }
                else:
                    return {
                        "response": "❌ Não foi possível cancelar o agendamento. Por favor, tente novamente.",
                        "appointment": None
                    }
            
            # Multiple appointments - list them and ask which one
            response = "Encontrei os seguintes agendamentos:\n\n"
            for i, apt in enumerate(appointments[:5], 1):
                date_str = apt.scheduled_at.strftime("%d/%m/%Y às %H:%M")
                response += f"{i}. {date_str} (ID: {apt.id})\n"
            response += "\nQual agendamento você quer cancelar? (responda com o número ou ID)"
            
            return {
                "response": response,
                "appointment": None,
                "appointments": [{"id": a.id, "scheduled_at": a.scheduled_at.isoformat()} for a in appointments[:5]]
            }
        
        except Exception as e:
            logger.error(f"Error processing cancel appointment request: {e}")
            return {
                "response": "Ocorreu um erro ao cancelar o agendamento. Por favor, tente novamente.",
                "appointment": None
            }
    
    async def process_suggest_appointment_request(
        self,
        message: str,
        owner_id: int,
        contact_id: int,
        db
    ) -> Dict:
        """
        Process a request for appointment suggestions
        
        Args:
            message: The suggestion request message
            owner_id: The business owner ID
            contact_id: The contact ID
            db: Database session
        
        Returns:
            Dict with response message containing available time slots
        """
        from app.crud_appointments import get_available_slots, get_service_types
        
        try:
            # Extract preferred date if mentioned
            details = await self.extract_appointment_details(message)
            
            # Determine target date
            if details.get("date"):
                date_str = details["date"]
                if "T" in date_str:
                    target_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                else:
                    # Try to parse just the date
                    try:
                        naive_date = datetime.strptime(date_str, "%Y-%m-%d")
                        target_date = naive_date.replace(tzinfo=timezone.utc)
                    except:
                        target_date = datetime.now(timezone.utc) + timedelta(days=1)
            else:
                # Default to tomorrow
                target_date = datetime.now(timezone.utc) + timedelta(days=1)
            
            # Get service type if mentioned
            service_type_id = None
            if details.get("service_type"):
                service_types = await get_service_types(db, owner_id)
                for st in service_types:
                    if details["service_type"].lower() in st.name.lower():
                        service_type_id = st.id
                        break
            
            # Get available slots for the next 7 days
            suggestions = []
            for i in range(7):
                try:
                    check_date = target_date.date() + timedelta(days=i)
                    # Use a time with timezone for the check
                    check_time = datetime.now(timezone.utc).time()
                    check_datetime = datetime.combine(check_date, check_time)
                    # Make it timezone-aware
                    if check_datetime.tzinfo is None:
                        check_datetime = check_datetime.replace(tzinfo=timezone.utc)
                    
                    slots = await get_available_slots(db, owner_id, check_datetime, service_type_id)
                    
                    # Take first 5 slots from each day
                    for slot in slots[:5]:
                        suggestions.append(slot)
                        if len(suggestions) >= 10:
                            break
                    
                    if len(suggestions) >= 10:
                        break
                except Exception as day_error:
                    logger.error(f"Error getting slots for day {i}: {day_error}")
                    continue
            
            if suggestions:
                response = "📅 Horários disponíveis:\n\n"
                current_date = None
                for slot in suggestions[:10]:
                    try:
                        # Handle timezone-aware and naive datetimes
                        if hasattr(slot, 'strftime'):
                            slot_date = slot.strftime("%d/%m/%Y")
                            slot_time = slot.strftime("%H:%M")
                        else:
                            # If it's a string or other format, try to parse
                            if isinstance(slot, str):
                                slot = datetime.fromisoformat(slot)
                                slot_date = slot.strftime("%d/%m/%Y")
                                slot_time = slot.strftime("%H:%M")
                            else:
                                continue
                        
                        if current_date != slot_date:
                            if current_date is not None:
                                response += "\n"
                            response += f"📆 {slot_date}:\n"
                            current_date = slot_date
                        
                        response += f"  • {slot_time}\n"
                    except Exception as format_error:
                        logger.error(f"Error formatting slot {slot}: {format_error}")
                        continue
                
                response += "\nQual horário você prefere? Responda com a data e hora desejada."
            else:
                target_date_str = target_date.strftime('%d/%m/%Y') if hasattr(target_date, 'strftime') else str(target_date.date())
                response = f"❌ Não encontrei horários disponíveis para os próximos 7 dias a partir de {target_date_str}.\n\nPor favor, entre em contato conosco para mais opções."
            
            return {
                "response": response,
                "appointment": None,
                "suggestions": [s.isoformat() if hasattr(s, 'isoformat') else str(s) for s in suggestions[:10]]
            }
        
        except Exception as e:
            logger.error(f"Error processing suggest appointment request: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "response": f"Ocorreu um erro ao buscar horários disponíveis: {str(e)}. Por favor, tente novamente.",
                "appointment": None
            }
    
    async def process_list_appointments_request(
        self,
        message: str,
        owner_id: int,
        contact_id: int,
        db
    ) -> Dict:
        """
        Process a request to list user's appointments
        
        Args:
            message: The list request message
            owner_id: The business owner ID
            contact_id: The contact ID
            db: Database session
        
        Returns:
            Dict with response message containing list of appointments
        """
        from app.crud_appointments import get_appointments_by_contact
        
        try:
            # Get all active appointments for this contact
            try:
                appointments = await get_appointments_by_contact(db, contact_id, owner_id, include_cancelled=False)
                logger.info(f"Found {len(appointments)} active appointments for contact {contact_id}")
            except Exception as e:
                logger.error(f"Error getting active appointments: {e}", exc_info=True)
                appointments = []
            
            # Also get recent cancelled appointments (for reference)
            recent_cancelled = []
            try:
                cancelled_appointments = await get_appointments_by_contact(db, contact_id, owner_id, status="cancelled")
                logger.info(f"Found {len(cancelled_appointments)} cancelled appointments for contact {contact_id}")
                
                if cancelled_appointments:
                    # Only show cancelled from the last 7 days
                    from datetime import timezone
                    # Get current time with timezone awareness
                    now = datetime.now(timezone.utc)
                    week_ago = now - timedelta(days=7)
                    
                    # Normalize timezones for comparison
                    for a in cancelled_appointments:
                        try:
                            apt_date = a.scheduled_at
                            # Ensure both have timezone for comparison
                            if apt_date.tzinfo is None:
                                apt_date = apt_date.replace(tzinfo=timezone.utc)
                            
                            # Compare dates (ignore time for this check)
                            if apt_date.date() >= week_ago.date():
                                recent_cancelled.append(a)
                        except Exception as date_error:
                            logger.error(f"Error comparing date for appointment {a.id}: {date_error}")
                            continue
            except Exception as e:
                logger.error(f"Error getting cancelled appointments: {e}", exc_info=True)
                recent_cancelled = []  # If error, just don't show cancelled
            
            logger.info(f"Found {len(recent_cancelled)} recent cancelled appointments")
            
            # Check if we have any appointments to show
            if not appointments and not recent_cancelled:
                logger.info("No appointments found, returning empty message")
                return {
                    "response": "Você não possui agendamentos ativos no momento.\n\nPara agendar, envie uma mensagem como: 'Quero agendar para amanhã às 14h'",
                    "appointment": None
                }
            
            response = "📅 Seus agendamentos:\n\n"
            
            # Active appointments
            if appointments:
                response += "✅ Agendamentos ativos:\n"
                for i, apt in enumerate(appointments, 1):
                    try:
                        date_str = apt.scheduled_at.strftime("%d/%m/%Y")
                        time_str = apt.scheduled_at.strftime("%H:%M")
                    except Exception as format_error:
                        logger.error(f"Error formatting date for appointment {apt.id}: {format_error}")
                        date_str = "Data inválida"
                        time_str = "Hora inválida"
                    
                    status_emoji = {
                        "pending": "⏳",
                        "confirmed": "✅",
                        "completed": "✓"
                    }.get(apt.status, "📅")
                    
                    status_text = {
                        "pending": "Pendente",
                        "confirmed": "Confirmado",
                        "completed": "Concluído"
                    }.get(apt.status, apt.status)
                    
                    response += f"{status_emoji} {i}. {date_str} às {time_str} ({status_text})"
                    
                    # Get service type name if available
                    try:
                        if apt.service_type_id:
                            from app.crud_appointments import get_service_type
                            service_type = await get_service_type(db, apt.service_type_id, owner_id)
                            if service_type:
                                response += f" - {service_type.name}"
                    except Exception as service_error:
                        logger.error(f"Error getting service type for appointment {apt.id}: {service_error}")
                    
                    if apt.notes:
                        response += f"\n   Nota: {apt.notes}"
                    
                    response += "\n"
            
            # Recent cancelled appointments
            if recent_cancelled:
                response += "\n❌ Agendamentos cancelados recentemente:\n"
                for apt in recent_cancelled[:3]:  # Show max 3 cancelled
                    try:
                        date_str = apt.scheduled_at.strftime("%d/%m/%Y")
                        time_str = apt.scheduled_at.strftime("%H:%M")
                        response += f"❌ {date_str} às {time_str} (Cancelado)\n"
                    except Exception as format_error:
                        logger.error(f"Error formatting date for cancelled appointment {apt.id}: {format_error}")
                        continue
            
            response += "\n💡 Dicas:\n"
            response += "• Para alterar: 'Quero mudar meu agendamento para [nova data/hora]'\n"
            response += "• Para cancelar: 'Quero cancelar meu agendamento'\n"
            response += "• Para ver horários disponíveis: 'Quais horários vocês têm?'"
            
            return {
                "response": response,
                "appointment": None,
                "appointments": [{"id": a.id, "scheduled_at": a.scheduled_at.isoformat(), "status": a.status} for a in appointments]
            }
        
        except Exception as e:
            logger.error(f"Error processing list appointments request: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "response": "Ocorreu um erro ao buscar seus agendamentos. Por favor, tente novamente.",
                "appointment": None
            }

# Global instance
ai_service = AIService()

