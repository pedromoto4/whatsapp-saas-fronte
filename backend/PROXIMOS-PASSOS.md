# 🚀 Próximos Passos - Integração WhatsApp OAuth

Este documento lista os próximos passos para colocar a integração WhatsApp OAuth em funcionamento.

---

## ✅ Checklist de Implementação

### 1. Executar Migration do Banco de Dados

A tabela `integrations` precisa ser criada no banco de dados.

**Opção A: Localmente**
```bash
cd backend
alembic upgrade head
```

**Opção B: No Railway (se já está deployado)**
```bash
railway run alembic upgrade head
```

**Verificar se funcionou:**
- A migration `005_add_integrations_table` deve ser aplicada
- A tabela `integrations` deve aparecer no banco de dados

---

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente ao seu `.env` (local) ou no Railway (produção):

```bash
# OAuth da Meta (OBRIGATÓRIO para OAuth funcionar)
META_APP_ID=seu_app_id_aqui
META_APP_SECRET=seu_app_secret_aqui
META_OAUTH_REDIRECT_URI=https://seu-dominio.com/api/integrations/oauth/callback

# Frontend URL (para redirecionamento após OAuth)
FRONTEND_URL=https://seu-dominio.com

# Para desenvolvimento local:
# META_OAUTH_REDIRECT_URI=http://localhost:8000/api/integrations/oauth/callback
# FRONTEND_URL=http://localhost:5173
```

**Nota:** Para obter `META_APP_ID` e `META_APP_SECRET`, siga o guia `WHATSAPP-OAUTH-SETUP.md`.

---

### 3. Configurar Meta App no Meta Developer Console

Este é o passo mais importante e requer configuração manual no Meta Developer Console.

**📖 Siga o guia completo:** `backend/WHATSAPP-OAUTH-SETUP.md`

**Resumo rápido:**
1. Criar Meta App no [Meta Developer Console](https://developers.facebook.com/apps/)
2. Adicionar produto WhatsApp
3. Obter App ID e App Secret
4. Configurar OAuth Redirect URI
5. Conectar WhatsApp Business Account (WABA)
6. Configurar webhook global (1x apenas)

---

### 4. Configurar Webhook (Global - Uma vez apenas)

O webhook é configurado **uma única vez** no Meta Developer Console e funciona para todos os usuários.

**No Meta Developer Console:**
1. WhatsApp > Configuration > Webhook
2. Callback URL: `https://seu-dominio.com/whatsapp/webhook`
3. Verify Token: Gere um token aleatório
4. Subscribe: `messages`, `message_status`

**Adicione ao `.env`:**
```bash
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui
```

---

### 5. Testar a Implementação

#### 5.1. Testar Backend

1. **Iniciar o servidor:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Verificar se o router está registrado:**
   - Acesse: `http://localhost:8000/docs`
   - Procure por endpoints `/api/integrations/*`

3. **Testar endpoint de autorização:**
   ```bash
   # Faça login primeiro para obter o token
   GET /api/integrations/oauth/authorize
   # Deve retornar: { "auth_url": "...", "state": "..." }
   ```

#### 5.2. Testar Frontend

1. **Iniciar o frontend:**
   ```bash
   npm run dev
   ```

2. **Acessar a página de integração:**
   - Faça login
   - Vá para "Integração WhatsApp" no menu lateral
   - Clique em "Conectar WhatsApp"
   - Deve redirecionar para Meta OAuth

3. **Completar OAuth:**
   - Autorize a aplicação na Meta
   - Deve redirecionar de volta para o frontend
   - A integração deve aparecer como conectada

#### 5.3. Testar Envio de Mensagem

1. Após conectar, use o endpoint de teste:
   ```bash
   POST /api/integrations/whatsapp/test
   ```

2. Ou envie uma mensagem através da interface de conversas

#### 5.4. Testar Recebimento de Mensagem

1. Envie uma mensagem WhatsApp para o número conectado
2. Verifique se o webhook recebe a mensagem
3. Verifique se a mensagem aparece na interface do usuário correto

---

### 6. Verificar Logs

Monitore os logs do backend para identificar problemas:

```bash
# Logs locais
# (aparecem no console onde o uvicorn está rodando)

# Logs no Railway
railway logs
```

**Logs importantes a observar:**
- OAuth flow: "OAuth callback received", "Integration created"
- Webhook: "Webhook recebido", "Phone Number ID extraído"
- Envio: "Attempting to send message", "Message sent successfully"

---

## 🔍 Troubleshooting

### Migration falha

**Erro:** `No such table: integrations`
- **Solução:** Execute `alembic upgrade head`

**Erro:** `Revision not found`
- **Solução:** Verifique se a migration `005_add_integrations_table.py` existe em `backend/alembic/versions/`

### OAuth não funciona

**Erro:** "OAuth not configured"
- **Solução:** Verifique se `META_APP_ID` e `META_APP_SECRET` estão configurados

**Erro:** "Redirect URI mismatch"
- **Solução:** Verifique se `META_OAUTH_REDIRECT_URI` está exatamente igual ao configurado no Meta Developer Console

**Erro:** "No WhatsApp Business Account found"
- **Solução:** Certifique-se de que o usuário tem um WABA configurado e conectado ao Meta App

### Webhook não funciona

**Erro:** Webhook não recebe mensagens
- **Solução:** 
  1. Verifique se o webhook foi verificado no Meta Developer Console
  2. Verifique se a URL do webhook está correta e acessível
  3. Verifique se o Verify Token está correto

### Mensagens não são roteadas corretamente

**Problema:** Mensagens aparecem no usuário errado
- **Solução:** 
  1. Verifique se o `phone_number_id` está sendo extraído corretamente do webhook
  2. Verifique se a integração está sendo encontrada pelo `phone_number_id`
  3. Verifique os logs do webhook para ver qual `phone_number_id` está chegando

---

## 📝 Próximas Melhorias (Opcional)

Após tudo funcionar, considere implementar:

1. **Refresh Token Automático**
   - Tokens OAuth expiram após 60 dias
   - Implementar renovação automática antes da expiração

2. **Criptografia de Tokens**
   - Criptografar `wa_access_token` no banco de dados
   - Usar biblioteca como `cryptography`

3. **Validação de Token**
   - Verificar periodicamente se o token ainda é válido
   - Notificar usuário se token expirou

4. **Suporte a Múltiplos Números**
   - Permitir que usuário conecte múltiplos números WhatsApp
   - Adicionar campo `phone_number_id` não único

5. **Testes Automatizados**
   - Testes unitários para CRUD de integrações
   - Testes de integração para OAuth flow

---

## 📚 Documentação Relacionada

- `backend/WHATSAPP-OAUTH-SETUP.md` - Guia completo de configuração OAuth
- `backend/VARIAVEIS-AMBIENTE.md` - Documentação de todas as variáveis de ambiente
- `backend/PRODUCTION-SETUP.md` - Guia de configuração para produção

---

## ✅ Checklist Final

Antes de considerar tudo pronto, verifique:

- [ ] Migration executada com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Meta App criada e configurada
- [ ] OAuth Redirect URI configurado
- [ ] Webhook configurado e verificado
- [ ] Frontend acessível e funcionando
- [ ] Teste de conexão OAuth bem-sucedido
- [ ] Teste de envio de mensagem funcionando
- [ ] Teste de recebimento de mensagem funcionando
- [ ] Logs sem erros críticos

---

**🎉 Boa sorte com a implementação!**

