import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Robot } from '@phosphor-icons/react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/settings/ai-enabled`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAiEnabled(data.ai_enabled ?? true)
      } else {
        // Default to enabled if endpoint fails
        setAiEnabled(true)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setAiEnabled(true) // Default to enabled
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAI = async (enabled: boolean) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/settings/ai-enabled`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        setAiEnabled(enabled)
        toast.success(enabled ? 'Respostas por IA ativadas' : 'Respostas por IA desativadas')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao atualizar configuração')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerir as configurações da sua conta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Robot size={20} />
            Respostas Automáticas por IA
          </CardTitle>
          <CardDescription>
            Quando desativado, apenas FAQs e catálogo respondem automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled" className="text-base">
                Ativar respostas por Inteligência Artificial
              </Label>
              <p className="text-sm text-muted-foreground">
                A IA responde quando nenhuma FAQ corresponde à mensagem do cliente
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={saving}
            />
          </div>
          {aiEnabled && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ℹ️ As respostas por IA estão ativas. Quando um cliente escrever algo que não tenha FAQ correspondente, 
                a IA gerará uma resposta inteligente baseada no contexto do seu negócio.
              </p>
            </div>
          )}
          {!aiEnabled && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ As respostas por IA estão desativadas. Apenas FAQs e catálogo responderão automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

