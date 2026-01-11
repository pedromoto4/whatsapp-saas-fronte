# 📝 Atualizar Dados Legais nas Páginas

As páginas de **Política de Privacidade** e **Termos de Serviço** foram criadas, mas você precisa atualizar alguns dados específicos da sua empresa.

## 🔍 O que atualizar:

### 1. Emails de Contato

**Arquivo:** `src/components/pages/PrivacyPolicyPage.tsx`
- Linha ~180: `privacy@seu-dominio.com` → Substitua pelo seu email real

**Arquivo:** `src/components/pages/TermsOfServicePage.tsx`
- Linha ~180: `legal@seu-dominio.com` → Substitua pelo seu email real

### 2. Endereço Físico (se aplicável)

**Arquivo:** `src/components/pages/PrivacyPolicyPage.tsx`
- Linha ~182: `[Seu endereço físico, se aplicável]` → Adicione seu endereço ou remova se não tiver

**Arquivo:** `src/components/pages/TermsOfServicePage.tsx`
- Linha ~182: `[Seu endereço físico, se aplicável]` → Adicione seu endereço ou remova se não tiver

### 3. Jurisdição Legal

**Arquivo:** `src/components/pages/TermsOfServicePage.tsx`
- Linha ~165: `[Seu País/Jurisdição]` → Ex: "Portugal" ou "União Europeia"
- Linha ~165: `[Sua Cidade/Região]` → Ex: "Lisboa" ou "Portugal"

## 📍 URLs das Páginas

Após fazer deploy, as URLs serão:

- **Política de Privacidade:** 
  - Produção: `https://seu-dominio.com/#/privacy`
  - Ou: `https://seu-dominio.com/privacy` (se configurar rotas sem hash)

- **Termos de Serviço:**
  - Produção: `https://seu-dominio.com/#/terms`
  - Ou: `https://seu-dominio.com/terms` (se configurar rotas sem hash)

## ✅ Checklist

- [ ] Atualizar email de privacidade
- [ ] Atualizar email legal
- [ ] Adicionar/remover endereço físico
- [ ] Atualizar jurisdição legal
- [ ] Testar as páginas localmente
- [ ] Fazer deploy
- [ ] Testar URLs em produção
- [ ] Adicionar URLs na Meta App Review

## 🚀 Como testar localmente

1. Inicie o servidor de desenvolvimento
2. Acesse: `http://localhost:5173/#/privacy`
3. Acesse: `http://localhost:5173/#/terms`
4. Verifique se tudo está correto

## 📋 Para Meta App Review

Quando for preencher o formulário da Meta, use:

- **Privacy Policy URL:** `https://seu-dominio.com/#/privacy`
- **Terms of Service URL:** `https://seu-dominio.com/#/terms`

---

**Nota:** As páginas já estão funcionais e acessíveis publicamente. Apenas atualize os dados específicos da sua empresa antes de fazer deploy em produção.

