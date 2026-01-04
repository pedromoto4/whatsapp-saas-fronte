#!/usr/bin/env python3
"""
WhatsApp Token Debug Script
Helps diagnose WhatsApp Business API token issues
"""
import asyncio
import httpx
import os
import json
from datetime import datetime

async def debug_whatsapp_token():
    """Debug WhatsApp token and API access"""
    
    # Get environment variables
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    
    print("🔍 WhatsApp Token Debug")
    print("=" * 50)
    
    # Check if variables are set
    print(f"✅ Access Token Set: {bool(access_token)}")
    print(f"✅ Phone Number ID Set: {bool(phone_number_id)}")
    
    if access_token:
        print(f"📏 Token Length: {len(access_token)} characters")
        print(f"🔤 Token Preview: {access_token[:10]}...{access_token[-10:]}")
    
    if phone_number_id:
        print(f"📱 Phone Number ID: {phone_number_id}")
    
    print("\n" + "=" * 50)
    
    if not access_token or not phone_number_id:
        print("❌ Missing required environment variables!")
        return
    
    # Test 1: Check token validity
    print("🧪 Test 1: Checking token validity...")
    try:
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Token is valid!")
                data = response.json()
                print(f"📱 Phone Number: {data.get('display_phone_number', 'N/A')}")
                print(f"📊 Status: {data.get('status', 'N/A')}")
            elif response.status_code == 401:
                print("❌ Token is invalid or expired!")
                print("🔧 Possible solutions:")
                print("   1. For PRODUCTION: Use System User Access Token (doesn't expire)")
                print("      📖 See PRODUCTION-SETUP.md for instructions")
                print("   2. For DEVELOPMENT: Generate a new access token in Meta Developer Console")
                print("   3. Check if token has expired")
                print("   4. Verify token permissions")
            else:
                print(f"⚠️ Unexpected status: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error testing token: {e}")
    
    print("\n" + "=" * 50)
    
    # Test 2: Check message templates
    print("🧪 Test 2: Checking message templates...")
    try:
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/message_templates"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Templates access successful!")
                data = response.json()
                templates = data.get("data", [])
                print(f"📝 Found {len(templates)} templates")
                
                for template in templates[:3]:  # Show first 3
                    print(f"   - {template.get('name', 'N/A')} ({template.get('status', 'N/A')})")
                    
            elif response.status_code == 401:
                print("❌ Templates access denied!")
            else:
                print(f"⚠️ Unexpected status: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Error testing templates: {e}")
    
    print("\n" + "=" * 50)
    
    # Test 3: Try to send a test message (dry run)
    print("🧪 Test 3: Testing message send capability...")
    try:
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Use a test payload (won't actually send)
        payload = {
            "messaging_product": "whatsapp",
            "to": "15551234567",  # Test number
            "type": "text",
            "text": {"body": "Test message"}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Message send capability confirmed!")
            elif response.status_code == 401:
                print("❌ Message send access denied!")
                print("🔧 Check token permissions for 'whatsapp_business_messaging'")
            elif response.status_code == 400:
                print("⚠️ Bad request (expected for test number)")
                print("✅ But token permissions are OK!")
            else:
                print(f"⚠️ Unexpected status: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error testing message send: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Next Steps:")
    print("1. If token is invalid (401):")
    print("   📖 For PRODUCTION: Configure System User Access Token (PRODUCTION-SETUP.md)")
    print("   🔧 For DEVELOPMENT: Generate a new token in Meta Developer Console")
    print("2. Ensure token has 'whatsapp_business_messaging' permission")
    print("3. Check if your WhatsApp Business account is verified")
    print("4. Verify phone number is properly configured")
    print("5. Test with a real phone number that has opted in")
    print("\n💡 Tip: System User Access Tokens don't expire and are recommended for production!")

if __name__ == "__main__":
    asyncio.run(debug_whatsapp_token())
