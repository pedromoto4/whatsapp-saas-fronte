import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  WarningCircle,
  ArrowRight,
  Trash,
  Link as LinkIcon
} from '@phosphor-icons/react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

interface Integration {
  id: number
  user_id: number
  wa_phone_number_id: string
  wa_business_account_id: string | null
  is_active: boolean
  last_verified_at: string | null
  created_at: string
  updated_at: string | null
}

export default function WhatsAppIntegrationPage() {
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const fetchIntegration = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Não autenticado')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/integrations/whatsapp`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 404) {
        setIntegration(null)
        return
      }

      if (!response.ok) {
        throw new Error('Falha ao buscar integração')
      }

      const data = await response.json()
      setIntegration(data)
    } catch (error: any) {
      if (error.message !== 'Falha ao buscar integração') {
        console.error('Error fetching integration:', error)
      }
      setIntegration(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegration()
  }, [])

  const handleConnect = async () => {
    try {
      setConnecting(true)
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Não autenticado')
        return
      }

      // Get OAuth authorization URL
      const response = await fetch(`${API_BASE_URL}/api/integrations/oauth/authorize`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Falha ao iniciar conexão OAuth')
      }

      const data = await response.json()
      const { auth_url } = data

      // Redirect to Meta OAuth
      window.location.href = auth_url
    } catch (error: any) {
      console.error('Error connecting:', error)
      toast.error(error.message || 'Erro ao conectar WhatsApp')
      setConnecting(false)
    }
  }

  const handleCompleteOAuth = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      if (!code) {
        return
      }

      setConnecting(true)
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Não autenticado')
        return
      }

      // Complete OAuth flow
      const response = await fetch(`${API_BASE_URL}/api/integrations/oauth/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Falha ao completar conexão')
      }

      const data = await response.json()
      setIntegration(data)
      toast.success('WhatsApp conectado com sucesso!')
      
      // Remove code from URL
      window.history.replaceState({}, '', window.location.pathname)
      setConnecting(false)
    } catch (error: any) {
      console.error('Error completing OAuth:', error)
      toast.error(error.message || 'Erro ao completar conexão')
      setConnecting(false)
    }
  }

  useEffect(() => {
    // Check if we're returning from OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('integration_error')

    if (error) {
      toast.error('Erro na autorização OAuth')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (code) {
      handleCompleteOAuth()
    }
  }, [])

  const handleTest = async () => {
    try {
      setTesting(true)
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Não autenticado')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/integrations/whatsapp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Falha ao testar integração')
      }

      const data = await response.json()
      toast.success('Integração funcionando corretamente!')
    } catch (error: any) {
      console.error('Error testing:', error)
      toast.error(error.message || 'Erro ao testar integração')
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp? Isso impedirá o envio de mensagens.')) {
      return
    }

    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Não autenticado')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/integrations/whatsapp`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Falha ao desconectar')
      }

      setIntegration(null)
      toast.success('WhatsApp desconectado com sucesso')
    } catch (error: any) {
      console.error('Error disconnecting:', error)
      toast.error(error.message || 'Erro ao desconectar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integração WhatsApp</h1>
        <p className="text-gray-600 mt-2">
          Conecte sua conta WhatsApp Business para começar a enviar e receber mensagens
        </p>
      </div>

      {!integration ? (
        <Card>
          <CardHeader>
            <CardTitle>Conectar WhatsApp</CardTitle>
            <CardDescription>
              Conecte sua conta WhatsApp Business através do OAuth da Meta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Clique em "Conectar WhatsApp"</li>
                <li>Autorize a aplicação na Meta</li>
                <li>Sua conta WhatsApp Business será conectada automaticamente</li>
              </ol>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2" size={20} />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  WhatsApp Conectado
                  {integration.is_active ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle size={16} className="mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle size={16} className="mr-1" />
                      Inativo
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  Sua integração WhatsApp está configurada e funcionando
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Phone Number ID</label>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1">
                  {integration.wa_phone_number_id}
                </p>
              </div>
              {integration.wa_business_account_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Account ID</label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1">
                    {integration.wa_business_account_id}
                  </p>
                </div>
              )}
            </div>

            {integration.last_verified_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Última Verificação</label>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(integration.last_verified_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleTest}
                disabled={testing}
                variant="outline"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Testando...
                  </>
                ) : (
                  'Testar Conexão'
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
              >
                <Trash size={16} className="mr-2" />
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

