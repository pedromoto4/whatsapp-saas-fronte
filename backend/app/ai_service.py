"""
AI Service
Handles AI-powered responses using OpenAI API
"""
import os
from openai import AsyncOpenAI
from typing import Dict, List, Optional
from datetime import datetime, timedelta
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
        Detect if a message contains an appointment request intent
        
        Args:
            message: The message from the user
        
        Returns:
            Dict with intent info or None if not an appointment request
        """
        if not self.client:
            return None
        
        try:
            prompt = f"""Analise a seguinte mensagem e determine se é um pedido de agendamento/consulta/atendimento.

Mensagem: "{message}"

Responda APENAS com JSON no formato:
{{"is_appointment": true/false, "confidence": 0.0-1.0}}

Se for um pedido de agendamento, is_appointment deve ser true. Caso contrário, false."""

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um assistente que analisa mensagens para detectar pedidos de agendamento. Responda APENAS com JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=100
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
            
            if result.get("is_appointment") and result.get("confidence", 0) > 0.7:
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
                scheduled_at = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            
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
            
            # Check availability
            is_available = await check_availability(db, owner_id, scheduled_at, duration_minutes)
            
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

# Global instance
ai_service = AIService()

