#!/usr/bin/env python3
"""
WhatsApp Integration Test Script
Tests the WhatsApp Business API integration
"""
import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def test_whatsapp_integration():
    """Test WhatsApp integration endpoints"""
    
    # Get API base URL
    base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    print("🧪 Testing WhatsApp Integration")
    print(f"📍 API Base URL: {base_url}")
    print("-" * 50)
    
    async with httpx.AsyncClient() as client:
        
        # Test 1: Health Check
        print("1️⃣ Testing Health Check...")
        try:
            response = await client.get(f"{base_url}/health")
            if response.status_code == 200:
                print("✅ Health check passed")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ Health check failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Health check error: {e}")
        
        print()
        
        # Test 2: WhatsApp Status
        print("2️⃣ Testing WhatsApp Status...")
        try:
            response = await client.get(f"{base_url}/whatsapp/status")
            if response.status_code == 200:
                print("✅ WhatsApp status check passed")
                data = response.json()
                print(f"   Configured: {data.get('configured', False)}")
                print(f"   Demo Mode: {data.get('demo_mode', True)}")
                print(f"   Service: {data.get('service', 'Unknown')}")
            else:
                print(f"❌ WhatsApp status failed: {response.status_code}")
        except Exception as e:
            print(f"❌ WhatsApp status error: {e}")
        
        print()
        
        # Test 3: WhatsApp Templates (requires auth)
        print("3️⃣ Testing WhatsApp Templates...")
        try:
            # For demo purposes, we'll use a mock token
            headers = {"Authorization": "Bearer demo-token"}
            response = await client.get(f"{base_url}/whatsapp/templates", headers=headers)
            if response.status_code == 200:
                print("✅ WhatsApp templates check passed")
                data = response.json()
                templates = data.get('templates', [])
                print(f"   Templates found: {len(templates)}")
                for template in templates[:2]:  # Show first 2 templates
                    print(f"   - {template.get('name', 'Unknown')}: {template.get('status', 'Unknown')}")
            else:
                print(f"❌ WhatsApp templates failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ WhatsApp templates error: {e}")
        
        print()
        
        # Test 4: Send Test Message (requires auth)
        print("4️⃣ Testing Send Message...")
        try:
            headers = {
                "Authorization": "Bearer demo-token",
                "Content-Type": "application/json"
            }
            test_data = {
                "phone_number": "+5511999999999",
                "content": "Test message from integration script"
            }
            response = await client.post(f"{base_url}/whatsapp/send-message", 
                                       headers=headers, 
                                       json=test_data)
            if response.status_code == 200:
                print("✅ Send message test passed")
                data = response.json()
                print(f"   Success: {data.get('success', False)}")
                print(f"   Message ID: {data.get('message_id', 'N/A')}")
            else:
                print(f"❌ Send message failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Send message error: {e}")
        
        print()
        
        # Test 5: API Documentation
        print("5️⃣ Testing API Documentation...")
        try:
            response = await client.get(f"{base_url}/docs")
            if response.status_code == 200:
                print("✅ API documentation accessible")
                print(f"   Swagger UI: {base_url}/docs")
                print(f"   ReDoc: {base_url}/redoc")
            else:
                print(f"❌ API documentation failed: {response.status_code}")
        except Exception as e:
            print(f"❌ API documentation error: {e}")

def print_setup_instructions():
    """Print setup instructions"""
    print("\n" + "="*60)
    print("📋 SETUP INSTRUCTIONS")
    print("="*60)
    print()
    print("1. Configure WhatsApp Business API:")
    print("   - Create account at developers.facebook.com")
    print("   - Set up WhatsApp Business API")
    print("   - Get access token and phone number ID")
    print()
    print("2. Set environment variables:")
    print("   WHATSAPP_ACCESS_TOKEN=your_token_here")
    print("   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here")
    print("   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here")
    print()
    print("3. Start the backend server:")
    print("   cd backend && uvicorn main:app --reload")
    print()
    print("4. Test the integration:")
    print("   python test_whatsapp_integration.py")
    print()
    print("5. Access the frontend:")
    print("   npm run dev")
    print("   Open http://localhost:5173")
    print()

if __name__ == "__main__":
    print("🚀 WhatsApp SaaS Integration Test")
    print("="*50)
    
    # Run the tests
    asyncio.run(test_whatsapp_integration())
    
    # Print setup instructions
    print_setup_instructions()
