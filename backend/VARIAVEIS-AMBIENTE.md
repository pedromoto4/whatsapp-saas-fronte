# 📋 Variáveis de Ambiente do Backend

## Resumo

**SIM, você já tem um arquivo `.env` no diretório `/backend`** que contém as variáveis de ambiente configuradas localmente.

Quando você rodar a aplicação localmente, o backend carregará automaticamente essas variáveis usando `load_dotenv()` (chamado no `main.py` e `database.py`).

---

## 🔐 Variáveis de Ambiente Necessárias

### 1. **Banco de Dados**

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```
- **Usado em**: `app/database.py`, `alembic/env.py`
- **Descrição**: URL de conexão com PostgreSQL
- **Default local**: `postgresql://postgres:IsVXKeevkstNtmdqaULaXyCVjrgzRrkq@ballast.proxy.rlwy.net:52154/railway`
- **Obrigatório**: ✅ Sim

---

### 2. **Firebase Authentication**

```bash
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}
```
- **Usado em**: `main.py`
- **Descrição**: Credenciais do Firebase Admin SDK em formato JSON (como string)
- **Obrigatório**: ⚠️ Opcional (se não configurado, Firebase não será inicializado)

---

### 3. **WhatsApp Business API**

#### 3.1. Access Token
```bash
WHATSAPP_ACCESS_TOKEN=your_access_token
```
- **Usado em**: `app/whatsapp_service.py`
- **Descrição**: Token de acesso da API do WhatsApp Business
- **Obrigatório**: ⚠️ Opcional (se não configurado, entra em modo DEMO)

#### 3.2. Phone Number ID
```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```
- **Usado em**: `app/whatsapp_service.py`
- **Descrição**: ID do número de telefone do WhatsApp Business
- **Obrigatório**: ⚠️ Opcional (se não configurado, entra em modo DEMO)

#### 3.3. Webhook Verify Token
```bash
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```
- **Usado em**: `app/whatsapp_service.py`
- **Descrição**: Token de verificação do webhook do WhatsApp
- **Obrigatório**: ⚠️ Opcional (necessário apenas para webhook)

#### 3.4. Business Account ID
```bash
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```
- **Usado em**: `app/whatsapp_service.py`
- **Descrição**: ID da conta de negócios do WhatsApp (para listar/submeter templates)
- **Obrigatório**: ⚠️ Opcional (necessário apenas para templates)

#### 3.5. Modo Demo
```bash
WHATSAPP_DEMO_MODE=true
```
- **Usado em**: `app/whatsapp_service.py`
- **Descrição**: Ativa/desativa modo demo (default: "true")
- **Obrigatório**: ❌ Não (default: "true")
- **Valores**: "true" ou "false"

---

### 4. **OpenAI (AI Service)**

```bash
OPENAI_API_KEY=your_openai_api_key
```
- **Usado em**: `app/ai_service.py`
- **Descrição**: Chave da API da OpenAI para respostas automáticas (fallback)
- **Obrigatório**: ⚠️ Opcional (se não configurado, AI não funcionará)

---

### 5. **Ambiente e Porta**

#### 5.1. Environment
```bash
ENVIRONMENT=development
```
- **Usado em**: `main.py`, `app/database.py`
- **Descrição**: Define o ambiente (development/production)
- **Valores**: "development" ou "production"
- **Default**: "production"
- **Obrigatório**: ❌ Não

#### 5.2. Port
```bash
PORT=8000
```
- **Usado em**: `main.py`
- **Descrição**: Porta do servidor FastAPI
- **Default**: 8000
- **Obrigatório**: ❌ Não

---

## 📝 Resumo por Prioridade

### 🔴 **Obrigatórias**
1. `DATABASE_URL` - Para conectar ao banco de dados

### 🟡 **Altamente Recomendadas**
2. `FIREBASE_CREDENTIALS_JSON` - Para autenticação funcionar
3. `WHATSAPP_ACCESS_TOKEN` - Para envio real de mensagens WhatsApp
4. `WHATSAPP_PHONE_NUMBER_ID` - Para envio real de mensagens WhatsApp

### 🟢 **Opcionais (Funcionalidades Avançadas)**
5. `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Para receber mensagens via webhook
6. `WHATSAPP_BUSINESS_ACCOUNT_ID` - Para gerenciar templates do WhatsApp
7. `OPENAI_API_KEY` - Para respostas automáticas com IA
8. `WHATSAPP_DEMO_MODE` - Para modo demo (default: "true")
9. `ENVIRONMENT` - Para definir ambiente (default: "production")
10. `PORT` - Para definir porta (default: 8000)

---

## 🔍 Como Verificar se Estão Configuradas

### No Código

O backend usa `load_dotenv()` no início de `main.py` e `database.py`, então:

1. ✅ **Se você tem um arquivo `.env` no diretório `/backend`**: As variáveis serão carregadas automaticamente
2. ✅ **Se você define variáveis no sistema**: Elas também funcionarão (prioridade maior que .env)

### Modo Demo

Se as variáveis do WhatsApp não estiverem configuradas:
- ✅ O sistema **funcionará normalmente** em modo DEMO
- ✅ Mensagens retornarão respostas mock (sem enviar mensagens reais)
- ✅ Templates retornarão templates mock
- ✅ Logs mostrarão: `"WhatsApp service running in DEMO MODE."`

---

## 🚀 Como Usar Localmente

1. **Arquivo `.env` existe**: As variáveis já estão configuradas ✅
2. **Rodar backend**: Execute `uvicorn main:app --reload` ou `python main.py`
3. **Verificar**: Acesse `http://localhost:8000/health` para ver se as variáveis estão carregadas

---

## 📋 Checklist de Variáveis

Use este checklist para verificar se você tem todas as variáveis necessárias no seu `.env`:

```bash
# Banco de Dados
✅ DATABASE_URL

# Firebase
✅ FIREBASE_CREDENTIALS_JSON

# WhatsApp
✅ WHATSAPP_ACCESS_TOKEN
✅ WHATSAPP_PHONE_NUMBER_ID
✅ WHATSAPP_WEBHOOK_VERIFY_TOKEN
✅ WHATSAPP_BUSINESS_ACCOUNT_ID
✅ WHATSAPP_DEMO_MODE

# OpenAI
✅ OPENAI_API_KEY

# Ambiente
✅ ENVIRONMENT
✅ PORT
```

---

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- O arquivo `.env` **NÃO** deve ser commitado no git (já está no `.gitignore`)
- Mantenha as credenciais seguras
- Use variáveis de ambiente do sistema em produção

---

## 📚 Documentação Adicional

- **WhatsApp Setup**: Ver `WHATSAPP-SETUP.md`
- **Database Setup**: Ver `README.md`
- **Railway Deployment**: Ver `RAILWAY-DEPLOYMENT.md`




