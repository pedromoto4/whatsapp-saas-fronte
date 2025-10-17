# WhatsApp Business API Setup Guide

## 📋 Prerequisites

1. **WhatsApp Business Account**: You need a verified WhatsApp Business account
2. **Meta Developer Account**: Create an account at [developers.facebook.com](https://developers.facebook.com)
3. **Phone Number**: A dedicated phone number for your business

## 🔧 Setup Steps

### 1. Create WhatsApp Business App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click "Create App" → "Business" → "WhatsApp Business API"
3. Fill in your app details
4. Note down your **App ID** and **App Secret**

### 2. Configure WhatsApp Business API

1. In your app dashboard, go to "WhatsApp" → "API Setup"
2. Add your phone number
3. Verify your phone number via SMS/call
4. Note down your **Phone Number ID**

### 3. Generate Access Token

1. Go to "WhatsApp" → "API Setup"
2. Click "Generate Token"
3. Copy your **Access Token** (keep it secure!)

### 4. Configure Webhook

1. Go to "WhatsApp" → "Configuration"
2. Set webhook URL: `https://your-domain.com/whatsapp/webhook`
3. Set verify token: Choose a secure random string
4. Subscribe to webhook fields: `messages`, `message_deliveries`, `message_reads`

## 🔐 Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
```

## 📱 Message Templates

### Creating Templates

1. Go to "WhatsApp" → "Message Templates"
2. Click "Create Template"
3. Choose template type (Text, Media, etc.)
4. Fill in template content
5. Submit for approval (can take 24-48 hours)

### Template Variables

Use `{{1}}`, `{{2}}`, etc. for dynamic content:

```
Hello {{1}}! Your order {{2}} has been confirmed.
```

## 🧪 Testing

### Demo Mode

If credentials are not configured, the service runs in demo mode:
- Mock responses are returned
- No actual WhatsApp messages are sent
- Perfect for development and testing

### Production Testing

1. Use WhatsApp Business API Test Number (free)
2. Send test messages to verified numbers
3. Check webhook delivery
4. Monitor API usage

## 📊 API Endpoints

### Send Message
```
POST /whatsapp/send-message
{
  "phone_number": "+5511999999999",
  "content": "Hello from WhatsApp SaaS!"
}
```

### Send Template
```
POST /whatsapp/send-template
{
  "phone_number": "+5511999999999",
  "template_name": "hello_world",
  "template_params": ["João"]
}
```

### Get Templates
```
GET /whatsapp/templates
```

### Webhook Verification
```
GET /whatsapp/webhook?hub.mode=subscribe&hub.challenge=CHALLENGE&hub.verify_token=TOKEN
```

### Receive Messages
```
POST /whatsapp/webhook
```

## 🚨 Important Notes

1. **Rate Limits**: WhatsApp has strict rate limits (1000 messages/day for new accounts)
2. **Template Approval**: All templates must be approved by Meta
3. **24-Hour Window**: You can only send free-form messages within 24 hours of customer contact
4. **Compliance**: Follow WhatsApp Business Policy and local regulations

## 🔍 Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your access token
2. **400 Bad Request**: Verify phone number format (+country code)
3. **Webhook not receiving**: Check URL accessibility and SSL certificate
4. **Template not found**: Ensure template is approved and name is correct

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=DEBUG
```

## 📈 Production Deployment

1. **SSL Certificate**: Required for webhook
2. **Environment Variables**: Set production credentials
3. **Monitoring**: Set up alerts for API failures
4. **Backup**: Regular database backups
5. **Scaling**: Consider rate limiting and queue management

## 🔗 Useful Links

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/webhooks)
- [Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/rate-limits)
