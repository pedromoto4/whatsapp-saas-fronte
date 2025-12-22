# Funcionalidades Faltantes - Mobile vs Web

Este documento lista todas as funcionalidades implementadas na aplicação web que ainda **não estão** implementadas na aplicação mobile.

---

## ✅ Funcionalidades Já Implementadas no Mobile

- ✅ **Autenticação**
  - Login com email/password
  - Login com Google (Firebase Auth nativo)
  - Logout
  - Persistência de sessão

- ✅ **Dashboard**
  - Estatísticas básicas (mensagens não lidas, contactos ativos, agendamentos hoje)
  - Ações rápidas
  - Atividade recente (placeholder)

- ✅ **Conversas**
  - Lista de conversas
  - Filtros (não lidas, arquivadas)
  - Busca de conversas
  - Visualização de mensagens
  - Envio de mensagens de texto
  - Envio de imagens (câmera/galeria)
  - Marcar como lida
  - Arquivar/desarquivar conversas
  - Auto-refresh

- ✅ **Contactos**
  - Lista de contactos
  - Busca de contactos
  - Adicionar novo contacto
  - Editar contacto
  - Eliminar contacto
  - Sincronização com contactos do dispositivo (expo-contacts)

- ✅ **Configurações**
  - Estrutura básica (notificações ainda não totalmente funcionais)

---

## ❌ Funcionalidades Faltantes no Mobile

### 1. **Gestão de FAQs** ❌
**Web:** `FAQManagement.tsx`
- ✅ Listar FAQs
- ✅ Criar FAQ
- ✅ Editar FAQ
- ✅ Eliminar FAQ
- ✅ Pesquisar FAQs
- ✅ Gestão de keywords para automação

**Mobile:** Não implementado

---

### 2. **Gestão de Catálogo de Produtos** ❌
**Web:** `CatalogManagement.tsx`
- ✅ Listar produtos
- ✅ Criar produto (nome, preço, imagem, descrição)
- ✅ Editar produto
- ✅ Eliminar produto
- ✅ Upload de imagens de produtos
- ✅ Envio de produtos nas conversas (via ChatWindow)

**Mobile:** Não implementado

**Nota:** O chat mobile já suporta envio de imagens, mas não tem a funcionalidade de enviar produtos do catálogo.

---

### 3. **Gestão de Agendamentos** ❌
**Web:** `AppointmentsPage.tsx`
- ✅ Visualização em calendário
- ✅ Visualização em lista
- ✅ Criar agendamento
- ✅ Editar agendamento
- ✅ Cancelar agendamento
- ✅ Filtrar por status (pending, confirmed, cancelled, completed)
- ✅ Filtrar por contacto
- ✅ Filtrar por tipo de serviço
- ✅ Gestão de tipos de serviço
- ✅ Notas nos agendamentos

**Mobile:** Não implementado

**Nota:** O dashboard mobile mostra "Agendamentos Hoje" mas não há página dedicada.

---

### 4. **Gestão de Disponibilidade** ❌
**Web:** `AvailabilityManagement.tsx`
- ✅ Configurar disponibilidade recorrente (por dia da semana)
- ✅ Configurar exceções (datas específicas bloqueadas/desbloqueadas)
- ✅ Configurar slots de tempo personalizados
- ✅ Ativar/desativar disponibilidade
- ✅ Configurar duração de slots

**Mobile:** Não implementado

---

### 5. **Logs de Mensagens** ❌
**Web:** `MessageLogsPage.tsx`
- ✅ Visualizar todos os logs de mensagens
- ✅ Estatísticas (total, entrantes, saídas, taxa de automação)
- ✅ Filtrar por direção (in/out)
- ✅ Filtrar por tipo (text, template, media)
- ✅ Visualizar custo estimado por mensagem
- ✅ Visualizar timestamps detalhados

**Mobile:** Não implementado

---

### 6. **Informações do Contacto (no Chat)** ❌
**Web:** `ContactInfo.tsx` (painel lateral no chat)
- ✅ Visualizar informações do contacto
- ✅ Editar nome do contacto
- ✅ Adicionar/editar notas
- ✅ Visualizar foto de perfil do WhatsApp
- ✅ Ativar/desativar IA para contacto específico
- ✅ Override de configuração global de IA
- ✅ Visualizar tags do contacto
- ✅ Visualizar nome verificado do WhatsApp

**Mobile:** Não implementado

**Nota:** O mobile tem a página de contactos, mas não tem o painel lateral de informações durante o chat.

---

### 7. **Funcionalidades Avançadas do Chat** ⚠️
**Web:** `ChatWindow.tsx`
- ✅ Envio de produtos do catálogo
- ✅ Upload de ficheiros (PDF, documentos, vídeos, áudio)
- ✅ Preview de imagens antes de enviar
- ✅ Preview de ficheiros antes de enviar
- ✅ Visualização de status de mensagens (sent, delivered, read)
- ✅ Indicadores de mensagens automatizadas (bot)
- ✅ Visualização de templates enviados
- ✅ Scroll automático para novas mensagens
- ✅ Refresh manual de mensagens

