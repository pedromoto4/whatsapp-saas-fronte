# Configuração FCM para Push Notifications

## Problema
O erro "InvalidCredentials" indica que a chave FCM (Firebase Cloud Messaging) não está configurada no projeto Expo.

## Solução

### Passo 1: Obter a Chave FCM do Firebase

**IMPORTANTE:** O Sender ID (`614740365885`) NÃO é a chave que precisamos. Precisamos da **Server Key** que começa com `AAAA...`.

#### Método 1: Server Key Legada (Mais Simples)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto do seu app
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Clique na aba **Cloud Messaging**
5. Procure por **"Cloud Messaging API (Legacy)"** - pode estar desabilitada
6. Se estiver desabilitada, você pode precisar:
   - Clicar nos três pontos (⋮) ao lado
   - Ou procurar em "Manage service accounts"
7. Procure por **"Server key"** ou **"Legacy server key"** - ela começa com `AAAA...`
8. Se não encontrar, veja o Método 2 abaixo

#### Método 2: Via Google Cloud Console (RECOMENDADO - API Legada descontinuada)

**⚠️ NOTA:** O Firebase descontinuou a API legada em junho de 2024, mas o Expo ainda suporta a Server Key legada.

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o mesmo projeto do Firebase (mesmo nome)
3. No menu lateral, vá em **APIs & Services** > **Credentials**
4. Procure na lista por:
   - **"Server key"** (pode estar com nome do projeto)
   - **"API key"** relacionada ao Firebase Cloud Messaging
5. Se não existir:
   - Clique em **"+ CREATE CREDENTIALS"** > **"API key"**
   - Na tela de criação, clique em **"Restrict key"**
   - Em **API restrictions**, selecione **"Restrict key"**
   - Escolha **"Firebase Cloud Messaging API"**
   - Salve
   - A chave criada será a Server Key (mas pode não começar com AAAA)

#### Método 3: Verificar se já existe no projeto

Às vezes a Server Key já existe mas não está visível. Tente:
1. No Google Cloud Console, vá em **APIs & Services** > **Credentials**
2. Procure por qualquer chave que tenha "Firebase" ou "FCM" no nome
3. Clique para ver detalhes - pode ser a Server Key

### Passo 2: Verificar se a Chave é a Server Key

1. No Google Cloud Console, na seção **API keys**
2. Clique em **"Show key"** na **"Android key"** (ou "Browser key")
3. Verifique se a chave começa com `AAAA...`
   - ✅ **SIM** → Esta é a Server Key! Vá para o Passo 3
   - ❌ **NÃO** → Veja a seção "Alternativa: Usar Service Account" abaixo

### Passo 3: Fazer Upload da Chave para o Expo

**IMPORTANTE:** Se você encontrou uma chave que começa com `AIzaSy...` (API Key do Google Cloud), ela pode não funcionar. Mas vamos tentar primeiro:

#### Tentativa 1: Usar a API Key encontrada

Execute o seguinte comando no terminal (na pasta `whatsapp-saas-mobile`):

```bash
cd whatsapp-saas-mobile
npx expo push:android:upload --api-key aaaaaaaaaaaaaaaaa...
```

**Se der erro**, veja as alternativas abaixo.

#### Tentativa 2: Criar API Key específica para FCM

Se a chave `AIzaSy...` não funcionar, você precisa criar uma API Key restrita para FCM:

1. No Google Cloud Console, clique em **"+ CREATE CREDENTIALS"** > **"API key"**
2. Uma nova chave será criada - **NÃO use ainda!**
3. Clique na chave recém-criada para editá-la
4. Em **"API restrictions"**, selecione **"Restrict key"**
5. Em **"Select APIs"**, procure e selecione:
   - ✅ **Firebase Cloud Messaging API**
   - ✅ **Firebase Installations API** (se disponível)
6. Clique em **"Save"**
7. Copie a nova chave e use no comando do Expo

**Nota:** Mesmo criando uma API Key restrita para FCM, ela ainda começará com `AIzaSy...`, não com `AAAA...`. O Expo pode aceitar essa chave se estiver corretamente configurada.

### Alternativa: Se não tiver Server Key (API Legada descontinuada)

Se a chave não começar com `AAAA...`, você pode:

#### Opção A: Criar nova API Key para FCM

