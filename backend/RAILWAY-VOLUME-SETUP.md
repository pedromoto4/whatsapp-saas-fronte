# 📦 Guia: Configurar Railway Volume para Armazenamento Persistente

Este guia explica como configurar um Volume no Railway para armazenar ficheiros de forma persistente (imagens de produtos, media enviada via WhatsApp, etc.).

## 🎯 Porquê Railway Volumes?

- ✅ **Persistência**: Ficheiros não são apagados quando o container reinicia
- ✅ **Simplicidade**: Integração nativa com Railway, sem serviços externos
- ✅ **Custo fixo**: $0.25/GB/mês (previsível)
- ✅ **Fácil configuração**: Apenas alguns cliques no dashboard

---

## 📋 Passo a Passo

### **Passo 1: Criar o Volume**

1. **Aceda ao Railway Dashboard**
   - Vá para https://railway.app
   - Faça login na sua conta

2. **Abra o seu projeto**
   - Clique no projeto do backend (ex: "whatsapp-saas-backend")

3. **Criar novo Volume**
   - No menu lateral esquerdo, clique em **"New"**
   - Selecione **"Volume"** no menu dropdown

4. **Configurar o Volume**
   - **Name**: `uploads-storage` (ou outro nome de sua preferência)
   - **Size**: Comece com `1 GB` (pode aumentar depois se necessário)
   - Clique em **"Create"**

   ⚠️ **Nota**: O tamanho pode ser aumentado depois, mas não pode ser reduzido.

---

### **Passo 2: Conectar o Volume ao Serviço**

1. **Abra o serviço do backend**
   - No projeto, clique no serviço do backend (geralmente aparece como "Backend" ou o nome do seu serviço)

2. **Aceda às configurações**
   - Clique no separador **"Settings"** (ou "Configurações")
   - No menu lateral, procure por **"Volumes"** ou **"Storage"**

3. **Adicionar o Volume**
   - Clique em **"Add Volume"** ou **"Mount Volume"**
   - Selecione o volume criado (`uploads-storage`)
   - **Mount Path**: `/data/uploads` (ou outro caminho de sua preferência)
   - Clique em **"Save"** ou **"Mount"**

   📝 **Importante**: Anote o **Mount Path** que configurou (ex: `/data/uploads`)

---

### **Passo 3: Configurar Variável de Ambiente (Opcional)**

1. **Aceda às variáveis de ambiente**
   - No mesmo serviço, vá para **"Variables"** ou **"Variáveis de Ambiente"**

2. **Adicionar variável (opcional)**
   - **Nome**: `RAILWAY_VOLUME_MOUNT_PATH`
   - **Valor**: O mesmo Mount Path que configurou (ex: `/data/uploads`)
   - Clique em **"Add"**

   ⚠️ **Nota**: Esta variável é opcional. O código detecta automaticamente o volume, mas pode ser útil para debug.

3. **Verificar outras variáveis importantes**
   - Certifique-se de que tem `UPLOAD_BASE_URL` configurada (se necessário)
   - O código usa automaticamente o domínio do Railway se não estiver configurada

---

### **Passo 4: Fazer Deploy**

1. **Commit e Push das mudanças**
   ```bash
   git add .
   git commit -m "Add Railway Volume support for persistent storage"
   git push
   ```

2. **Railway fará deploy automaticamente**
   - O Railway detecta o push e inicia o deploy
   - Aguarde alguns minutos até o deploy completar

3. **Verificar logs**
   - No Railway, vá para **"Deployments"** ou **"Logs"**
   - Procure por mensagens como:
     - `"Using Railway volume at: /data/uploads"`
     - `"Upload directory ensured: /data/uploads"`
     - `"Storage initialized - Base path: /data/uploads"`

---

## ✅ Verificação

### **Teste 1: Upload de ficheiro**

1. Use a aplicação para fazer upload de uma imagem
2. Verifique os logs do Railway para confirmar que o ficheiro foi guardado no volume
3. Reinicie o serviço (ou aguarde um reinício automático)
4. Verifique se o ficheiro ainda existe (deve existir!)

### **Teste 2: Aceder ao ficheiro**

1. Após o upload, copie a URL pública retornada
2. Abra a URL no navegador
3. A imagem deve carregar corretamente

### **Teste 3: Enviar produto com imagem**

1. Crie/edite um produto no catálogo com imagem
2. Tente enviar o produto via WhatsApp
3. A imagem deve ser enviada com sucesso

---

## 🔍 Troubleshooting

### **Problema: Ficheiros ainda não persistem**

**Solução:**
- Verifique se o volume está montado corretamente
- Verifique os logs para ver qual caminho está a ser usado
- Certifique-se de que o Mount Path está correto

### **Problema: Erro "Permission denied"**

**Solução:**
- O Railway deve configurar as permissões automaticamente
- Se persistir, pode ser necessário ajustar permissões no Dockerfile

### **Problema: Volume não aparece nas opções**

**Solução:**
- Certifique-se de que criou o volume no projeto correto
- Verifique se o volume foi criado com sucesso
- Tente criar um novo volume

---

## 📊 Monitorização

### **Verificar uso do Volume**

1. No Railway, vá para o volume criado
2. Veja o **"Usage"** ou **"Uso"**
3. Monitore o espaço usado

### **Aumentar tamanho do Volume**

1. No volume, clique em **"Settings"**
2. Aumente o **"Size"**
3. ⚠️ **Atenção**: Não pode reduzir o tamanho depois

---

## 💰 Custos

- **$0.25 por GB/mês**
- Exemplo:
  - 1 GB = $0.25/mês
  - 10 GB = $2.50/mês
  - 100 GB = $25/mês

---

## 🔄 Migração Futura

Se no futuro quiser migrar para S3 ou outro serviço:

1. O código já está preparado com abstração (`StorageService`)
2. Basta criar uma nova implementação (ex: `S3Storage`)
3. Alterar `STORAGE_TYPE` nas variáveis de ambiente
4. O resto do código continua a funcionar!

---

## 📝 Resumo

✅ **Volume criado**: `uploads-storage`  
✅ **Mount Path**: `/data/uploads`  
✅ **Código atualizado**: Usa o volume automaticamente  
✅ **Deploy feito**: Ficheiros agora persistem!

---

## 🆘 Precisa de ajuda?

Se encontrar problemas:
1. Verifique os logs do Railway
2. Confirme que o volume está montado
3. Verifique as variáveis de ambiente
4. Teste localmente primeiro (usa `./uploads` como fallback)

