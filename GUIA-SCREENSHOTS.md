# Guia para Capturar Screenshots do Onboarding

Este guia explica onde e como capturar os screenshots necessários para o wizard de onboarding do WhatsApp.

## 📁 Estrutura de Arquivos

Coloque os screenshots na pasta: `public/images/onboarding/`

Os arquivos devem ser nomeados:
- `business-manager-setup.png` - Tela de criação do Business Manager
- `waba-creation.png` - Tela de criação da WhatsApp Business Account
- `phone-verification.png` - Tela de verificação de número de telefone

## 📸 Screenshots Necessários

### 1. Business Manager Setup (`business-manager-setup.png`)

**Onde encontrar:**
1. Acesse: https://business.facebook.com
2. Se não tiver conta, clique em "Criar Conta" ou "Começar"
3. Preencha os dados básicos (nome do negócio, seu nome, email)
4. **Screenshot:** Capture a tela inicial de criação onde o usuário preenche os dados básicos

**O que destacar:**
- Campo "Nome do Negócio" ou "Business Name"
- Campo "Seu Nome" ou "Your Name"
- Campo "Email" ou "Business Email"
- Botão "Próximo" ou "Continue"

**Dica:** Use uma seta ou círculo para destacar onde clicar

---

### 2. WhatsApp Business Account Creation (`waba-creation.png`)

**Onde encontrar:**
1. Após criar o Business Manager, acesse: https://business.facebook.com/settings/whatsapp-accounts
2. Ou vá em: Business Manager → Menu (☰) → Configurações → Contas → WhatsApp
3. Clique no botão "Adicionar" ou "Criar"
4. **Screenshot:** Capture a tela onde aparece o botão "Adicionar" ou o formulário de criação

**O que destacar:**
- Menu lateral com "Configurações" ou "Settings"
- Seção "Contas" ou "Accounts"
- Item "WhatsApp" ou "WhatsApp Accounts"
- Botão "Adicionar" ou "Create WhatsApp Business Account"

**Alternativa:** Se não tiver acesso, use uma imagem genérica mostrando o caminho:
```
Business Manager → Settings → Accounts → WhatsApp → Add
```

---

### 3. Phone Number Verification (`phone-verification.png`)

**Onde encontrar:**
1. Após criar o WABA, você verá uma opção para adicionar número de telefone
2. Clique em "Adicionar Número de Telefone" ou "Add Phone Number"
3. Digite o número de telefone
4. Escolha método de verificação: SMS ou Chamada
5. **Screenshot:** Capture a tela onde o usuário digita o número e escolhe o método de verificação

**O que destacar:**
- Campo para digitar número de telefone
- Opções "SMS" e "Chamada de Voz" ou "Call"
- Botão "Enviar Código" ou "Send Code"

**Alternativa:** Capture a tela onde aparece o código de verificação sendo enviado

---

## 🎨 Dicas para Screenshots

1. **Tamanho recomendado:** 
   - Largura: 800-1200px
   - Altura: Auto (proporcional)

2. **Formatos aceitos:**
   - PNG (recomendado - melhor qualidade)
   - JPG (também funciona)
   - WebP (moderno, melhor compressão)

3. **Ferramentas para editar:**
   - **Windows:** Paint, Snipping Tool, ou PowerToys
   - **Online:** Canva, Photopea, ou Remove.bg
   - **Profissional:** Photoshop, Figma, ou Sketch

4. **Marcações úteis:**
   - Use setas vermelhas para indicar onde clicar
   - Círculos vermelhos para destacar campos
   - Textos de anotação para explicar passos
   - Blur ou esconder informações sensíveis (email, números, etc.)

5. **Boas práticas:**
   - Use modo claro do navegador (evite modo escuro para screenshots)
   - Capture toda a tela relevante, não apenas o botão
   - Mantenha consistência visual entre todos os screenshots
   - Adicione legendas ou números se necessário

---

## 🔄 Atualizar Imagens no Código

As imagens já estão configuradas no componente. Se você renomear os arquivos, atualize:

```typescript
// src/components/pages/WhatsAppIntegrationPage.tsx
{
  id: 'business_manager',
  image: '/images/onboarding/business-manager-setup.png', // ← Atualize aqui
  imageAlt: 'Tela de criação do Meta Business Manager',
}
```

---

## 📝 Exemplo de Como Editar um Screenshot

1. Capture o screenshot com Snipping Tool (Windows) ou Cmd+Shift+4 (Mac)
2. Abra em um editor de imagens
3. Adicione setas/círculos para destacar elementos
4. Adicione texto explicativo se necessário
5. Redimensione se necessário (800-1200px de largura)
6. Salve como PNG na pasta `public/images/onboarding/`

---

## 🆘 Se Não Conseguir Tirar os Screenshots

Se você não tiver acesso ao Meta Business Manager ou não conseguir capturar os screenshots:

1. **Usar imagens genéricas:** Crie imagens de placeholder mostrando o caminho textual
2. **Usar ícones:** Substitua por ícones explicativos (Material Icons, Phosphor, etc.)
3. **Usar tutoriais externos:** Link para tutoriais do Meta com screenshots oficiais
4. **Criar mockups:** Use Figma ou similar para criar mockups das telas

**Placeholder simples:**
```html
<div class="placeholder-image">
  <p>📸 Screenshot a ser adicionado</p>
  <p>Business Manager → Settings → Accounts → WhatsApp</p>
</div>
```

---

## ✅ Checklist

- [ ] Screenshot 1: Business Manager Setup capturado
- [ ] Screenshot 2: WABA Creation capturado
- [ ] Screenshot 3: Phone Verification capturado
- [ ] Imagens editadas e destacadas
- [ ] Imagens salvas em `public/images/onboarding/`
- [ ] Imagens com nomes corretos
- [ ] Testado no frontend se as imagens aparecem

---

**Nota:** O código já está preparado para exibir as imagens. Se as imagens não existirem, elas serão ocultadas automaticamente sem quebrar a interface.