1. No Google Cloud Console, clique em **"+ CREATE CREDENTIALS"** > **"API key"**
2. Na tela de criação, clique em **"Restrict key"**
3. Em **API restrictions**, selecione **"Restrict key"**
4. Escolha **"Firebase Cloud Messaging API"**
5. Salve e copie a chave
6. Use essa chave no comando do Expo

#### Opção B: Usar Service Account (Mais complexo, mas funciona)

Veja a seção "Configuração via Service Account" abaixo.

### Passo 3: Verificar

Após fazer o upload com sucesso, você verá:
- `✔ Uploaded FCM API Key`
- `✔ FCM API Key assigned to com.whatsappsaas.mobile`
- A chave aparece na lista de credenciais

**Agora teste:**
1. Recarregue a app no telemóvel (agite e toque em "Reload")
2. Faça login novamente
3. Envie uma mensagem de teste via WhatsApp
4. Verifique se a notificação aparece

**Se não funcionar:**
- Verifique os logs do backend no Railway
- Verifique se as permissões de notificação estão ativadas
- Verifique se o app não está em modo "Não Perturbe"

## Nota Importante

- A chave FCM é específica do projeto Firebase
- Você só precisa fazer isso uma vez por projeto
- Se mudar de projeto Firebase, precisa fazer upload novamente
- A chave é armazenada de forma segura no Expo

### ⚠️ IMPORTANTE: Diferença entre Chaves

- **VAPID Key** (Web Push): Começa com `BE_...` - NÃO é a chave que precisamos
- **Server Key** (Android FCM): Começa com `AAAA...` - Esta é a chave correta
- **Sender ID**: Número como `614740365885` - Também NÃO é a chave que precisamos

## ⚠️ PROBLEMA: Chave AIzaSy... não funciona

Se você configurou uma chave que começa com `AIzaSy...` e ainda recebe o erro `InvalidCredentials`, isso significa que essa chave não é a Server Key do FCM.

### Solução: Usar Service Account (FCM V1) - RECOMENDADO

O método moderno é usar Service Account em vez da Server Key legada:

1. **No Firebase Console:**
   - Vá em **Configurações do Projeto** > **Service accounts**
   - Clique em **"Generate new private key"**
   - Baixe o arquivo JSON

2. **No EAS CLI:**
   ```bash
   npx eas credentials
   ```
   - Selecione: **Android** > **production**
   - Escolha: **"Push Notifications (FCM V1): Google Service Account Key For FCM V1"**
   - Faça upload do arquivo JSON baixado

3. **Teste novamente**

### Alternativa: Tentar obter Server Key legada (AAAA...)

Se preferir usar a Server Key legada:
1. No Google Cloud Console, vá em **APIs & Services** > **Credentials**
2. Procure por uma chave que comece com `AAAA...` (pode não existir mais)
3. Se não existir, você precisa habilitar a API legada (não recomendado)

## ⚠️ PROBLEMA: Chave AIzaSy... não funciona

Se você configurou uma chave que começa com `AIzaSy...` e ainda recebe o erro `InvalidCredentials`, isso significa que essa chave não é a Server Key do FCM.

### Solução: Usar Service Account (FCM V1) - RECOMENDADO

O método moderno é usar Service Account em vez da Server Key legada:

1. **No Firebase Console:**
   - Vá em **Configurações do Projeto** > **Service accounts**
   - Clique em **"Generate new private key"**
   - Baixe o arquivo JSON

2. **No EAS CLI:**
   ```bash
   npx eas credentials
   ```
   - Selecione: **Android** > **production**
   - Escolha: **"Push Notifications (FCM V1): Google Service Account Key For FCM V1"**
   - Faça upload do arquivo JSON baixado

3. **Teste novamente**

### Alternativa: Tentar obter Server Key legada (AAAA...)

Se preferir usar a Server Key legada:
1. No Google Cloud Console, vá em **APIs & Services** > **Credentials**
2. Procure por uma chave que comece com `AAAA...` (pode não existir mais)
3. Se não existir, você precisa habilitar a API legada (não recomendado)

## Alternativa (Não Recomendada)

Se preferir, pode adicionar a chave diretamente no `app.json`:

```json
"android": {
  "fcmServerKey": "AAAAxxxxx:APA91bHxxxxx..."
}
```

**⚠️ ATENÇÃO:** Não faça commit desta chave no Git! Use variáveis de ambiente ou o método do EAS CLI.

