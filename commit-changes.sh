#!/bin/bash

# Script para fazer commit das últimas alterações
# Execute este script para commitar as alterações do backend Railway

echo "🚀 Fazendo commit das alterações do backend Railway..."

# Adicionar todos os arquivos
git add .

# Fazer commit com mensagem descritiva
git commit -m "fix: Resolve Railway deployment PORT variable issue

- Fix PORT environment variable handling in start.sh script
- Update railway.json to use Python start script for reliability
- Update Dockerfile to use Python start script as default CMD
- Add robust PORT validation in shell script
- Ensure proper integer handling for uvicorn port parameter

Backend deployment should now work correctly on Railway platform."

echo "✅ Commit realizado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute 'git push' para enviar as alterações para o repositório"
echo "2. Redeploy no Railway - o erro do PORT deve estar resolvido"
echo "3. Verifique os logs de deployment para confirmar o funcionamento"