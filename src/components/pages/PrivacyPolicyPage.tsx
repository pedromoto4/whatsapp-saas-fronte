import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Política de Privacidade</CardTitle>
            <p className="text-muted-foreground mt-2">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
              <p>
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você usa nossa plataforma WhatsApp SaaS. 
                Estamos comprometidos em proteger sua privacidade e garantir a segurança dos seus dados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
              <h3 className="text-xl font-semibold mb-2">2.1. Informações de Autenticação</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Dados do Firebase Authentication (nome, email, ID único)</li>
                <li>Dados do Facebook/Meta quando você conecta sua conta WhatsApp Business</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2. Informações do WhatsApp Business</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Token de acesso da API do WhatsApp Business</li>
                <li>ID do número de telefone WhatsApp Business</li>
                <li>ID da conta WhatsApp Business (WABA)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.3. Dados de Uso</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Mensagens enviadas e recebidas através da plataforma</li>
                <li>Logs de mensagens para fins de auditoria e suporte</li>
                <li>Estatísticas de uso (número de mensagens, contatos, etc.)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.4. Informações Técnicas</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Endereço IP</li>
                <li>Tipo de navegador e dispositivo</li>
                <li>Data e hora de acesso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
              <p className="mb-2">Utilizamos suas informações para:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Fornecer o serviço:</strong> Conectar sua conta WhatsApp Business e permitir o envio/recebimento de mensagens</li>
                <li><strong>Autenticação:</strong> Verificar sua identidade e manter sua sessão ativa</li>
                <li><strong>Melhorar o serviço:</strong> Analisar padrões de uso para melhorar funcionalidades</li>
                <li><strong>Suporte ao cliente:</strong> Responder a suas solicitações e resolver problemas técnicos</li>
                <li><strong>Segurança:</strong> Detectar e prevenir fraudes, abusos e atividades suspeitas</li>
                <li><strong>Conformidade legal:</strong> Cumprir obrigações legais e regulamentares</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Dados</h2>
              <p className="mb-2">Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Meta/Facebook:</strong> Compartilhamos dados necessários para o funcionamento da API do WhatsApp Business, conforme os termos de serviço da Meta</li>
                <li><strong>Prestadores de serviços:</strong> Podemos compartilhar dados com provedores de serviços confiáveis que nos ajudam a operar a plataforma (hospedagem, análise, etc.), sempre sob acordos de confidencialidade</li>
                <li><strong>Obrigações legais:</strong> Quando exigido por lei, ordem judicial ou processo legal</li>
                <li><strong>Com seu consentimento:</strong> Quando você autorizar explicitamente o compartilhamento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
              <p className="mb-2">Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                <li>Criptografia de dados sensíveis em repouso</li>
                <li>Acesso restrito a dados pessoais apenas para funcionários autorizados</li>
                <li>Monitoramento regular de segurança e auditorias</li>
                <li>Backups regulares e planos de recuperação de desastres</li>
              </ul>
              <p className="mt-4">
                No entanto, nenhum método de transmissão ou armazenamento é 100% seguro. 
                Embora nos esforcemos para proteger seus dados, não podemos garantir segurança absoluta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Retenção de Dados</h2>
              <p>
                Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta política, 
                a menos que um período de retenção mais longo seja exigido ou permitido por lei. 
                Quando você excluir sua conta, excluiremos ou anonimizaremos seus dados pessoais, 
                exceto quando a retenção for necessária para fins legais ou de segurança.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Seus Direitos</h2>
              <p className="mb-2">Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Acesso:</strong> Solicitar uma cópia dos dados pessoais que mantemos sobre você</li>
                <li><strong>Retificação:</strong> Corrigir dados incorretos ou incompletos</li>
                <li><strong>Exclusão:</strong> Solicitar a exclusão dos seus dados pessoais</li>
                <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado e legível por máquina</li>
                <li><strong>Oposição:</strong> Opor-se ao processamento dos seus dados em certas circunstâncias</li>
                <li><strong>Restrição:</strong> Solicitar a limitação do processamento dos seus dados</li>
              </ul>
              <p className="mt-4">
                Para exercer esses direitos, entre em contato conosco através do email: <strong>privacy@seu-dominio.com</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies e Tecnologias Similares</h2>
              <p>
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma 
                e personalizar conteúdo. Você pode gerenciar suas preferências de cookies através das configurações do navegador.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Menores de Idade</h2>
              <p>
                Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente informações pessoais 
                de menores. Se tomarmos conhecimento de que coletamos dados de um menor, tomaremos medidas para excluir 
                essas informações imediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Alterações nesta Política</h2>
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas 
                publicando a nova política nesta página e atualizando a data de "Última atualização". 
                Recomendamos que revise esta política regularmente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contato</h2>
              <p className="mb-2">Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade, entre em contato:</p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> privacy@seu-dominio.com</li>
                <li><strong>Endereço:</strong> [Seu endereço físico, se aplicável]</li>
              </ul>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Esta política está em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) da UE 
                e outras leis de proteção de dados aplicáveis.
              </p>
            </section>
          </CardContent>
        </Card>
        
        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <a href="#/terms" className="hover:text-foreground underline mr-4">Termos de Serviço</a>
          <a href="#/" className="hover:text-foreground underline">Voltar ao Início</a>
        </div>
      </div>
    </div>
  )
}

