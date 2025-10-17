import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PaperPlaneTiltIcon, ChatDotsIcon, PhoneIcon, CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'

interface WhatsAppMessageProps {
  onMessageSent?: () => void
}

export default function WhatsAppMessage({ onMessageSent }: WhatsAppMessageProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastSentMessage, setLastSentMessage] = useState<{phone: string, message: string, timestamp: Date} | null>(null)

  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      toast.error('Por favor, preencha o número de telefone e a mensagem')
      return
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber)) {
      toast.error('Formato de telefone inválido. Use o formato internacional: +5511999999999')
      return
    }

    setIsSending(true)

    try {
      // Get auth token
      const token = localStorage.getItem('firebase_token') || 'demo-token'
      
      // Get API base URL
      let baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'
      if (baseUrl.startsWith('http://')) {
        baseUrl = baseUrl.replace('http://', 'https://')
      }

      const response = await fetch(`${baseUrl}/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          content: message
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Mensagem enviada com sucesso!', {
          description: `Para ${phoneNumber}`
        })
        
        setLastSentMessage({
          phone: phoneNumber,
          message: message,
          timestamp: new Date()
        })
        
        // Clear form
        setMessage('')
        
        // Notify parent component
        if (onMessageSent) {
          onMessageSent()
        }
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Erro ao enviar mensagem', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatDotsIcon className="h-5 w-5" />
            Enviar Mensagem WhatsApp
          </CardTitle>
          <CardDescription>
            Envie mensagens diretamente para números de telefone via WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Telefone</Label>
            <div className="flex gap-2">
              <PhoneIcon className="h-4 w-4 text-muted-foreground mt-3" />
              <Input
                id="phone"
                placeholder="+5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use o formato internacional com código do país
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem aqui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Pressione Ctrl+Enter para enviar rapidamente
            </p>
          </div>

          <Button 
            onClick={handleSendMessage}
            disabled={isSending || !phoneNumber || !message}
            className="w-full"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <PaperPlaneTiltIcon className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lastSentMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              Última Mensagem Enviada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{lastSentMessage.phone}</span>
                <Badge variant="secondary">
                  {lastSentMessage.timestamp.toLocaleTimeString()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {lastSentMessage.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatDotsIcon className="h-5 w-5" />
            Status da Integração WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">Modo Demo Ativo</span>
            <Badge variant="outline">Desenvolvimento</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure as credenciais do WhatsApp Business API para enviar mensagens reais
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
