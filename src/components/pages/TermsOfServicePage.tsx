import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Termos de Serviço</CardTitle>
            <p className="text-muted-foreground mt-2">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e usar nossa plataforma WhatsApp SaaS, você concorda em cumprir e estar vinculado a estes Termos de Serviço. 
                Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
              <p>
                Nossa plataforma fornece uma solução SaaS (Software as a Service) que permite aos usuários conectar suas contas 
                WhatsApp Business e gerenciar comunicações através da API do WhatsApp Business. O serviço inclui funcionalidades 
                como envio e recebimento de mensagens, gerenciamento de contatos, automação de respostas e análise de dados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Elegibilidade</h2>
              <p className="mb-2">Para usar nosso serviço, você deve:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Ter capacidade legal para celebrar contratos vinculativos</li>
                <li>Ter uma conta WhatsApp Business válida e verificada</li>
                <li>Ter uma conta Meta Business Manager válida</li>
                <li>Fornecer informações precisas e completas durante o registro</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Conta do Usuário</h2>
              <h3 className="text-xl font-semibold mb-2">4.1. Registro</h3>
              <p>
                Você é responsável por manter a confidencialidade das credenciais da sua conta e por todas as atividades 
                que ocorrem sob sua conta. Você concorda em notificar-nos imediatamente sobre qualquer uso não autorizado.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">4.2. Responsabilidades</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Manter a segurança da sua conta e senha</li>
                <li>Notificar-nos imediatamente sobre qualquer violação de segurança</li>
                <li>Ser responsável por todas as atividades que ocorrem sob sua conta</li>
                <li>Garantir que todas as informações fornecidas sejam precisas e atualizadas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Uso Aceitável</h2>
              <p className="mb-2">Você concorda em NÃO usar nosso serviço para:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Enviar spam, mensagens não solicitadas ou conteúdo abusivo</li>
                <li>Violar quaisquer leis, regulamentos ou direitos de terceiros</li>
                <li>Transmitir vírus, malware ou código malicioso</li>
                <li>Tentar acessar não autorizado a qualquer parte do serviço</li>
                <li>Interferir ou interromper o funcionamento do serviço</li>
                <li>Usar o serviço para atividades fraudulentas ou enganosas</li>
                <li>Coletar informações de outros usuários sem consentimento</li>
                <li>Violar os Termos de Serviço do WhatsApp Business ou da Meta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Integração com WhatsApp Business</h2>
              <p className="mb-2">
                Ao usar nosso serviço, você concorda em cumprir:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Os Termos de Serviço do WhatsApp Business</li>
                <li>As Políticas de Negócios do WhatsApp</li>
                <li>Os Termos de Serviço da Meta/Facebook</li>
                <li>Qualquer regulamentação aplicável sobre comunicações comerciais</li>
              </ul>
              <p className="mt-4">
                Você é responsável por obter todas as permissões e aprovações necessárias para usar o WhatsApp Business 
                através de nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo, funcionalidades e tecnologia da plataforma são propriedade nossa ou de nossos licenciadores 
                e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual. 
                Você não pode copiar, modificar, distribuir ou criar trabalhos derivados sem nossa autorização prévia por escrito.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Pagamento e Assinaturas</h2>
              <h3 className="text-xl font-semibold mb-2">8.1. Planos</h3>
              <p>
                Oferecemos diferentes planos de assinatura com funcionalidades e limites variados. 
                Os preços e recursos estão disponíveis em nossa página de preços.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">8.2. Renovação</h3>
              <p>
                As assinaturas são renovadas automaticamente no final de cada período de faturament, 
                a menos que você cancele antes da data de renovação.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">8.3. Reembolsos</h3>
              <p>
                Reembolsos são avaliados caso a caso. Entre em contato conosco para solicitar um reembolso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Disponibilidade do Serviço</h2>
              <p>
                Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. 
                Podemos realizar manutenção programada ou de emergência que pode resultar em interrupções temporárias. 
                Não seremos responsáveis por quaisquer danos resultantes de indisponibilidade do serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Limitação de Responsabilidade</h2>
              <p className="mb-2">
                Na medida máxima permitida por lei:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>O serviço é fornecido "como está" e "conforme disponível"</li>
                <li>Não garantimos que o serviço atenderá aos seus requisitos específicos</li>
                <li>Não seremos responsáveis por danos indiretos, incidentais ou consequenciais</li>
                <li>Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Indenização</h2>
              <p>
                Você concorda em indenizar, defender e isentar nossa empresa, funcionários e parceiros de quaisquer 
                reivindicações, danos, obrigações, perdas, responsabilidades, custos ou dívidas decorrentes do seu uso 
                do serviço ou violação destes termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Rescisão</h2>
              <p className="mb-2">Podemos suspender ou encerrar sua conta e acesso ao serviço imediatamente, sem aviso prévio, se:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Você violar estes Termos de Serviço</li>
                <li>Você violar os Termos de Serviço do WhatsApp Business ou da Meta</li>
                <li>Você usar o serviço de forma fraudulenta ou ilegal</li>
                <li>Você não pagar taxas devidas</li>
                <li>Requisitado por autoridades legais</li>
              </ul>
              <p className="mt-4">
                Você pode cancelar sua conta a qualquer momento através das configurações da conta ou entrando em contato conosco.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos você sobre mudanças 
                significativas por email ou através de um aviso na plataforma. Seu uso continuado do serviço após as 
                modificações constitui sua aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis de [Seu País/Jurisdição], sem considerar conflitos de disposições legais. 
                Qualquer disputa será resolvida nos tribunais competentes de [Sua Cidade/Região].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Disposições Gerais</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Se qualquer disposição destes termos for considerada inválida, as demais disposições permanecerão em vigor</li>
                <li>Estes termos constituem o acordo completo entre você e nós</li>
                <li>Nossa falha em fazer valer qualquer direito não constitui renúncia a esse direito</li>
                <li>Você não pode transferir seus direitos ou obrigações sem nosso consentimento prévio por escrito</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">16. Contato</h2>
              <p className="mb-2">Para questões sobre estes Termos de Serviço, entre em contato:</p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> legal@seu-dominio.com</li>
                <li><strong>Endereço:</strong> [Seu endereço físico, se aplicável]</li>
              </ul>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Ao usar nosso serviço, você reconhece que leu, entendeu e concorda em estar vinculado a estes Termos de Serviço.
              </p>
            </section>
          </CardContent>
        </Card>
        
        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <a href="#/privacy" className="hover:text-foreground underline mr-4">Política de Privacidade</a>
          <a href="#/" className="hover:text-foreground underline">Voltar ao Início</a>
        </div>
      </div>
    </div>
  )
}

