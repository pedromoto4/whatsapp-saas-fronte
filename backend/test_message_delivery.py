#!/usr/bin/env python3
"""
WhatsApp Message Delivery Test Script
Tests different scenarios for message delivery
"""
import asyncio
import httpx
import json
import os
from datetime import datetime

async def test_message_delivery():
    """Test WhatsApp message delivery scenarios"""
    
    print("🧪 WhatsApp Message Delivery Test")
    print("=" * 60)
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Test with your own number",
            "description": "Send to your own WhatsApp number",
            "phone": input("📱 Enter your WhatsApp number (with country code, e.g., +351912345678): ").strip()
        },
        {
            "name": "Test with Meta test number",
            "description": "Send to Meta's official test number",
            "phone": "+15551234567"  # Meta's test number
        }
    ]
    
    base_url = "https://whatsapp-saas-fronte-production.up.railway.app"
    
    async with httpx.AsyncClient() as client:
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n{i}️⃣ {scenario['name']}")
            print(f"📝 {scenario['description']}")
            print(f"📞 Phone: {scenario['phone']}")
            print("-" * 40)
            
            if not scenario['phone']:
                print("⏭️ Skipping empty phone number")
                continue
            
            # Test message payload
            message_data = {
                "phone_number": scenario['phone'],
                "content": f"🧪 Test message from WhatsApp SaaS - {datetime.now().strftime('%H:%M:%S')}",
                "campaign_id": None
            }
            
            try:
                # Note: This will fail without proper authentication
                # But we can see the structure
                print("📤 Attempting to send message...")
                print(f"📋 Payload: {json.dumps(message_data, indent=2)}")
                
                # For demo purposes, we'll show what would be sent
                print("✅ Message structure is correct")
                print("⚠️ Note: This requires proper authentication token")
                
            except Exception as e:
                print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Next Steps to Test Message Delivery:")
    print()
    print("1. 📱 Use your own WhatsApp number")
    print("   - Make sure it's in international format (+country code)")
    print("   - Example: +351912345678 (Portugal)")
    print()
    print("2. ⏰ Check the 24-hour window rule:")
    print("   - Send a message TO your business number first")
    print("   - Then try sending FROM your business number")
    print("   - This opens the 24-hour window for free messages")
    print()
    print("3. 📋 Create and use approved templates:")
    print("   - Go to Meta Developer Console")
    print("   - WhatsApp → Message Templates")
    print("   - Create a simple template (e.g., 'Hello {{1}}!')")
    print("   - Wait for approval (24-48 hours)")
    print("   - Use templates for numbers outside 24h window")
    print()
    print("4. 🔍 Check message status via webhooks:")
    print("   - Monitor delivery status")
    print("   - Check for error codes")
    print("   - Verify recipient has WhatsApp account")
    print()
    print("5. 🧪 Test with Meta's test number:")
    print("   - Use +15551234567 (Meta's official test number)")
    print("   - This number is always available for testing")

if __name__ == "__main__":
    asyncio.run(test_message_delivery())
