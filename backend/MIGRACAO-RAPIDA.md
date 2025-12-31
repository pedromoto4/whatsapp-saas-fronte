# 🚀 Executar Migração - Guia Rápido

## Se você está no Railway (Produção)

A migração será executada automaticamente no deploy, mas você pode executar manualmente:

1. Acesse o Railway Dashboard
2. Vá em **Deployments** → Selecione o deployment mais recente
3. Clique em **View Logs**
4. Ou use o **Railway CLI**:
   ```bash
   railway run alembic upgrade head
   ```

## Se você está localmente (Desenvolvimento)

### Método Mais Simples (Recomendado)

```powershell
# 1. Navegar para backend
cd backend

# 2. Executar usando Python diretamente
python -m alembic upgrade head
```

**Se isso não funcionar**, tente:

```powershell
# Verificar se Python está instalado
python --version

# Se não funcionar, tente:
py --version
# ou
python3 --version
```

### Se Python não estiver instalado

1. Baixe Python de: https://www.python.org/downloads/
2. **IMPORTANTE:** Durante a instalação, marque ✅ "Add Python to PATH"
3. Reinicie o PowerShell
4. Execute novamente: `python -m alembic upgrade head`

### Se você tem ambiente virtual

```powershell
cd backend

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1

# Executar migração
alembic upgrade head
```

### Se você precisa instalar dependências primeiro

```powershell
cd backend

# Instalar dependências
pip install -r requirements.txt

# Executar migração
python -m alembic upgrade head
```

## Verificar se funcionou

Após executar a migração, você deve ver algo como:

```
INFO  [alembic.runtime.migration] Running upgrade 003_add_appointments_tables -> 004_add_push_tokens_table, Add push_tokens table
```

Para verificar o status:

```powershell
python -m alembic current
```

## Problema: "DATABASE_URL não configurada"

Se receber erro sobre DATABASE_URL:

1. Crie um arquivo `.env` na pasta `backend`
2. Adicione:
   ```
   DATABASE_URL=postgresql://usuario:senha@host:porta/database
   ```

Ou configure a variável de ambiente:

```powershell
$env:DATABASE_URL="sua_url_aqui"
python -m alembic upgrade head
```

## Ainda com problemas?

Execute e compartilhe o output:

```powershell
python --version
pip list | Select-String alembic
python -m alembic --version
```

