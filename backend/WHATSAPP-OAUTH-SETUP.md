# 🔐 Guia de Configuração: WhatsApp OAuth Flow

Este guia explica como configurar a integração WhatsApp usando OAuth Flow da Meta, permitindo que cada usuário conecte seu próprio número WhatsApp Business.

## 📋 Visão Geral

Com o OAuth Flow implementado, cada usuário da aplicação pode conectar sua própria conta WhatsApp Business através de um processo de autorização simples, sem precisar copiar/colar tokens manualmente.

---

## 🎯 Pré-requisitos

1. **Conta Meta Business Manager**
   - Acesse: https://business.facebook.com
   - Crie uma conta Business Manager se ainda não tiver

2. **WhatsApp Business Account (WABA)**
   - Crie um WABA no Meta Business Manager
   - Configure um número de telefone no WABA
   - O número precisa estar verificado

3. **Meta Developer Account**
   - Acesse: https://developers.facebook.com
   - Crie uma conta de desenvolvedor se necessário

---

## 🚀 Passo a Passo

### 1. Criar Meta App

1. Acesse o [Meta Developer Console](https://developers.facebook.com/apps/)
2. Clique em **"Create App"**
3. Selecione **"Business"** como tipo de app
4. Preencha:
   - **App Name**: Nome da sua aplicação (ex: "WhatsApp SaaS")
   - **App Contact Email**: Seu email
5. Clique em **"Create App"**

### 2. Configurar WhatsApp Product

1. No painel do app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Set Up"** no produto WhatsApp
3. Isso adiciona o produto WhatsApp ao seu app

### 3. Obter App ID e App Secret

1. No painel do app, vá em **Settings** > **Basic**
2. Anote:
   - **App ID**: Copie este valor (será usado como `META_APP_ID`)
   - **App Secret**: Clique em **"Show"** e copie (será usado como `META_APP_SECRET`)
   - ⚠️ **IMPORTANTE**: Mantenha o App Secret seguro e nunca o compartilhe

### 4. Configurar OAuth Redirect URI

1. No painel do app, vá em **Settings** > **Basic**
2. Role até **"Valid OAuth Redirect URIs"**
3. Adicione a URL de callback:
   ```
   https://seu-dominio.com/api/integrations/oauth/callback
   ```
   - Para desenvolvimento local: `http://localhost:8000/api/integrations/oauth/callback`
   - Para produção: use sua URL de produção
4. Clique em **"Save Changes"**

### 5. Configurar Website Platform (Opcional mas Recomendado)

1. No painel do app, vá em **Settings** > **Basic**
2. Role até **"Platform"**
3. Clique em **"Add Platform"** > **"Website"**
4. Adicione:
   - **Site URL**: `https://seu-dominio.com`
   - Para desenvolvimento: `http://localhost:5173`

### 6. Configurar Permissões da API

1. No painel do app, vá em **App Review** > **Permissions and Features**
2. Solicite as seguintes permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`

**Nota**: Para desenvolvimento, você pode usar o modo de desenvolvimento que não requer aprovação, mas apenas funciona com usuários de teste.

### 7. Conectar WhatsApp Business Account

1. No painel do app, vá em **WhatsApp** > **Getting Started**
2. Em **"Step 1: Add phone number"**, clique em **"Add phone number"**
3. Selecione sua WhatsApp Business Account (WABA)
4. Selecione o número de telefone que deseja usar
5. Clique em **"Add Phone Number"**

### 8. Configurar Webhook (Global - 1x apenas)

O webhook é configurado uma única vez no Meta Developer Console e funciona para todos os usuários.

1. No painel do app, vá em **WhatsApp** > **Configuration**
2. Em **"Webhook"**, clique em **"Edit"**
3. Configure:
   - **Callback URL**: `https://seu-dominio.com/whatsapp/webhook`
   - **Verify Token**: Gere um token aleatório (ex: use um gerador online)
     - Guarde este token - será usado como `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - **Subscription Fields**: Selecione:
     - `messages`
     - `message_status`
     - `messaging_handovers`
4. Clique em **"Verify and Save"**
5. A Meta enviará uma requisição GET para seu webhook para verificação
6. Se a verificação for bem-sucedida, o webhook será configurado

### 9. Configurar Variáveis de Ambiente

No seu backend, configure as seguintes variáveis de ambiente:

```bash
# OAuth da Meta
META_APP_ID=seu_app_id_aqui
META_APP_SECRET=seu_app_secret_aqui
META_OAUTH_REDIRECT_URI=https://seu-dominio.com/api/integrations/oauth/callback

# Frontend URL (para redirecionamento após OAuth)
FRONTEND_URL=https://seu-dominio.com

# Webhook (já configurado anteriormente)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui
```

**Para desenvolvimento local:**
```bash
META_OAUTH_REDIRECT_URI=http://localhost:8000/api/integrations/oauth/callback
FRONTEND_URL=http://localhost:5173
```

---

## 🔄 Fluxo OAuth

### Como Funciona

1. **Usuário clica "Conectar WhatsApp"** no frontend
2. Frontend chama `/api/integrations/oauth/authorize`
3. Backend retorna URL OAuth da Meta
4. Usuário é redirecionado para Meta para autorizar
5. Meta redireciona de volta para `/api/integrations/oauth/callback` com código
6. Backend troca código por access_token
7. Backend obtém WABA ID e Phone Number ID
8. Backend salva integração no banco de dados
9. Usuário é redirecionado para frontend com sucesso

### Webhook Routing

O webhook é único e compartilhado. Quando uma mensagem chega:

1. Webhook recebe mensagem com `phone_number_id` no payload
2. Backend busca integração pelo `phone_number_id`
3. Backend identifica qual usuário recebeu a mensagem
4. Mensagem é processada e roteada para o usuário correto

---

## ✅ Testando a Integração

### 1. Testar OAuth Flow

1. Acesse a página "Integração WhatsApp" no frontend
2. Clique em "Conectar WhatsApp"
3. Autorize a aplicação na Meta
4. Verifique se a integração foi salva no banco

### 2. Testar Envio de Mensagem

1. Após conectar, use o endpoint de teste:
   ```bash
   POST /api/integrations/whatsapp/test
   ```
2. Ou envie uma mensagem através da interface

### 3. Testar Recebimento de Mensagem

1. Envie uma mensagem para o número WhatsApp conectado
2. Verifique se o webhook recebe a mensagem
3. Verifique se a mensagem aparece na interface do usuário correto

---

## 🔧 Troubleshooting

### Erro: "OAuth not configured"
- Verifique se `META_APP_ID` e `META_APP_SECRET` estão configurados
- Verifique se as variáveis de ambiente foram carregadas

### Erro: "No WhatsApp Business Account found"
- Certifique-se de que o usuário tem um WABA configurado
- O WABA precisa estar conectado ao Meta App

### Erro: "No phone number found"
- Certifique-se de que o WABA tem um número de telefone configurado
- O número precisa estar verificado

### Webhook não funciona
- Verifique se a URL do webhook está correta e acessível
- Verifique se o Verify Token está correto
- Verifique se o webhook foi verificado no Meta Developer Console

### Token expira
- Tokens OAuth são de longa duração (60 dias)
- Implemente refresh token se necessário (não implementado no plano atual)

---

## 📚 Referências

- [Meta Developer Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [OAuth 2.0 Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)

---

## 🎉 Próximos Passos

Após configurar o OAuth:

1. Teste o fluxo completo de conexão
2. Teste envio e recebimento de mensagens
3. Monitore logs para garantir que tudo está funcionando
4. Considere implementar refresh token para renovação automática
5. Considere criptografar tokens no banco de dados

