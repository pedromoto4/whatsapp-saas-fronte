# Como Executar a Migração do Banco de Dados

## ⚠️ IMPORTANTE: Se Python não for encontrado

Se receber erro "Python was not found":
1. Instale Python de https://www.python.org/downloads/
2. Durante a instalação, marque "Add Python to PATH"
3. Reinicie o PowerShell após instalar

## Opção 1: Usando Python -m (Mais Simples - SEM ambiente virtual)

Se você já tem as dependências instaladas globalmente ou no Railway:

```powershell
cd backend
python -m alembic upgrade head
```

## Opção 2: Usando o Script Automático

No PowerShell, execute:

```powershell
cd backend
.\setup-migration.ps1
```

**Nota:** Se receber erro de política de execução:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Opção 3: Manual (Passo a Passo)

### 1. Navegar para a pasta backend

```powershell
cd backend
```

### 2. Criar e ativar ambiente virtual (se não existir)

```powershell
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1
```

**Nota:** Se receber erro de política de execução, execute primeiro:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Instalar dependências

```powershell
pip install -r requirements.txt
```

### 4. Executar migração

```powershell
alembic upgrade head
```

## Opção 3: Usando Python diretamente (sem ambiente virtual)

Se preferir não usar ambiente virtual:

```powershell
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
```

## Verificar se a migração foi executada

Para verificar o status das migrações:

```powershell
alembic current
```

Para ver histórico de migrações:

```powershell
alembic history
```

## Problemas Comuns

### Erro: "alembic não é reconhecido"
- Certifique-se de que o ambiente virtual está ativado
- Ou instale as dependências: `pip install -r requirements.txt`

### Erro: "DATABASE_URL não configurada"
- Configure a variável de ambiente `DATABASE_URL` no arquivo `.env`
- Ou exporte diretamente: `$env:DATABASE_URL="sua_url_aqui"`

### Erro de política de execução no PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

