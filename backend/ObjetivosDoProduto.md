🎯 Objetivo do Produto (versão clara)

Um SaaS que:

liga o WhatsApp Business do cliente,

responde automaticamente a FAQs e a pedidos de catálogo,

permite envios pró-ativos (templates),

dá relatórios simples (uso/custos),

cobra subscrição (Stripe).

🔁 Fluxos principais (UX)

Onboarding

Criar conta → ligar WhatsApp (Cloud API) → colar token de dev (MVP) → teste de envio → pronto.

(v1.1) Onboarding “real”: WABA própria + token estável (System User).

Automação

Mensagem recebida → webhook → match FAQ/keywords → responder (texto/template).

“lista/preços/catálogo” → enviar lista compacta ou um template.

Gestão de Conteúdo

FAQs (pergunta/keywords, resposta).

Catálogo (nome, preço, imagem opcional).

Campanhas (mais tarde)

Envio pró-ativo via template aprovado.

Relatórios

Mensagens in/out, % coberta por automação, custo estimado.

Faturação

Stripe Subscriptions: Basic/Pro.

Limites por plano (mensagens/mês, nº de FAQs/itens de catálogo).

🧩 Módulos & Requisitos Funcionais
A) Integração WhatsApp (Cloud API)

Guardar WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN (por workspace/cliente).

Webhook recebe messages e status.

Envio: text, (v1) template, (v1.1) media.

Critérios de aceitação:

Receber msg e responder em <2s se houver match.

Rejeitar envio normal fora da janela 24h → forçar template.

B) FAQs (auto-resposta)

CRUD FAQ (question, answer, keywords).

Matching por keywords (simples) + normalização (lowercase, sem acentos).

(v1.1) Prioridade/peso por FAQ; fallback.

Tabelas

faqs(id, user_id, question, answer, keywords_csv, created_at)

Endpoints

POST /faq | GET /faq | DELETE /faq/{id}

C) Catálogo

CRUD item (name, price, image_url).

Comando “lista/preços/catálogo” → enviar lista curta (até 5 itens + link “ver mais”).

Tabelas

catalog(id, user_id, name, price, image_url, created_at)

Endpoints

POST /catalog | GET /catalog | DELETE /catalog/{id}

D) Resposta Automática (motor)

Pipeline no webhook:

Normalizar texto.

Detector de intenção simples: “horário”, “localização”, “lista/preço”, “info” (keywords).

Tentar FAQ; se não, tentar catálogo; se nada, fallback.

Janela 24h: se timestamp_last_user_message > now-24h, podes texto normal; caso contrário, exige template.

E) Templates (pró-ativo + fora de 24h)

(v1) CRUD “lógico” no teu painel (espelho do que está aprovado no WhatsApp Manager).

Guardar template_name, language, placeholders.

Enviar com type:"template".

Tabelas

wa_templates(id, user_id, name, language, status, category, created_at)

Endpoints

POST /wa/template/send (payload: name, params, to[])

F) Relatórios

message_logs: registar todas as mensagens (in/out, tipo, user_id, custo_estimado, created_at).

Painel mostra: totais por dia, % auto-respostas, ranking de FAQs, custo estimado.

Tabelas

message_logs(id, user_id, direction, kind, to_from, template_name, cost_estimate, created_at)

Endpoints

GET /reports/summary?from=&to=

G) Billing (Stripe)

Planos Basic e Pro.

Limites por plano (ex.: Basic até 1.000 msgs/mês, 20 FAQs, 50 itens catálogo).

Middleware verifica limites antes de enviar resposta.

🧱 Especificação Técnica (resumo prático)
Webhook (FastAPI)

GET /wa/webhook → verificação (já feito)

POST /wa/webhook → recebe eventos

Parse messages e statuses

Chama automation_engine.handle(message)

Envio

POST /wa/send → texto (já tens)

POST /wa/template/send → template (v1)

Contracts (exemplo)

POST /wa/template/send
{
  "to": ["3519XXXXXX", "3519YYYYYY"],
  "template": { "name": "promo_outubro", "language": "pt" },
  "params": ["-15%", "sexta-feira"] 
}

Engine de automação (pseudo)
def handle_incoming(user_id, from_wa, text):
    intent = detect_intent(text)        # “faq”, “catalog”, “unknown”
    if intent == "catalog": return build_catalog_reply(user_id)
    faq = match_faq(user_id, text)
    return faq.answer if faq else FALLBACK

Limites por plano (middleware)
def check_quota(user_id, feature):
    # lê do plano e do usage mensal em message_logs
    # se excedido → responde com aviso e não envia

🗂️ Atualização de Base de Dados (DDL rápida)
-- Já tens faqs e catalog; adicionar:
CREATE TABLE message_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('in','out')) NOT NULL,
  kind TEXT CHECK (kind IN ('text','template','media')) NOT NULL,
  to_from TEXT NOT NULL,
  template_name TEXT,
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE wa_templates (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'pt',
  category TEXT,        -- marketing/utility/auth
  status TEXT,          -- approved/rejected/pending
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  wa_phone_number_id TEXT,
  wa_access_token TEXT,            -- guarda encriptado/secret manager
  last_verified_at TIMESTAMP
);

🛣️ Roadmap (entregas curtas com critérios de “done”)
✅ MVP (1–2 semanas)

 Webhook a responder a FAQs e Catálogo (texto)

 /dashboard/faqs e /dashboard/catalogo operacionais

 message_logs a registar in/out
Done: mensagem recebida → resposta automática em <2s; logs OK.

🔷 v1 (2–4 semanas)

 Envio de template (fora de 24h)

 Página Relatórios (totais/dia, % auto, top FAQs)

 Limites por plano (hard-stop + aviso)
Done: template aprovado a enviar; gráficos no painel; limites funcionam.

🟣 v1.1 (4–6 semanas)

 Stripe Subscriptions (Basic/Pro)

 Token System User estável + rotação

 Suporte a media (imagens do catálogo)
Done: checkout Stripe a ativar conta; tokens estáveis; envio de imagem ok.