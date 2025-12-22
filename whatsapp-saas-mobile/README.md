# WhatsApp SaaS Mobile

Aplicação mobile do WhatsApp SaaS desenvolvida com React Native e Expo.

## 🚀 Tecnologias

- **React Native** - Framework mobile
- **Expo** - Plataforma de desenvolvimento
- **Expo Router** - Navegação baseada em ficheiros
- **NativeWind** - Estilização com Tailwind CSS
- **Zustand** - Gestão de estado
- **TanStack Query** - Cache e fetching de dados

## 📱 Funcionalidades

- ✅ Autenticação (Email/Password)
- ✅ Dashboard com estatísticas
- ✅ Lista de conversas
- ✅ Chat em tempo real
- ✅ Gestão de contactos
- ✅ Importação de contactos do telefone
- ✅ Notificações push
- ✅ Acesso à câmara/galeria
- ✅ Configurações

## 🛠️ Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI
- Android Studio (para desenvolvimento Android)
- Xcode (para desenvolvimento iOS - macOS apenas)

### Setup

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios
```

## 📦 Build

### Desenvolvimento (APK)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login na conta Expo
eas login

# Build de desenvolvimento
eas build --platform android --profile development
```

### Produção

```bash
# Build para Google Play Store
eas build --platform android --profile production

# Build para App Store
eas build --platform ios --profile production
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um ficheiro `.env` na raiz do projeto:

```env
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

### Firebase

1. Aceda à [Firebase Console](https://console.firebase.google.com/)
2. Adicione um projeto Android/iOS
3. Descarregue `google-services.json` (Android) e `GoogleService-Info.plist` (iOS)
4. Configure no `app.json`

## 📂 Estrutura

```
whatsapp-saas-mobile/
├── app/                    # Páginas (Expo Router)
│   ├── (tabs)/            # Navegação por tabs
│   │   ├── dashboard.tsx
│   │   ├── conversations.tsx
│   │   ├── contacts.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx        # Layout raiz
│   ├── index.tsx          # Landing page
│   ├── login.tsx          # Página de login
│   └── chat.tsx           # Página de chat
├── components/            # Componentes reutilizáveis
│   └── ui/               # Componentes UI base
├── hooks/                 # React hooks customizados
├── lib/                   # Configurações e utilitários
│   ├── api-config.ts     # Configuração da API
│   └── auth-store.ts     # Store de autenticação
├── services/              # Serviços (notificações, etc.)
├── types/                 # Tipos TypeScript
└── assets/               # Imagens e recursos
```

## 🔐 Segurança

- Tokens são armazenados de forma segura com AsyncStorage
- Comunicação HTTPS com o backend
- Validação de inputs
- Permissões apenas quando necessário

## 📝 Notas

- Para testar notificações push, é necessário um dispositivo físico
- O login com Google requer configuração adicional do Firebase
- Para builds iOS, é necessária uma conta Apple Developer ($99/ano)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit as alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

