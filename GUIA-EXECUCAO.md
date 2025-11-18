# 🚀 Guia de Execução Local

Este guia mostra como executar o projeto WhatsApp SaaS localmente.

## 📋 Pré-requisitos

- **Node.js** 18+ e npm
- **Python** 3.9+
- **PostgreSQL** (ou usar o banco remoto do Railway)
- **Git**

## 🔧 Configuração Inicial

### 1. Instalar Dependências do Frontend

```bash
# Na raiz do projeto
npm install
```

### 2. Instalar Dependências do Backend

```bash
# Entrar na pasta backend
cd backend

# Criar ambiente virtual (recomendado)
python3 -m venv venv

# Ativar ambiente virtual
# No macOS/Linux:
source venv/bin/activate
# No Windows:
# venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```bash
# Database (pode usar o remoto do Railway ou local)
DATABASE_URL="postgresql://postgres:IsVXKeevkstNtmdqaULaXyCVjrgzRrkq@postgres.railway.internal:5432/railway"

# Ou para PostgreSQL local:
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/whatsapp_saas"

# Firebase (usar as credenciais do arquivo ENVIRONMENT="production".yaml)
FIREBASE_CREDENTIALS_JSON='{"type":"service_account","project_id":"whatsapp-saas-d7e5c",...}'

# CORS
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# WhatsApp (opcional para desenvolvimento - pode usar modo demo)
WHATSAPP_ACCESS_TOKEN="EAAQkk1IZBQa0BP7VnrzDj0yANOvA6FsZCsDjZCOqA5kxJ6xvZAkgpvxouUNLsD0cR2V9o95pqWbFUeThrMMPcDfgGyZBghRerlYPZACySCiqqEV79xsZAGmQGykQehHqTodzXTDxT3nNyqgEu2QIKbxXBkHJ3AhTZCsV0V4OoJJOZAAhKiQxR8d3QXggCghFpxFnzw2o0ZCCZAEYBF25tjtZAPelKy7ef4FuGLuoDJYk9phZCvtLX11Sm8iwwxJyAYZAUExXzVSOStSZBKgkPborYPFsAZDZD"
WHATSAPP_PHONE_NUMBER_ID="850427171484588"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="meu_token_secreto_as4028026"
WHATSAPP_DEMO_MODE="true"  # Use "true" para desenvolvimento sem WhatsApp real
WHATSAPP_BUSINESS_ACCOUNT_ID="985321003776234"

# OpenAI (opcional - para fallback AI)
OPENAI_API_KEY="sua_chave_openai_aqui"

# Porta (opcional, padrão 8000)
PORT=8000
```

**Nota**: Para desenvolvimento, você pode usar `WHATSAPP_DEMO_MODE="true"` para não precisar de credenciais reais do WhatsApp.

### 4. Configurar Banco de Dados

#### Opção A: Usar PostgreSQL Local

```bash
# Criar banco de dados
createdb whatsapp_saas

# Atualizar DATABASE_URL no .env para:
DATABASE_URL="postgresql://usuario:senha@localhost:5432/whatsapp_saas"
```

#### Opção B: Usar Banco Remoto (Railway)

Use a `DATABASE_URL` do arquivo `ENVIRONMENT="production".yaml` (já está no exemplo acima).

### 5. Executar Migrações do Banco

```bash
# Na pasta backend
cd backend

# Executar migrações
alembic upgrade head

# Ou criar tabelas manualmente (se necessário)
python3 -c "
import asyncio
from app.database import create_tables
asyncio.run(create_tables())
"
```

## ▶️ Executar o Projeto

### Terminal 1: Backend (FastAPI)

```bash
# Na pasta backend
cd backend

# Ativar ambiente virtual (se criou um)
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate  # Windows

# Executar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Ou usar o script start.py
python start.py
```

O backend estará disponível em: **http://localhost:8000**

- **API Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Terminal 2: Frontend (React/Vite)

```bash
# Na raiz do projeto
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

## 🔍 Verificar se Está Funcionando

1. **Backend**: Acesse http://localhost:8000/docs - deve mostrar a documentação Swagger
2. **Frontend**: Acesse http://localhost:5173 - deve abrir a landing page
3. **Health Check**: http://localhost:8000/ - deve retornar `{"message": "WhatsApp SaaS API"}`

## 🐛 Troubleshooting

### Erro: "Module not found"
- Certifique-se de que instalou todas as dependências (`npm install` e `pip install -r requirements.txt`)

### Erro: "Database connection failed"
- Verifique se o PostgreSQL está rodando
- Verifique a `DATABASE_URL` no arquivo `.env`
- Teste a conexão: `psql $DATABASE_URL`

### Erro: "Port already in use"
- Backend: Mude a porta no `.env` ou use `--port 8001`
- Frontend: Vite vai automaticamente usar outra porta se 5173 estiver ocupada

### Erro: "Firebase not configured"
- Isso é normal se não configurou o Firebase. O backend funciona sem ele, mas autenticação não funcionará.

### Modo Demo do WhatsApp
- Se `WHATSAPP_DEMO_MODE="true"`, o sistema funciona sem credenciais reais
- Mensagens não serão enviadas, mas a API responderá com dados mock

## 📝 Notas Importantes

1. **Variáveis de Ambiente**: O arquivo `ENVIRONMENT="production".yaml` contém as variáveis de produção. Use como referência, mas crie um `.env` local para desenvolvimento.

2. **Firebase**: Para autenticação funcionar, você precisa das credenciais do Firebase. Elas estão no arquivo de ambiente de produção.

3. **WhatsApp**: Para testar envio real de mensagens, você precisa:
   - Configurar `WHATSAPP_DEMO_MODE="false"`
   - Ter credenciais válidas do WhatsApp Business API
   - Configurar webhook no Meta Business Manager

4. **CORS**: Certifique-se de que `CORS_ORIGINS` no backend inclui a URL do frontend (ex: `http://localhost:5173`)

## 🎯 Próximos Passos

Após executar o projeto:

1. Teste a autenticação no frontend
2. Crie algumas FAQs no dashboard
3. Adicione itens ao catálogo
4. Teste o envio de mensagens (em modo demo ou real)
5. Configure o webhook do WhatsApp (se usar modo real)

---

**Dúvidas?** Consulte os arquivos:
- `backend/README.md` - Documentação do backend
- `backend/WHATSAPP-SETUP.md` - Setup do WhatsApp
- `backend/WEBHOOK-SETUP-GUIDE.md` - Setup do webhook

