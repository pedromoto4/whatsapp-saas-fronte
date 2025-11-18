#!/bin/bash

# Script para iniciar o projeto em modo desenvolvimento
# Uso: ./start-dev.sh

echo "🚀 Iniciando WhatsApp SaaS Platform..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 18+${NC}"
    exit 1
fi

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 não encontrado. Instale Python 3.9+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js e Python encontrados${NC}"

# Verificar dependências do frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
    npm install
fi

# Verificar dependências do backend
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}📦 Criando ambiente virtual Python...${NC}"
    cd backend
    python3 -m venv venv
    cd ..
fi

# Verificar arquivo .env do backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo backend/.env não encontrado${NC}"
    echo -e "${YELLOW}📝 Copiando .env.example para .env...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ Arquivo .env criado. Configure as variáveis antes de continuar.${NC}"
        echo -e "${YELLOW}💡 Edite backend/.env e configure pelo menos DATABASE_URL${NC}"
        read -p "Pressione Enter após configurar o .env..."
    else
        echo -e "${RED}❌ Arquivo backend/.env.example não encontrado${NC}"
        exit 1
    fi
fi

# Instalar dependências Python
echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || . venv/bin/activate
pip install -q -r requirements.txt
cd ..

# Executar migrações
echo -e "${YELLOW}🗄️  Executando migrações do banco de dados...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || . venv/bin/activate
alembic upgrade head 2>/dev/null || echo -e "${YELLOW}⚠️  Migrações falharam ou banco não configurado. Continuando...${NC}"
cd ..

echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo -e "${GREEN}🚀 Iniciando servidores...${NC}"
echo ""
echo -e "${YELLOW}📝 Abra dois terminais:${NC}"
echo -e "   Terminal 1 (Backend):  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo -e "   Terminal 2 (Frontend): npm run dev"
echo ""
echo -e "${GREEN}Ou use os comandos abaixo em terminais separados:${NC}"
echo ""
echo -e "${GREEN}Backend:${NC}"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo -e "${GREEN}Frontend:${NC}"
echo "  npm run dev"
echo ""
echo -e "${GREEN}URLs:${NC}"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"