**Mobile:** Parcialmente implementado
- ✅ Envio de imagens (câmera/galeria)
- ❌ Envio de produtos do catálogo
- ❌ Upload de ficheiros (PDF, documentos, vídeos, áudio)
- ❌ Preview de ficheiros antes de enviar
- ⚠️ Status de mensagens (pode estar implementado, verificar)
- ⚠️ Indicadores de automação (verificar)

---

### 8. **Teste de API** ❌
**Web:** Seção "API Test" no Dashboard
- ✅ Testar todos os endpoints da API
- ✅ Ver resultados de cada teste (pending, success, error)
- ✅ Testar endpoints individuais
- ✅ Feedback visual de status

**Mobile:** Não implementado

---

### 9. **Templates de Mensagens** ❌
**Web:** `TemplateManagement.tsx` (comentado/stand-by)
- ⚠️ Gestão de templates (atualmente em stand-by na web também)

**Mobile:** Não implementado

**Nota:** Esta funcionalidade está em stand-by na web também.

---

### 10. **Funcionalidades do Dashboard Web** ⚠️
**Web:** `DashboardPage.tsx`
- ✅ Seção Overview (estatísticas detalhadas)
- ✅ Seção Catalog (gestão de produtos)
- ✅ Seção FAQs (gestão de FAQs)
- ✅ Seção Contacts (gestão de contactos)
- ✅ Seção Conversations (lista de conversas)
- ✅ Seção Appointments (gestão de agendamentos)
- ✅ Seção Availability (gestão de disponibilidade)
- ✅ Seção Settings (configurações)
- ✅ Seção API Test (teste de endpoints)
- ✅ Navegação entre seções no mesmo dashboard
- ✅ Atualização de título da página com contador de não lidas

**Mobile:** Implementação simplificada
- ✅ Dashboard básico com estatísticas
- ❌ Navegação integrada entre todas as seções
- ❌ Atualização de badge de notificações no título

---

### 11. **Notificações Push** ⚠️
**Web:** Não aplicável (web não tem notificações push nativas)
**Mobile:** Estrutura criada mas não totalmente funcional
- ⚠️ Configuração de notificações (parcialmente implementado)
- ⚠️ Receção de notificações push (verificar se está funcional)

---

### 12. **Sincronização de Contactos** ⚠️
**Web:** Não aplicável (web não tem acesso aos contactos do dispositivo)
**Mobile:** Parcialmente implementado
- ✅ Permissão para aceder contactos
- ⚠️ Sincronização automática (verificar se está implementado)

---

## 📊 Resumo por Prioridade

### 🔴 Alta Prioridade (Funcionalidades Core)
1. **Gestão de Agendamentos** - Essencial para o negócio
2. **Gestão de FAQs** - Essencial para automação
3. **Informações do Contacto no Chat** - Melhora UX significativamente
4. **Upload de Ficheiros no Chat** - Funcionalidade importante

### 🟡 Média Prioridade (Melhorias)
5. **Gestão de Catálogo** - Importante para vendas
6. **Gestão de Disponibilidade** - Importante para agendamentos
7. **Logs de Mensagens** - Útil para análise
8. **Envio de Produtos no Chat** - Melhora vendas

### 🟢 Baixa Prioridade (Nice to Have)
9. **Teste de API** - Útil para desenvolvimento/debug
10. **Templates de Mensagens** - Em stand-by na web também

---

## 📋 Checklist de Progresso - Tarefas para Implementar

### 🔴 Alta Prioridade (Funcionalidades Core)

#### 1. Gestão de Agendamentos
- [ ] Criar página `app/(tabs)/appointments.tsx`
- [ ] Adicionar rota de agendamentos no tab navigation
- [ ] Implementar visualização em calendário (usar `react-native-calendars` ou similar)
- [ ] Implementar visualização em lista
- [ ] Implementar criar agendamento (modal/form)
- [ ] Implementar editar agendamento
- [ ] Implementar cancelar agendamento
- [ ] Implementar filtros (status, contacto, tipo de serviço)
- [ ] Implementar gestão de tipos de serviço
- [ ] Integrar com API `/api/appointments/`
- [ ] Adicionar link no dashboard para agendamentos

#### 2. Gestão de FAQs
- [ ] Criar página `app/(tabs)/faqs.tsx`
- [ ] Adicionar rota de FAQs no tab navigation
- [ ] Implementar lista de FAQs
- [ ] Implementar criar FAQ (modal/form)
- [ ] Implementar editar FAQ
- [ ] Implementar eliminar FAQ
- [ ] Implementar pesquisa de FAQs
- [ ] Implementar gestão de keywords
- [ ] Integrar com API `/api/faqs/`
- [ ] Adicionar link no dashboard para FAQs

