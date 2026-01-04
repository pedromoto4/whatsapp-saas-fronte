# 🚀 Guia de Configuração para Produção - WhatsApp Business API

Este guia explica como configurar a aplicação para produção, eliminando a necessidade de criar tokens manualmente no Meta Developer Console.

## 📋 Problema Atual

Atualmente, você precisa criar tokens temporários manualmente no Meta Developer Console que expiram após algumas horas/dias. Isso não é viável para produção.

## ✅ Solução: System User Access Tokens

Para produção, você deve usar **System User Access Tokens** que:
- ✅ **Não expiram** (tokens de longa duração)
- ✅ **Não requerem renovação manual**
- ✅ **São mais seguros** (vinculados a um System User, não a uma pessoa)
- ✅ **Recomendado pela Meta** para aplicações de produção

---

## 🔧 Passo 1: Configurar Meta Business Manager

### 1.1 Acessar Business Manager

1. Acesse [business.facebook.com](https://business.facebook.com)
2. Faça login com sua conta Meta/Facebook
3. Se você ainda não tem um Business Manager:
   - Clique em **"Create Account"** ou **"Criar Conta"**
   - Siga as instruções para criar sua conta de negócios

### 1.2 Verificar/Criar WhatsApp Business Account (WABA)

1. No Business Manager, vá em **"WhatsApp Accounts"** ou **"Contas do WhatsApp"**
2. Se já tiver uma conta WhatsApp Business, certifique-se de que ela está associada
3. Se não tiver, você precisará criar/conectar uma (isso requer um número de telefone verificado)

**Anote o WhatsApp Business Account ID** - você precisará dele depois.

---

## 🔧 Passo 2: Criar System User

### 2.1 Acessar System Users

1. No Business Manager, vá em **"Business Settings"** (Configurações de Negócios)
2. No menu lateral, clique em **"Users"** (Usuários)
3. Clique na aba **"System Users"** (Usuários do Sistema)

### 2.2 Criar Novo System User

1. Clique em **"+ Add"** ou **"Adicionar"**
2. Preencha:
   - **Name** (Nome): Ex: "WhatsApp API Service"
   - **System User Role**: Selecione **"Admin"** ou **"Employee"** com permissões adequadas
3. Clique em **"Create System User"** ou **"Criar Usuário do Sistema"**

### 2.3 Anotar System User ID

Após criar, você verá o **System User ID**. **Anote este ID** - você precisará dele.

---

## 🔧 Passo 3: Gerar Access Token para System User

### 3.1 Gerar Token

1. No Business Manager, em **"System Users"**, encontre o System User que você criou
2. Clique no System User para abrir os detalhes
3. Vá para a aba **"Assign Assets"** (Atribuir Recursos) ou **"Generate New Token"** (Gerar Novo Token)
4. Clique em **"Generate New Token"** (Gerar Novo Token) ou **"Generar nuevo token"**

### 3.2 Configurar Permissões do Token

Selecione as seguintes permissões (scopes):
- ✅ **whatsapp_business_messaging** - Para enviar mensagens
- ✅ **whatsapp_business_management** - Para gerenciar templates e configurações
- ✅ **business_management** - Para acessar informações da conta

### 3.3 Selecionar WhatsApp Business Account

1. Selecione sua **WhatsApp Business Account (WABA)** na lista
2. Clique em **"Generate Token"** ou **"Generar Token"**

### 3.4 Copiar o Token

⚠️ **IMPORTANTE**: Copie o token imediatamente! Você só poderá vê-lo uma vez.

**Este token NÃO expira** e pode ser usado permanentemente (a menos que seja revogado manualmente).

---

## 🔧 Passo 4: Configurar Variáveis de Ambiente

Agora configure as variáveis de ambiente no Railway (ou seu ambiente de produção).

### 4.1 Variáveis Obrigatórias

Adicione as seguintes variáveis no Railway:

```bash
# WhatsApp Business API - Produção
WHATSAPP_ACCESS_TOKEN=seu_system_user_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_waba_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_secreto_aleatorio

# Configurar para produção
WHATSAPP_DEMO_MODE=false
ENVIRONMENT=production
```

### 4.2 Como Obter Phone Number ID

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Vá para seu app WhatsApp Business
3. Vá em **"WhatsApp"** → **"API Setup"**
4. Você verá o **Phone Number ID** listado

### 4.3 Como Obter Business Account ID (WABA ID)

1. No Business Manager, vá em **"WhatsApp Accounts"**
2. Clique na sua conta WhatsApp Business
3. O ID estará visível na URL ou nos detalhes da conta
   - Formato: Geralmente começa com números, ex: `123456789012345`

### 4.4 Como Criar Webhook Verify Token

Gere um token aleatório e seguro:

```bash
# No terminal (Linux/Mac)
openssl rand -hex 32

# Ou use um gerador online seguro
```

Use este token tanto na variável de ambiente quanto na configuração do webhook no Meta.

---

## 🔧 Passo 5: Atualizar Configurações no Meta

### 5.1 Verificar Permissões do App

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Vá para seu app WhatsApp Business
3. Vá em **"App Review"** → **"Permissions and Features"**
4. Certifique-se de que as seguintes permissões estão aprovadas:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

### 5.2 Atualizar Webhook (se necessário)

1. Vá em **"WhatsApp"** → **"Configuration"**
2. Configure o webhook com:
   - **Callback URL**: `https://seu-dominio.up.railway.app/whatsapp/webhook`
   - **Verify Token**: O mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Clique em **"Verify and Save"**

---

## ✅ Passo 6: Testar a Configuração

### 6.1 Verificar Logs

1. No Railway, vá para **"Deployments"** → **"View Logs"**
2. Procure por: `"WhatsApp service running in PRODUCTION MODE."`
3. Se aparecer `"DEMO MODE"`, verifique as variáveis de ambiente

### 6.2 Testar Envio de Mensagem

Use o endpoint de teste ou a interface da aplicação para enviar uma mensagem de teste.

### 6.3 Verificar Status da API

Acesse: `https://seu-dominio.up.railway.app/whatsapp/status`

Deve mostrar:
```json
{
  "configured": true,
  "demo_mode": false,
  "phone_number_id_set": true,
  "access_token_set": true
}
```

---

## 🔄 Alternativa: Long-Lived User Access Token (60 dias)

Se você não conseguir configurar System User tokens, pode usar **Long-Lived User Access Tokens** que duram 60 dias:

### Como Obter Long-Lived Token

1. Gere um token temporário normal no Meta Developer Console
2. Use o Graph API Explorer ou faça uma requisição para renová-lo:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=SEU_APP_ID&client_secret=SEU_APP_SECRET&fb_exchange_token=TOKEN_TEMPORARIO"
```

3. O token retornado dura 60 dias
4. Você pode configurar renovação automática (veja seção abaixo)

⚠️ **Nota**: Long-lived tokens ainda expiram após 60 dias. System User tokens são melhores para produção.

---

## 🔄 Renovação Automática (Opcional)

Se você usar Long-Lived tokens, pode implementar renovação automática usando App ID e App Secret.

Adicione estas variáveis:

```bash
WHATSAPP_APP_ID=seu_app_id
WHATSAPP_APP_SECRET=seu_app_secret
```

O sistema tentará renovar automaticamente quando o token estiver próximo de expirar.

⚠️ **Recomendação**: Use System User tokens em vez de implementar renovação automática - é mais simples e seguro.

---

## 🔐 Segurança

### Boas Práticas

1. ✅ **Nunca** commite tokens no Git
2. ✅ Use variáveis de ambiente (Railway, etc.)
3. ✅ Rotacione tokens periodicamente (a cada 90-180 dias)
4. ✅ Monitore logs para detectar acesso não autorizado
5. ✅ Use tokens de System User em vez de tokens de usuário pessoal
6. ✅ Limite permissões apenas ao necessário

### Revogação de Tokens

Se um token for comprometido:

1. No Business Manager → System Users
2. Encontre o System User
3. Revogue o token antigo
4. Gere um novo token
5. Atualize a variável de ambiente no Railway
6. Faça redeploy da aplicação

---

## 📊 Monitoramento

### Métricas Importantes

1. **Taxa de Sucesso**: % de mensagens enviadas com sucesso
2. **Taxa de Erro 401**: Indica token expirado/inválido
3. **Limite de Taxa**: Monitore limites de API do WhatsApp

### Alertas Recomendados

Configure alertas para:
- Erros 401 (Unauthorized) - Token inválido
- Erros 403 (Forbidden) - Permissões insuficientes
- Taxa de erro > 5%

---

## 🆘 Troubleshooting

### Token não funciona

1. ✅ Verifique se o token foi copiado corretamente (sem espaços)
2. ✅ Verifique se o System User tem as permissões corretas
3. ✅ Verifique se o WABA está associado ao System User
4. ✅ Verifique se o token não foi revogado

### Erro 401 Unauthorized

- Token expirado (se usar Long-Lived token)
- Token revogado
- Token incorreto
- Verifique logs para detalhes do erro

### Erro 403 Forbidden

- Permissões insuficientes no token
- WABA não associado ao System User
- App não tem permissões aprovadas

### Webhook não recebe mensagens

1. ✅ Verifique se o webhook está configurado corretamente
2. ✅ Verifique se o Verify Token está correto
3. ✅ Verifique se os campos estão subscritos (messages, message_status, etc.)
4. ✅ Verifique logs do backend

---

## 📚 Recursos Adicionais

- [Meta Business Manager Documentation](https://www.facebook.com/business/help)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [System User Access Tokens Guide](https://developers.facebook.com/docs/marketing-api/system-users)
- [WhatsApp Cloud API Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---

## ✅ Checklist de Produção

Use este checklist para garantir que tudo está configurado:

- [ ] Meta Business Manager configurado
- [ ] WhatsApp Business Account (WABA) criada/verificada
- [ ] System User criado
- [ ] System User Access Token gerado (com permissões corretas)
- [ ] WABA associada ao System User
- [ ] Variáveis de ambiente configuradas no Railway:
  - [ ] `WHATSAPP_ACCESS_TOKEN` (System User token)
  - [ ] `WHATSAPP_PHONE_NUMBER_ID`
  - [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - [ ] `WHATSAPP_DEMO_MODE=false`
  - [ ] `ENVIRONMENT=production`
- [ ] Webhook configurado no Meta
- [ ] Webhook Verify Token configurado
- [ ] Permissões do App aprovadas no Meta
- [ ] Teste de envio de mensagem realizado
- [ ] Logs verificados (modo produção ativo)
- [ ] Status da API verificado (`/whatsapp/status`)

---

## 🎉 Pronto!

Após seguir todos os passos, sua aplicação estará configurada para produção e você **não precisará mais criar tokens manualmente**!

O System User Access Token funcionará indefinidamente até que seja revogado manualmente.

