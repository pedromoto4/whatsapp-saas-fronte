#!/bin/bash

# Add the remote repository
git remote add origin https://github.com/pedromoto4/whatsapp-saas-fronte.git

# Check if remote was added successfully
git remote -v

# Add all files to staging
git add .

# Commit changes
git commit -m "Initial commit: WhatsApp SaaS frontend with React, authentication, and dashboard"

# Push to remote repository (force push to overwrite any existing content)
git push -u origin main --force

echo "Repository successfully connected to remote and pushed!"