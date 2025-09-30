#!/bin/bash

# Script para fazer commit das últimas alterações
# Execute este script para commitar as alterações do backend Railway

echo "🚀 Fazendo commit das alterações do backend Railway..."

# Adicionar todos os arquivos
git add .

# Fazer commit com mensagem descritiva
git commit -m "feat: Add FastAPI backend with Railway deployment support

- Add complete FastAPI backend structure
- Add PostgreSQL database integration with SQLAlchemy
- Add authentication system with JWT tokens
- Add customer management endpoints (CRUD)
- Add email campaign functionality
- Add Railway deployment configuration
- Add environment variables for Railway PostgreSQL
- Add Alembic migrations for database schema
- Add comprehensive error handling
- Add CORS middleware for frontend integration
- Add Pydantic models for data validation
- Add proper project structure and documentation"

echo "✅ Commit realizado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute 'git push' para enviar as alterações para o repositório"
echo "2. Configure o projeto no Railway usando o arquivo railway.json"
echo "3. Execute as migrações da base de dados após o deploy"