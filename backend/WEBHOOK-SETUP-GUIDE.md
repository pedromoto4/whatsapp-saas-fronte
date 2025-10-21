# 🔗 Guia de Configuração do Webhook WhatsApp

## 📋 Informações Necessárias

Antes de começar, tenha em mãos:

1. **Callback URL**: `https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/webhook`
2. **Verify Token**: O valor da variável `WHATSAPP_WEBHOOK_VERIFY_TOKEN` no Railway

### Como encontrar o Verify Token:
1. Acesse [Railway](https://railway.app)
2. Selecione seu projeto
3. Vá em **Variables**
4. Copie o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

---

## 🚀 Passo a Passo para Configurar

### **1. Acesse o Meta Developer Console**

1. Vá para [developers.facebook.com](https://developers.facebook.com)
2. Faça login com sua conta Meta/Facebook
3. Clique em **"My Apps"** no topo
4. Selecione seu app WhatsApp Business

### **2. Navegue até a Configuração do Webhook**

1. No menu lateral esquerdo, procure por **"WhatsApp"**
2. Clique em **"Configuration"** (Configuração)
3. Role até encontrar a seção **"Webhook"**

### **3. Configure o Webhook**

Na seção Webhook, você verá:

#### **Opção A: Se o webhook NÃO estiver configurado**

Clique em **"Configure Webhook"** ou **"Edit"**:

1. **Callback URL**: 
   ```
   https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/webhook
   ```

2. **Verify Token**: 
   ```
   [Cole o valor de WHATSAPP_WEBHOOK_VERIFY_TOKEN do Railway]
   ```

3. Clique em **"Verify and Save"**

#### **Opção B: Se já existir um webhook configurado**

1. Clique em **"Edit"**
2. Atualize os campos conforme acima
3. Clique em **"Verify and Save"**

### **4. Subscribe to Webhook Fields**

⚠️ **IMPORTANTE**: Você DEVE subscrever aos campos do webhook!

Na mesma página, abaixo da configuração do webhook, você verá **"Webhook fields"**:

Clique em **"Manage"** e marque as seguintes opções:

- ✅ **messages** (ESSENCIAL - sem isso não recebe mensagens!)
- ✅ **message_deliveries**
- ✅ **message_reads**
- ✅ **message_status**

Clique em **"Save"** ou **"Subscribe"**

---

## ✅ Verificar se Está Funcionando

### **Teste 1: Verificação Manual**

Execute este comando substituindo `SEU_TOKEN` pelo valor correto:

```bash
curl "https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=SEU_TOKEN"
```

**Resultado esperado**: Deve retornar `test123`

### **Teste 2: Enviar Mensagem de Teste**

1. **Do seu telefone pessoal**, envie uma mensagem para o número do WhatsApp Business
2. Aguarde 2-3 segundos
3. Verifique os logs do Railway

**Logs esperados**:
```
INFO: Received message from +351912345678: Olá
INFO: Matching FAQs for owner_id=1, normalized_text='olá'
INFO: Found X FAQs for owner_id=1
```

### **Teste 3: Auto-resposta FAQ**

1. Crie uma FAQ com keyword "teste"
2. Envie uma mensagem: "teste"
3. Deve receber resposta automática!

---

## 🚨 Troubleshooting

### **Problema: "Verification Failed"**

**Causa**: Verify Token incorreto

**Solução**:
1. Verifique o valor exato de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` no Railway
2. Certifique-se de copiar sem espaços extras
3. Tente novamente

### **Problema: Webhook configurado mas não recebe mensagens**

**Causa**: Não subscreveu aos webhook fields

**Solução**:
1. Vá para WhatsApp → Configuration
2. Role até "Webhook fields"
3. Clique em "Manage"
4. Marque **"messages"**
5. Clique em "Subscribe"

### **Problema: "Invalid URL"**

**Causa**: URL do webhook inválida

**Solução**:
1. Certifique-se que a URL é HTTPS (não HTTP)
2. Verifique se não há espaços ou caracteres extras
3. Use exatamente: `https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/webhook`

---

## 📊 Como Verificar nos Logs do Railway

1. Acesse Railway → Seu projeto
2. Clique em **"Deployments"**
3. Selecione o deployment mais recente
4. Clique em **"View Logs"**

**O que procurar:**
- ✅ `Received message from...` - Webhook recebendo mensagens
- ✅ `FAQ match result...` - Sistema tentando fazer match
- ✅ `FAQ response sent...` - Resposta automática enviada
- ❌ Se não aparecer nada quando enviar mensagem = webhook não configurado

---

## 🎯 Checklist Final

- [ ] Webhook URL configurada no Meta Developer Console
- [ ] Verify Token configurado corretamente
- [ ] Webhook verificado com sucesso ("Success" no Meta)
- [ ] Subscrito ao campo "messages"
- [ ] Testado enviando mensagem do telefone
- [ ] Logs do Railway mostram mensagens recebidas
- [ ] FAQ criada com keywords corretas
- [ ] Auto-resposta funcionando

---

## 💡 Dica Extra

Para testar rapidamente se o webhook está recebendo mensagens:

1. Envie qualquer mensagem para seu número de negócio
2. Aguarde 2-3 segundos
3. Verifique os logs do Railway
4. Se aparecer "Received message from...", está funcionando!
5. Se não aparecer nada, o webhook não está configurado corretamente no Meta

---

**🚀 Depois de configurar tudo, o sistema de auto-resposta funcionará perfeitamente!**

