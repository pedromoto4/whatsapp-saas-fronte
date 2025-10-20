# 🚀 Guia para Resolver Problemas de Entrega de Mensagens WhatsApp

## 🔍 Diagnóstico do Problema

**Situação**: A mensagem é enviada com sucesso pela API (`"Mensagem enviada com sucesso!"`), mas não chega ao telefone do destinatário.

**Causa mais provável**: Violação da **regra das 24 horas** do WhatsApp Business API.

## 📋 Regras do WhatsApp Business API

### ⏰ Janela de 24 Horas
- **Mensagens livres**: Só podem ser enviadas para números que entraram em contato com você nas últimas 24 horas
- **Mensagens template**: Podem ser enviadas a qualquer momento, mas precisam ser aprovadas pelo Meta

### 🎯 Cenários Possíveis

1. **✅ Dentro da janela de 24h**: Mensagem livre é entregue
2. **❌ Fora da janela de 24h**: Mensagem livre é rejeitada
3. **📋 Template aprovado**: Sempre funciona (após aprovação)

## 🛠️ Soluções Práticas

### **Solução 1: Abrir a Janela de 24 Horas**

1. **Envie uma mensagem PARA o seu número de negócio**:
   - Use seu WhatsApp pessoal
   - Envie uma mensagem para o número do WhatsApp Business
   - Isso abre a janela de 24 horas

2. **Aguarde alguns segundos** e tente enviar uma mensagem do sistema

3. **Teste novamente** - agora deve funcionar!

### **Solução 2: Criar e Usar Templates**

1. **Acesse o Meta Developer Console**:
   - Vá para [developers.facebook.com](https://developers.facebook.com)
   - Selecione seu app WhatsApp Business

2. **Criar Template**:
   - Vá para **WhatsApp** → **Message Templates**
   - Clique em **"Create Template"**
   - Escolha **"Text"**
   - Nome: `hello_world`
   - Conteúdo: `Olá {{1}}! Esta é uma mensagem de teste.`
   - Idioma: `Portuguese (Brazil)`
   - Categoria: `UTILITY`

3. **Aguardar Aprovação**:
   - Templates levam 24-48 horas para serem aprovados
   - Você receberá um email quando aprovado

4. **Usar Template Aprovado**:
   ```json
   {
     "phone_number": "+351912345678",
     "template_name": "hello_world",
     "template_params": ["João"]
   }
   ```

### **Solução 3: Testar com Número Oficial**

Use o número de teste oficial do Meta: `+15551234567`

Este número sempre funciona para testes.

## 🧪 Como Testar Agora

### **Teste Rápido (Recomendado)**

1. **Abra seu WhatsApp pessoal**
2. **Envie uma mensagem para o número do seu WhatsApp Business**
   - Exemplo: "Olá, quero testar o sistema"
3. **Aguarde 30 segundos**
4. **Tente enviar uma mensagem pelo sistema**
5. **Verifique se chegou**

### **Verificar Status da Mensagem**

O sistema deve mostrar o status real da mensagem. Vamos melhorar o logging:

## 🔧 Melhorias no Sistema

Vamos adicionar melhor logging para diagnosticar problemas de entrega:

```python
# No whatsapp_service.py, vamos adicionar mais detalhes na resposta
async def send_message(self, to: str, message: str, message_type: str = "text") -> Dict[str, Any]:
    # ... código existente ...
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            
            # Log detalhado da resposta
            logger.info(f"WhatsApp API Response: {response.status_code}")
            logger.info(f"Response body: {response.text}")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"WhatsApp API error: {e}")
        logger.error(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
        raise Exception(f"Failed to send WhatsApp message: {e}")
```

## 📊 Monitoramento de Status

### **Webhooks para Status**

Configure webhooks para receber atualizações de status:

1. **No Meta Developer Console**:
   - Vá para **WhatsApp** → **Configuration**
   - Configure webhook URL: `https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/webhook`
   - Subscribe to: `messages`, `message_deliveries`, `message_reads`

2. **Status possíveis**:
   - `sent`: Mensagem enviada
   - `delivered`: Mensagem entregue
   - `read`: Mensagem lida
   - `failed`: Falha na entrega

## 🚨 Troubleshooting Comum

### **Erro: "Message failed to send"**
- Verifique se o número tem WhatsApp
- Confirme formato do número (+country code)
- Verifique se está na janela de 24h

### **Erro: "Template not found"**
- Template não foi aprovado ainda
- Nome do template está incorreto
- Template foi rejeitado pelo Meta

### **Erro: "Rate limit exceeded"**
- Muitas mensagens enviadas
- Aguarde antes de enviar mais
- Verifique limites da sua conta

## ✅ Checklist de Verificação

- [ ] Número do destinatário está correto e tem WhatsApp
- [ ] Formato do número inclui código do país (+351...)
- [ ] Janela de 24 horas está aberta OU usando template aprovado
- [ ] Token de acesso é válido
- [ ] Phone Number ID está correto
- [ ] Webhook está configurado para receber status

## 🎯 Próximos Passos

1. **Teste imediato**: Envie mensagem para seu número de negócio primeiro
2. **Crie templates**: Para uso futuro sem limitação de 24h
3. **Configure webhooks**: Para monitorar status de entrega
4. **Teste com números reais**: Após confirmar funcionamento

---

**💡 Dica**: O problema mais comum é a regra das 24 horas. Sempre teste primeiro enviando uma mensagem PARA o seu número de negócio!
