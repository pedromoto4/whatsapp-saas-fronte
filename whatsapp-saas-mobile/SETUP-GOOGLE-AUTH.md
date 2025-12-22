# Configuração do Google Sign-In

Este guia explica como configurar o Google Sign-In nativo para a aplicação mobile.

## Passo 1: Configurar Firebase Console

1. Acede ao [Firebase Console](https://console.firebase.google.com/)
2. Seleciona o projeto: `whatsapp-saas-d7e5c`
3. Vai a **Project Settings** (ícone de engrenagem)
4. Na secção **Your apps**, clica em **Add app** → **Android**

### Configurar App Android:
- **Android package name**: `com.whatsappsaas.mobile`
- **App nickname**: `WhatsApp SaaS Mobile`
- **Debug signing certificate SHA-1**: (ver abaixo como obter)

## Passo 2: Obter SHA-1 Fingerprint

Para development build, usa o SHA-1 do Expo:

```bash
# No terminal do projeto
eas credentials -p android
```

Ou gera um keystore de debug:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Passo 3: Baixar google-services.json

1. No Firebase Console, após adicionar a app Android
2. Clica em **Download google-services.json**
3. Coloca o ficheiro na pasta raiz do projeto mobile:
   ```
   whatsapp-saas-mobile/google-services.json
   ```

## Passo 4: Obter Web Client ID

1. No Firebase Console, vai a **Authentication** → **Sign-in method**
2. Ativa **Google** como provider
3. Copia o **Web client ID** (formato: `XXXX.apps.googleusercontent.com`)
4. Atualiza o ficheiro `lib/auth-store.ts`:
   ```typescript
   const WEB_CLIENT_ID = 'SEU_WEB_CLIENT_ID_AQUI.apps.googleusercontent.com';
   ```

## Passo 5: Atualizar app.json

No ficheiro `app.json`, atualiza o `iosUrlScheme` com o teu client ID invertido:
```json
"@react-native-google-signin/google-signin",
{
  "iosUrlScheme": "com.googleusercontent.apps.SEU_CLIENT_ID"
}
```

## Passo 6: Criar Development Build

```bash
# Instalar EAS CLI (se ainda não tiver)
npm install -g eas-cli

# Login na conta Expo
eas login

# Configurar o projeto EAS (primeira vez)
eas build:configure

# Criar development build para Android
eas build --platform android --profile development
```

## Passo 7: Instalar o APK

Após o build terminar:
1. Faz download do APK gerado
2. Instala no teu dispositivo Android
3. A app agora tem suporte nativo ao Google Sign-In!

## Estrutura do google-services.json

O ficheiro deve ter esta estrutura (exemplo):
```json
{
  "project_info": {
    "project_number": "614740365885",
    "project_id": "whatsapp-saas-d7e5c",
    "storage_bucket": "whatsapp-saas-d7e5c.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:614740365885:android:XXXXX",
        "android_client_info": {
          "package_name": "com.whatsappsaas.mobile"
        }
      },
      "oauth_client": [
        {
          "client_id": "614740365885-XXXXX.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "YOUR_API_KEY"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Erro "DEVELOPER_ERROR"
- Verifica se o SHA-1 está correto no Firebase Console
- Verifica se o package name corresponde

### Erro "SIGN_IN_CANCELLED"
- O utilizador cancelou o login

### Erro "PLAY_SERVICES_NOT_AVAILABLE"
- O dispositivo não tem Google Play Services (emulador sem Google APIs)

## Links Úteis

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [@react-native-google-signin Docs](https://react-native-google-signin.github.io/docs/setting-up/get-config-file)

