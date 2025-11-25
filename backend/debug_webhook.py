"""
Script para diagnosticar problemas com respostas automáticas
"""
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy import select
from app.database import SessionLocal
from app.models import User, FAQ, Catalog, Contact
from app.crud import get_faqs, get_catalog_items

load_dotenv()

async def diagnose():
    async with SessionLocal() as db:
        # 1. Verificar usuários
        result = await db.execute(select(User).where(User.is_active == True))
        users = result.scalars().all()
        
        print(f"\n=== DIAGNÓSTICO DE RESPOSTAS AUTOMÁTICAS ===\n")
        print(f"Usuários ativos encontrados: {len(users)}")
        
        if not users:
            print("❌ ERRO: Nenhum usuário ativo encontrado!")
            print("   Solução: Faça login na aplicação para criar um usuário")
            return
        
        # 2. Verificar cada usuário
        for user in users:
            print(f"\n--- Usuário ID {user.id} ({user.email}) ---")
            
            # Verificar FAQs
            faqs = await get_faqs(db, user.id)
            print(f"  FAQs: {len(faqs)} encontradas")
            if faqs:
                for faq in faqs[:3]:
                    print(f"    - {faq.question[:50]}...")
            
            # Verificar Catálogo
            catalog = await get_catalog_items(db, user.id)
            print(f"  Itens no catálogo: {len(catalog)}")
            if catalog:
                for item in catalog[:3]:
                    print(f"    - {item.name}: {item.price}")
            
            # Verificar AI
            ai_enabled = getattr(user, 'ai_enabled', True)
            print(f"  IA habilitada: {ai_enabled}")
            
            # Verificar OpenAI API Key
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key and len(openai_key) > 20:
                print(f"  OpenAI API Key: ✅ Configurada")
            else:
                print(f"  OpenAI API Key: ❌ NÃO configurada")
        
        # 3. Verificar owner_id padrão
        default_owner_id = int(os.getenv("WHATSAPP_DEFAULT_OWNER_ID", "1"))
        default_user = await db.execute(select(User).where(User.id == default_owner_id))
        default_user_obj = default_user.scalar_one_or_none()
        
        print(f"\n--- Configuração do Webhook ---")
        print(f"  WHATSAPP_DEFAULT_OWNER_ID: {default_owner_id}")
        if default_user_obj:
            print(f"  ✅ Usuário padrão existe: {default_user_obj.email}")
        else:
            print(f"  ❌ Usuário padrão (ID {default_owner_id}) NÃO existe!")
            if users:
                print(f"  💡 Sugestão: Configure WHATSAPP_DEFAULT_OWNER_ID={users[0].id} no .env")
        
        # 4. Verificar WhatsApp config
        access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        demo_mode = os.getenv("WHATSAPP_DEMO_MODE", "true").lower() == "true"
        
        print(f"\n--- Configuração WhatsApp ---")
        if access_token and len(access_token) > 20:
            print(f"  Access Token: ✅ Configurado")
        else:
            print(f"  Access Token: ❌ NÃO configurado")
        
        if phone_id:
            print(f"  Phone Number ID: ✅ {phone_id}")
        else:
            print(f"  Phone Number ID: ❌ NÃO configurado")
        
        print(f"  Modo Demo: {'✅ Ativo' if demo_mode else '❌ Desativado'}")
        
        print(f"\n=== FIM DO DIAGNÓSTICO ===\n")

if __name__ == "__main__":
    asyncio.run(diagnose())

