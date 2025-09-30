# WhatsApp SaaS Backend

API backend construída com FastAPI para o sistema de automação de vendas via WhatsApp.

## Funcionalidades

- 🔐 Autenticação com Firebase Auth
- 📊 PostgreSQL como banco de dados
- 🚀 Deploy automático no Railway
- 📝 API REST completa
- 🏗️ Migrações com Alembic

## Configuração Local

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Preencha as variáveis:
- `DATABASE_URL`: URL do PostgreSQL
- `FIREBASE_CREDENTIALS_JSON`: Credenciais do Firebase Admin SDK (JSON completo)
- `CORS_ORIGINS`: Origens permitidas para CORS

### 3. Executar Migrações

```bash
alembic upgrade head
```

### 4. Executar o Servidor

```bash
uvicorn main:app --reload
```

A API estará disponível em: http://localhost:8000

## Deploy no Railway

### 1. Conectar Repositório

1. Acesse [Railway](https://railway.app)
2. Crie um novo projeto
3. Conecte este repositório (pasta `backend`)

### 2. Configurar PostgreSQL

1. Adicione o plugin PostgreSQL no Railway
2. Copie a `DATABASE_URL` gerada

### 3. Configurar Variáveis de Ambiente

No Railway, configure:
- `DATABASE_URL`: URL do PostgreSQL do Railway
- `FIREBASE_CREDENTIALS_JSON`: Credenciais do Firebase (JSON como string)
- `CORS_ORIGINS`: Domínios do frontend (separados por vírgula)

### 4. Deploy Automático

O Railway fará o deploy automaticamente usando o `Dockerfile`.

## Estrutura do Projeto

```
backend/
├── app/
│   ├── __init__.py
│   ├── database.py          # Configuração do banco
│   ├── models.py           # Modelos SQLAlchemy
│   ├── schemas.py          # Schemas Pydantic
│   ├── crud.py             # Operações no banco
│   ├── dependencies.py     # Dependências comuns
│   └── routers/            # Endpoints da API
│       ├── contacts.py     # Gerenciar contatos
│       ├── campaigns.py    # Gerenciar campanhas
│       └── messages.py     # Gerenciar mensagens
├── alembic/                # Migrações do banco
├── main.py                 # Aplicação principal
├── requirements.txt        # Dependências Python
├── Dockerfile             # Configuração Docker
└── railway.json           # Configuração Railway
```

## Endpoints da API

### Autenticação
- Todos os endpoints requerem token JWT do Firebase
- Header: `Authorization: Bearer <firebase_id_token>`

### Endpoints Principais

#### Usuário
- `GET /api/me` - Informações do usuário atual
- `GET /api/users/{id}` - Informações de usuário específico

#### Contatos
- `POST /api/contacts` - Criar contato
- `GET /api/contacts` - Listar contatos
- `GET /api/contacts/{id}` - Obter contato
- `PUT /api/contacts/{id}` - Atualizar contato
- `DELETE /api/contacts/{id}` - Deletar contato

#### Campanhas
- `POST /api/campaigns` - Criar campanha
- `GET /api/campaigns` - Listar campanhas
- `GET /api/campaigns/{id}` - Obter campanha
- `PUT /api/campaigns/{id}` - Atualizar campanha
- `DELETE /api/campaigns/{id}` - Deletar campanha

#### Mensagens
- `POST /api/messages` - Criar mensagem
- `GET /api/messages/contact/{id}` - Mensagens por contato
- `GET /api/messages/campaign/{id}` - Mensagens por campanha

## Documentação

Com o servidor rodando, acesse:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc