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

# Default model - can be overridden via environment variable
DEFAULT_MODEL = "gpt-4o-mini"

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
        self.client = None
        
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info(f"OpenAI client initialized with model: {self.model}")
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
                model=self.model,
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
            prompt = f"""Analise a seguinte mensagem em português e determine se é relacionada a agendamentos/marcações.

Mensagem: "{message}"

TIPOS DE INTENÇÃO:

1. "schedule" - Cliente quer CRIAR/FAZER um novo agendamento:
   - "Quero agendar para amanhã"
   - "Posso marcar uma consulta?"
   - "Gostaria de agendar"
   - "Quero fazer uma marcação"
   - "Tem vaga para sexta?"
   - "Dá para marcar às 15h?"
   - "Preciso de um horário"
   - "Quero reservar"

2. "modify" - Cliente quer ALTERAR/MUDAR um agendamento existente:
   - "Quero mudar meu agendamento"
   - "Preciso remarcar"
   - "Dá para trocar o horário?"
   - "Posso alterar a data?"
   - "Quero adiar para outro dia"
   - "Muda para às 16h"
   - "Reagendar para próxima semana"

3. "cancel" - Cliente quer CANCELAR um agendamento:
   - "Quero cancelar"
   - "Preciso desmarcar"
   - "Não vou poder ir"
   - "Não vou conseguir"
   - "Cancela meu agendamento"
   - "Desisto do agendamento"
   - "Não quero mais"

4. "suggest" - Cliente pede SUGESTÕES de horários disponíveis:
   - "Quais horários têm disponíveis?"
   - "Que horas vocês atendem?"
   - "Quais são as vagas?"
   - "Tem horário livre?"
   - "O que está disponível?"
   - "Qual a disponibilidade?"
   - "Quando posso ir?"

5. "list" - Cliente quer VER/CONSULTAR seus agendamentos:
   - "Quais são os meus agendamentos?"
   - "Tenho algum agendamento?"
   - "Para quando está marcado?"
   - "Qual a data da minha consulta?"
   - "Meus agendamentos"
   - "Ver minhas marcações"
   - "Quando é minha vez?"

6. "none" - NÃO é relacionado a agendamentos:
   - Perguntas sobre produtos/preços
   - Saudações simples (olá, bom dia)
   - Outros assuntos

REGRAS:
- Se há dúvida entre schedule e suggest, prefira schedule se há data/hora mencionada
- Se menciona "remarcar" ou "trocar", é modify
- Se menciona "desmarcar" ou "não ir", é cancel
- Confidence: 0.9+ para match claro, 0.7-0.9 para provável, <0.7 para incerto

Responda APENAS com JSON:
{{
    "intent_type": "schedule|modify|cancel|suggest|list|none",
    "confidence": 0.0-1.0
}}"""

            response = await self.client.chat.completions.create(
                model=self.model,
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
            # Get current date info for context
            now = datetime.now()
            weekday_names = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
            current_weekday = weekday_names[now.weekday()]
            
            prompt = f"""Extraia informações de agendamento da seguinte mensagem em português.

Mensagem: "{message}"

CONTEXTO TEMPORAL:
- Data atual: {now.strftime('%Y-%m-%d')} ({current_weekday})
- Hora atual: {now.strftime('%H:%M')}

REGRAS DE EXTRAÇÃO:

1. DATAS RELATIVAS (calcule a data exata):
   - "hoje" = {now.strftime('%Y-%m-%d')}
   - "amanhã" = {(now + timedelta(days=1)).strftime('%Y-%m-%d')}
   - "depois de amanhã" = {(now + timedelta(days=2)).strftime('%Y-%m-%d')}
   - "daqui a X dias" = soma X dias à data atual
   - "próxima semana" = próxima segunda-feira
   - "esta semana" = um dia desta semana (se mencionado)
   - "dia X" ou "no dia X" = dia X do mês atual (ou próximo mês se já passou)

2. DIAS DA SEMANA (calcule a próxima ocorrência):
   - "segunda/terça/quarta/quinta/sexta/sábado/domingo" = próxima ocorrência
   - "próxima segunda" = segunda-feira da próxima semana
   - "na terça" ou "terça que vem" = próxima terça-feira

3. HORAS (converta para formato 24h HH:MM):
   - "às 14h" ou "14:00" ou "14 horas" = "14:00"
   - "às 2 da tarde" ou "2h da tarde" = "14:00"
   - "às 9 da manhã" ou "9h da manhã" = "09:00"
   - "às 8 da noite" ou "8h da noite" = "20:00"
   - "meio-dia" ou "12h" = "12:00"
   - "meia-noite" = "00:00"
   - "às 3 e meia" = "15:30" (se tarde) ou "03:30" (se madrugada)
   - Se só diz "às 3" sem contexto, assuma tarde (15:00) para horário comercial

4. EXEMPLOS DE NOVOS AGENDAMENTOS:
   - "amanhã às 3 da tarde" → date: amanhã, time: "15:00"
   - "na sexta às 10h" → date: próxima sexta, time: "10:00"
   - "dia 15 às 14:30" → date: dia 15, time: "14:30"
   - "daqui a 2 dias de manhã" → date: +2 dias, time: "09:00" (manhã típica)
   - "quero marcar para terça" → date: próxima terça, time: null

5. MODIFICAÇÕES/ALTERAÇÕES (extraia AMBAS as datas/horas):
   Quando a mensagem indica alteração de um agendamento existente, extraia:
   - original_date/original_time: data/hora do agendamento ATUAL a modificar
   - date/time: NOVA data/hora pretendida
   
   Exemplos:
   - "alterar de amanhã às 15h para as 16h" → original: amanhã 15:00, novo: amanhã 16:00
   - "mudar a marcação de sexta para segunda" → original: sexta (hora null), novo: segunda (hora null)
   - "trocar o das 10h para as 14h" → original: hoje 10:00, novo: hoje 14:00
   - "reagendar de dia 15 às 9h para dia 16 às 10h" → original: dia 15 09:00, novo: dia 16 10:00

Retorne APENAS JSON válido no formato:
{{
    "date": "YYYY-MM-DD" ou null,
    "time": "HH:MM" ou null,
    "original_date": "YYYY-MM-DD" ou null,
    "original_time": "HH:MM" ou null,
    "service_type": "tipo de serviço mencionado" ou null,
    "notes": "informações adicionais relevantes" ou null
}}

IMPORTANTE:
- "date" e "time" são sempre a NOVA data/hora pretendida
- "original_date" e "original_time" só são preenchidos em modificações/alterações
- Se não conseguir extrair uma informação com certeza, use null."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Você extrai informações de agendamento de mensagens em português. Responda APENAS com JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=250
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
                "response": "Olá! 😊 Para fazer o seu agendamento, preciso saber quando prefere. Pode dizer-me a data e hora? Por exemplo: 'amanhã às 14h' ou 'sexta às 10h'",
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
                
                # Format response - more natural and friendly
                date_formatted = scheduled_at.strftime("%d/%m/%Y")
                time_formatted = scheduled_at.strftime("%H:%M")
                
                # Get day of week name in Portuguese
                weekday_names_pt = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
                weekday_name = weekday_names_pt[scheduled_at.weekday()]
                
                response = f"✅ Perfeito! O seu agendamento está confirmado!\n\n"
                response += f"📅 {weekday_name.capitalize()}, {date_formatted}\n"
                response += f"🕐 {time_formatted}\n"
                
                if details.get("notes"):
                    response += f"📝 {details['notes']}\n"
                
                response += "\nSe precisar alterar ou cancelar, é só me avisar!"
                
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
                    weekday_names_pt = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
                    response = f"😔 Infelizmente, o horário das {scheduled_at.strftime('%H:%M')} no dia {scheduled_at.strftime('%d/%m')} já está ocupado.\n\n"
                    response += "📋 Mas tenho estas opções disponíveis:\n\n"
                    for i, slot in enumerate(suggestions[:5], 1):
                        slot_weekday = weekday_names_pt[slot.weekday()]
                        response += f"  {i}. {slot_weekday.capitalize()} {slot.strftime('%d/%m')} às {slot.strftime('%H:%M')}\n"
                    response += "\nQual prefere? Ou pode sugerir outro horário! 😊"
                else:
                    response = f"😔 Não tenho horários disponíveis próximos ao dia {scheduled_at.strftime('%d/%m')}.\n\nPode sugerir outra data? Terei todo o gosto em ajudar!"
                
                return {
                    "response": response,
                    "appointment": None,
                    "suggestions": [s.isoformat() for s in suggestions[:5]]
                }
        
        except ValueError as e:
            logger.error(f"Error parsing appointment date/time: {e}")
            return {
                "response": "🤔 Não consegui perceber bem a data ou hora. Pode dizer de outra forma? Por exemplo: 'dia 15 às 14h' ou 'amanhã às 10h'",
                "appointment": None
            }
        except Exception as e:
            logger.error(f"Error processing appointment request: {e}")
            return {
                "response": "😅 Desculpe, ocorreu um erro. Pode tentar novamente? Se o problema persistir, entre em contacto connosco!",
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
                    "response": "🔍 Não encontrei nenhum agendamento ativo para alterar. Quer fazer uma nova marcação?",
                    "appointment": None
                }
            
            # Extract new date/time from message
            details = await self.extract_appointment_details(message)
            
            if not details.get("date") or not details.get("time"):
                # List existing appointments and ask which one to modify
                weekday_names_pt = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
                response = "📋 Encontrei os seus agendamentos:\n\n"
                for i, apt in enumerate(appointments[:5], 1):
                    apt_weekday = weekday_names_pt[apt.scheduled_at.weekday()]
                    date_str = apt.scheduled_at.strftime("%d/%m às %H:%M")
                    response += f"  {i}. {apt_weekday.capitalize()} {date_str}\n"
                response += "\nPara quando quer alterar? Diga-me a nova data e hora!"
                return {
                    "response": response,
                    "appointment": None,
                    "appointments": [{"id": a.id, "scheduled_at": a.scheduled_at.isoformat()} for a in appointments[:5]]
                }
            
            # Try to find which appointment to modify
            appointment_to_modify = None
            
            # Check if original date/time was provided (for identifying which appointment)
            if details.get("original_date") or details.get("original_time"):
                logger.info(f"Original date/time provided: {details.get('original_date')} {details.get('original_time')}")
                
                # Parse original date/time to find the matching appointment
                original_date = details.get("original_date")
                original_time = details.get("original_time")
                
                for apt in appointments:
                    apt_date = apt.scheduled_at.strftime("%Y-%m-%d")
                    apt_time = apt.scheduled_at.strftime("%H:%M")
                    
                    # Match by date and time if both provided
                    if original_date and original_time:
                        if apt_date == original_date and apt_time == original_time:
                            appointment_to_modify = apt
                            logger.info(f"Found exact match for appointment {apt.id}")
                            break
                    # Match by date only if time not provided
                    elif original_date and not original_time:
                        if apt_date == original_date:
                            appointment_to_modify = apt
                            logger.info(f"Found date match for appointment {apt.id}")
                            break
                    # Match by time only if date not provided (same day assumed)
                    elif original_time and not original_date:
                        if apt_time == original_time:
                            appointment_to_modify = apt
                            logger.info(f"Found time match for appointment {apt.id}")
                            break
            
            # If no match found or original not provided, use the most recent/first one
            if not appointment_to_modify:
                appointment_to_modify = appointments[0]
                if len(appointments) > 1:
                    logger.info(f"Multiple appointments found, using first one: {appointment_to_modify.id}")
                else:
                    logger.info(f"Using single appointment: {appointment_to_modify.id}")
            
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
                    "response": f"😔 O horário das {new_scheduled_at.strftime('%H:%M')} no dia {new_scheduled_at.strftime('%d/%m')} já está ocupado. Pode sugerir outro horário?",
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
                weekday_names_pt = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
                weekday_name = weekday_names_pt[new_scheduled_at.weekday()]
                date_formatted = new_scheduled_at.strftime("%d/%m/%Y")
                time_formatted = new_scheduled_at.strftime("%H:%M")
                
                response = f"✅ Feito! O seu agendamento foi alterado!\n\n"
                response += f"📅 Nova data: {weekday_name.capitalize()}, {date_formatted}\n"
                response += f"🕐 Novo horário: {time_formatted}\n\n"
                response += "Ficamos à espera! 😊"
                
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
                    "response": "😅 Não consegui alterar o agendamento. Pode tentar novamente?",
                    "appointment": None
                }
        
        except ValueError as e:
            logger.error(f"Error parsing date/time in modify request: {e}", exc_info=True)
            return {
                "response": "🤔 Não consegui perceber a nova data/hora. Pode dizer de outra forma? Por exemplo: 'mudar para sexta às 15h'",
                "appointment": None
            }
        except Exception as e:
            logger.error(f"Error processing modify appointment request: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "response": "😅 Ocorreu um erro ao alterar. Pode tentar novamente? Se o problema persistir, entre em contacto connosco!",
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
                    "response": "🔍 Não encontrei nenhum agendamento ativo para cancelar. Está tudo limpo!",
                    "appointment": None
                }
            
            # If only one appointment, cancel it directly
            if len(appointments) == 1:
                appointment = appointments[0]
                cancelled = await cancel_appointment(db, appointment.id, owner_id)
                
                if cancelled:
                    weekday_names_pt = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
                    weekday_name = weekday_names_pt[appointment.scheduled_at.weekday()]
                    date_str = appointment.scheduled_at.strftime("%d/%m às %H:%M")
                    return {
                        "response": f"✅ O seu agendamento de {weekday_name}, {date_str} foi cancelado.\n\nSe mudar de ideias, é só marcar novamente! 😊",
                        "appointment": {
                            "id": appointment.id,
                            "status": "cancelled"
                        }
                    }
                else:
                    return {
                        "response": "😅 Não consegui cancelar o agendamento. Pode tentar novamente?",
                        "appointment": None
                    }
            
            # Multiple appointments - list them and ask which one
            weekday_names_pt = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
            response = "📋 Tem mais do que um agendamento:\n\n"
            for i, apt in enumerate(appointments[:5], 1):
                apt_weekday = weekday_names_pt[apt.scheduled_at.weekday()]
                date_str = apt.scheduled_at.strftime("%d/%m às %H:%M")
                response += f"  {i}. {apt_weekday.capitalize()} {date_str}\n"
            response += "\nQual deles quer cancelar? (responda com o número)"
            
            return {
                "response": response,
                "appointment": None,
                "appointments": [{"id": a.id, "scheduled_at": a.scheduled_at.isoformat()} for a in appointments[:5]]
            }
        
        except Exception as e:
            logger.error(f"Error processing cancel appointment request: {e}")
            return {
                "response": "😅 Ocorreu um erro ao cancelar. Pode tentar novamente? Se o problema persistir, entre em contacto connosco!",
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
                weekday_names_pt = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
                response = "😊 Claro! Aqui estão os horários disponíveis:\n\n"
                current_date = None
                for slot in suggestions[:10]:
                    try:
                        # Handle timezone-aware and naive datetimes
                        if hasattr(slot, 'strftime'):
                            slot_date = slot.strftime("%d/%m")
                            slot_time = slot.strftime("%H:%M")
                            slot_weekday = weekday_names_pt[slot.weekday()]
                        else:
                            # If it's a string or other format, try to parse
                            if isinstance(slot, str):
                                slot = datetime.fromisoformat(slot)
                                slot_date = slot.strftime("%d/%m")
                                slot_time = slot.strftime("%H:%M")
                                slot_weekday = weekday_names_pt[slot.weekday()]
                            else:
                                continue
                        
                        full_date = f"{slot_weekday.capitalize()} {slot_date}"
                        if current_date != full_date:
                            if current_date is not None:
                                response += "\n"
                            response += f"📆 {full_date}:\n"
                            current_date = full_date
                        
                        response += f"   • {slot_time}\n"
                    except Exception as format_error:
                        logger.error(f"Error formatting slot {slot}: {format_error}")
                        continue
                
                response += "\nQual lhe dá mais jeito? É só dizer! 😊"
            else:
                target_date_str = target_date.strftime('%d/%m') if hasattr(target_date, 'strftime') else str(target_date.date())
                response = f"😔 Não tenho horários disponíveis nos próximos 7 dias a partir de {target_date_str}.\n\nPode sugerir outra data ou entre em contacto connosco para mais opções!"
            
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
                "response": "😅 Ocorreu um erro ao procurar horários. Pode tentar novamente?",
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
                    "response": "📋 Não tem nenhum agendamento ativo de momento.\n\nQuer marcar algum? É só dizer a data e hora! 😊",
                    "appointment": None
                }
            
            weekday_names_pt = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
            response = "📋 Os seus agendamentos:\n\n"
            
            # Active appointments
            if appointments:
                for i, apt in enumerate(appointments, 1):
                    try:
                        apt_weekday = weekday_names_pt[apt.scheduled_at.weekday()]
                        date_str = apt.scheduled_at.strftime("%d/%m/%Y")
                        time_str = apt.scheduled_at.strftime("%H:%M")
                    except Exception as format_error:
                        logger.error(f"Error formatting date for appointment {apt.id}: {format_error}")
                        date_str = "Data inválida"
                        time_str = "Hora inválida"
                        apt_weekday = ""
                    
                    status_emoji = {
                        "pending": "⏳",
                        "confirmed": "✅",
                        "completed": "✓"
                    }.get(apt.status, "📅")
                    
                    status_text = {
                        "pending": "A confirmar",
                        "confirmed": "Confirmado",
                        "completed": "Concluído"
                    }.get(apt.status, apt.status)
                    
                    response += f"{status_emoji} {apt_weekday.capitalize()}, {date_str} às {time_str}\n"
                    response += f"   Estado: {status_text}"
                    
                    # Get service type name if available
                    try:
                        if apt.service_type_id:
                            from app.crud_appointments import get_service_type
                            service_type = await get_service_type(db, apt.service_type_id, owner_id)
                            if service_type:
                                response += f" | Serviço: {service_type.name}"
                    except Exception as service_error:
                        logger.error(f"Error getting service type for appointment {apt.id}: {service_error}")
                    
                    if apt.notes:
                        response += f"\n   📝 {apt.notes}"
                    
                    response += "\n\n"
            
            # Recent cancelled appointments
            if recent_cancelled:
                response += "❌ Cancelados recentemente:\n"
                for apt in recent_cancelled[:3]:  # Show max 3 cancelled
                    try:
                        apt_weekday = weekday_names_pt[apt.scheduled_at.weekday()][:3]
                        date_str = apt.scheduled_at.strftime("%d/%m")
                        time_str = apt.scheduled_at.strftime("%H:%M")
                        response += f"   • {apt_weekday} {date_str} às {time_str}\n"
                    except Exception as format_error:
                        logger.error(f"Error formatting date for cancelled appointment {apt.id}: {format_error}")
                        continue
                response += "\n"
            
            response += "💡 Precisa de alguma alteração? É só dizer!"
            
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
                "response": "😅 Ocorreu um erro ao procurar os seus agendamentos. Pode tentar novamente?",
                "appointment": None
            }

# Global instance
ai_service = AIService()

