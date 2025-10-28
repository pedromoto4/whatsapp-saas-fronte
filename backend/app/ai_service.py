"""
AI Service
Handles AI-powered responses using OpenAI API
"""
import os
from openai import AsyncOpenAI
from typing import Dict, List, Optional
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

# Global instance
ai_service = AIService()

