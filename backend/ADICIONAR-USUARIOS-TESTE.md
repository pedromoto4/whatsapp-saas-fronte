# 🔧 Como Adicionar Usuários de Teste na Meta App

Quando você vê a mensagem **"App não ativada: esta app não está acessível de momento"**, significa que a Meta App está em modo **Development** e o usuário precisa ser adicionado como testador.

> ⚠️ **Para Produção**: Se você quer que **qualquer usuário** possa usar sem precisar adicionar como testador, veja o guia `META-APP-PRODUCTION.md` para colocar a app em **Live Mode**.

## 🎯 O Problema

- A **Meta App** (criada no Meta Developer Console) está em modo **Development**
- Apenas usuários adicionados como **"Test Users"** ou **"Developers"** podem usar o OAuth
- Qualquer outro usuário verá a mensagem de erro

## ✅ Solução: Adicionar Usuários de Teste

### Passo 1: Acessar o Meta Developer Console

1. Acesse: https://developers.facebook.com/apps/
2. Selecione sua **Meta App** (a que você criou para o WhatsApp)

### Passo 2: Ir para Roles (Funções)

1. No menu lateral esquerdo, procure por **"Roles"** ou **"Funções"**
2. Ou vá em **Settings** > **Roles**

### Passo 3: Adicionar Usuário de Teste

**Opção A: Adicionar como Developer (Recomendado para você mesmo)**

1. Em **"Roles"**, procure por **"Add People"** ou **"Adicionar Pessoas"**
2. Clique em **"Add People"**
3. Digite o **email do Facebook** ou **ID do Facebook** da pessoa
4. Selecione a função: **"Developer"** ou **"Administrator"**
5. Clique em **"Add"** ou **"Adicionar"**
6. A pessoa receberá um email de convite

**Opção B: Adicionar como Test User (Para usuários finais)**

1. No menu lateral, procure por **"Roles"** > **"Test Users"** ou **"Usuários de Teste"**
2. Clique em **"Add Test Users"** ou **"Criar Usuário de Teste"**
3. Digite o **email do Facebook** da pessoa
4. A pessoa será adicionada como testador
5. Ela precisará aceitar o convite

### Passo 4: Verificar Status da App

1. No painel da app, vá em **Settings** > **Basic**
2. Verifique o **"App Mode"**:
   - **Development**: Apenas testadores podem usar
   - **Live**: Qualquer pessoa pode usar (requer revisão da Meta)

## 📝 Para Produção

Quando estiver pronto para produção:

1. Vá em **App Review** > **Permissions and Features**
2. Solicite revisão das permissões necessárias:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
3. Após aprovação, mude o modo para **"Live"**
4. Agora qualquer usuário poderá conectar

## ⚠️ Importante

- **Development Mode**: Apenas testadores podem usar
- **Live Mode**: Qualquer pessoa pode usar (mas requer revisão da Meta)
- Para desenvolvimento/testes: Use Development Mode e adicione testadores
- Para produção: Mude para Live Mode após revisão

## 🔍 Como Verificar se o Usuário Foi Adicionado

1. Vá em **Roles** > **Test Users** ou **Roles** > **People**
2. Verifique se o email do usuário aparece na lista
3. O status deve ser **"Active"** ou **"Ativo"**

## 🆘 Se o Usuário Não Receber o Convite

1. Peça para verificar a pasta de **Spam**
2. Verifique se o email está correto
3. Tente adicionar novamente
4. Use o **Facebook ID** em vez do email (mais confiável)

## 📌 Resumo Rápido

```
Meta Developer Console
  → Sua Meta App
    → Roles (ou Settings > Roles)
      → Add People / Add Test Users
        → Digite email ou Facebook ID
          → Adicione como Developer ou Test User
```

---

**Nota**: A nossa aplicação (WhatsApp SaaS) não precisa de configuração adicional. O problema está apenas na Meta App que precisa ter usuários de teste adicionados.

