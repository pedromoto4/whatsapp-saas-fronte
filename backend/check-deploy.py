#!/usr/bin/env python3
"""
Script de diagnóstico para verificar problemas no deploy
"""
import os
import sys

def check_environment():
    """Verificar variáveis de ambiente essenciais"""
    print("🔍 Verificando variáveis de ambiente...")
    
    required_vars = ["DATABASE_URL"]
    optional_vars = ["PORT", "FIREBASE_CREDENTIALS_JSON"]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
            print(f"  ❌ {var} - NÃO CONFIGURADA")
        else:
            print(f"  ✅ {var} - Configurada")
    
    for var in optional_vars:
        if os.getenv(var):
            print(f"  ✅ {var} - Configurada")
        else:
            print(f"  ⚠️  {var} - Não configurada (opcional)")
    
    if missing:
        print(f"\n❌ Variáveis obrigatórias faltando: {', '.join(missing)}")
        return False
    
    return True

def check_imports():
    """Verificar se os imports funcionam"""
    print("\n🔍 Verificando imports...")
    
    try:
        import fastapi
        print("  ✅ fastapi")
    except ImportError as e:
        print(f"  ❌ fastapi - {e}")
        return False
    
    try:
        import sqlalchemy
        print("  ✅ sqlalchemy")
    except ImportError as e:
        print(f"  ❌ sqlalchemy - {e}")
        return False
    
    try:
        import alembic
        print("  ✅ alembic")
    except ImportError as e:
        print(f"  ❌ alembic - {e}")
        return False
    
    try:
        from app.database import Base
        print("  ✅ app.database")
    except Exception as e:
        print(f"  ❌ app.database - {e}")
        return False
    
    try:
        from app.models import PushToken
        print("  ✅ app.models (PushToken)")
    except Exception as e:
        print(f"  ❌ app.models - {e}")
        return False
    
    return True

def check_alembic():
    """Verificar se o Alembic está configurado corretamente"""
    print("\n🔍 Verificando configuração do Alembic...")
    
    alembic_ini = "alembic.ini"
    if os.path.exists(alembic_ini):
        print(f"  ✅ {alembic_ini} existe")
    else:
        print(f"  ❌ {alembic_ini} não encontrado")
        return False
    
    alembic_dir = "alembic"
    if os.path.exists(alembic_dir):
        print(f"  ✅ {alembic_dir}/ existe")
    else:
        print(f"  ❌ {alembic_dir}/ não encontrado")
        return False
    
    env_py = "alembic/env.py"
    if os.path.exists(env_py):
        print(f"  ✅ {env_py} existe")
    else:
        print(f"  ❌ {env_py} não encontrado")
        return False
    
    versions_dir = "alembic/versions"
    if os.path.exists(versions_dir):
        versions = [f for f in os.listdir(versions_dir) if f.endswith('.py')]
        print(f"  ✅ {versions_dir}/ existe ({len(versions)} migrações encontradas)")
    else:
        print(f"  ❌ {versions_dir}/ não encontrado")
        return False
    
    return True

def check_files():
    """Verificar se os arquivos principais existem"""
    print("\n🔍 Verificando arquivos principais...")
    
    required_files = [
        "main.py",
        "start.py",
        "requirements.txt",
        "app/__init__.py",
        "app/database.py",
        "app/models.py",
    ]
    
    all_exist = True
    for file in required_files:
        if os.path.exists(file):
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - NÃO ENCONTRADO")
            all_exist = False
    
    return all_exist

if __name__ == "__main__":
    print("=" * 60)
    print("DIAGNÓSTICO DE DEPLOY - WhatsApp SaaS Backend")
    print("=" * 60)
    
    all_ok = True
    
    all_ok = check_environment() and all_ok
    all_ok = check_files() and all_ok
    all_ok = check_imports() and all_ok
    all_ok = check_alembic() and all_ok
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ Todas as verificações passaram!")
        sys.exit(0)
    else:
        print("❌ Algumas verificações falharam. Verifique os erros acima.")
        sys.exit(1)