#### 3. Informações do Contacto no Chat
- [ ] Criar componente `components/ContactInfo.tsx`
- [ ] Implementar modal/painel de informações do contacto
- [ ] Implementar visualização de informações (nome, foto, tags)
- [ ] Implementar editar nome do contacto
- [ ] Implementar adicionar/editar notas
- [ ] Implementar ativar/desativar IA para contacto
- [ ] Integrar com API `/api/conversations/{phone}/info`
- [ ] Adicionar botão no chat para abrir informações do contacto

#### 4. Upload de Ficheiros no Chat
- [ ] Adicionar suporte para selecionar ficheiros (expo-document-picker)
- [ ] Implementar upload de PDF
- [ ] Implementar upload de documentos (doc, docx, txt)
- [ ] Implementar upload de vídeos
- [ ] Implementar upload de áudio
- [ ] Implementar preview de ficheiros antes de enviar
- [ ] Implementar validação de tamanho (16MB limite)
- [ ] Integrar upload com API (backend já suporta media_url)
- [ ] Atualizar componente `app/chat.tsx` com novo seletor de ficheiros

### 🟡 Média Prioridade (Melhorias)

#### 5. Gestão de Catálogo de Produtos
- [ ] Criar página `app/(tabs)/catalog.tsx`
- [ ] Adicionar rota de catálogo no tab navigation
- [ ] Implementar lista de produtos (grid/lista)
- [ ] Implementar criar produto (modal/form)
- [ ] Implementar editar produto
- [ ] Implementar eliminar produto
- [ ] Implementar upload de imagens de produtos
- [ ] Integrar com API `/api/catalog/`
- [ ] Adicionar link no dashboard para catálogo

#### 6. Envio de Produtos no Chat
- [ ] Criar componente de seleção de produtos no chat
- [ ] Implementar visualização de produtos disponíveis
- [ ] Implementar envio de produto (com imagem, nome, preço, descrição)
- [ ] Integrar com catálogo de produtos
- [ ] Atualizar componente `app/chat.tsx` com opção de enviar produto

#### 7. Gestão de Disponibilidade
- [ ] Criar página `app/(tabs)/availability.tsx` ou adicionar em settings
- [ ] Implementar configuração de disponibilidade recorrente (por dia da semana)
- [ ] Implementar configuração de exceções (datas específicas)
- [ ] Implementar configuração de slots personalizados
- [ ] Implementar ativar/desativar disponibilidade
- [ ] Integrar com API de disponibilidade

#### 8. Logs de Mensagens
- [ ] Criar página `app/(tabs)/logs.tsx` ou adicionar em settings
- [ ] Implementar lista de logs de mensagens
- [ ] Implementar estatísticas (total, entrantes, saídas, automação)
- [ ] Implementar filtros (direção, tipo)
- [ ] Implementar visualização de custo estimado
- [ ] Integrar com API de logs

### 🟢 Baixa Prioridade (Nice to Have)

#### 9. Teste de API
- [ ] Criar página `app/(tabs)/api-test.tsx` ou adicionar em settings (debug mode)
- [ ] Implementar teste de todos os endpoints
- [ ] Implementar visualização de resultados (success/error)
- [ ] Implementar teste de endpoints individuais
- [ ] Adicionar feedback visual de status

#### 10. Templates de Mensagens
- [ ] **Nota:** Aguardar implementação na web primeiro (está em stand-by)

### ⚠️ Funcionalidades Parciais para Completar

#### Chat Avançado
- [ ] Verificar e implementar status de mensagens (sent, delivered, read)
- [ ] Verificar e implementar indicadores de mensagens automatizadas
- [ ] Implementar visualização de templates enviados (quando disponível)

#### Dashboard
- [ ] Adicionar navegação integrada entre todas as seções
- [ ] Implementar atualização de badge de notificações

#### Notificações Push
- [ ] Completar configuração de notificações
- [ ] Testar receção de notificações push
- [ ] Implementar deep linking a partir de notificações

#### Sincronização de Contactos
- [ ] Verificar se sincronização automática está implementada
- [ ] Implementar sincronização bidirecional se necessário

---

## 📝 Notas Adicionais

- O mobile já tem uma base sólida com as funcionalidades principais (conversas, contactos, dashboard).
- As funcionalidades faltantes são principalmente de gestão e configuração.
- Algumas funcionalidades da web podem precisar de adaptação para mobile (ex: calendário de agendamentos).
- A estrutura de navegação do mobile (tabs) é diferente da web (dashboard com seções), o que pode afetar a implementação de algumas funcionalidades.

