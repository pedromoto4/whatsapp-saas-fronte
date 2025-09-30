#!/usr/bin/env python3
"""
Local development setup script for WhatsApp SaaS Backend
"""

import os
import shutil
from pathlib import Path

def setup_environment():
    """Setup local development environment"""
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    env_example = backend_dir / ".env.example"
    
    if not env_file.exists() and env_example.exists():
        print("Creating .env file from .env.example...")
        shutil.copy(env_example, env_file)
        print("✅ .env file created")
        print("📝 Please edit .env file with your actual configuration")
    else:
        print("ℹ️  .env file already exists")
    
    print("\n🚀 Setup complete!")
    print("\nNext steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Edit .env file with your database URL and other settings")
    print("3. Run the server: python main.py")
    print("4. Test the API at: http://localhost:8000")
    print("5. View API docs at: http://localhost:8000/docs")

if __name__ == "__main__":
    setup_environment()