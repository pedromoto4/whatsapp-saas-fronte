import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ChartBar } from '@phosphor-icons/react'

interface MessageLog {
  id: number
  owner_id: number
  direction: string
  kind: string
  to_from: string
  content: string | null
  template_name: string | null
  cost_estimate: string
  created_at: string
}

interface Stats {
  total: number
  incoming: number
  outgoing: number
  automation_rate: number
}

export default function MessageLogsPage() {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Backend API URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  // Get auth token
  const getAuthToken = async () => {
    const token = localStorage.getItem('firebase_token')
    if (!token) {
      toast.error('Token de autenticação não encontrado.')
      return null
    }
    return token
  }

  // Load logs and stats
  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      if (!token) return

      // Load logs
      const logsResponse = await fetch(`${API_BASE_URL}/api/message-logs/?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData)
      }

      // Load stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/message-logs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

    } catch (error) {
      toast.error('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Histórico de Mensagens</h2>
        <p className="text-muted-foreground">
          Acompanhe todas as mensagens enviadas e recebidas
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ChartBar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Mensagens totais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
              <ArrowDown className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.incoming}</div>
              <p className="text-xs text-muted-foreground">
                Mensagens de clientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <ArrowUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outgoing}</div>
              <p className="text-xs text-muted-foreground">
                Respostas enviadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Automação</CardTitle>
              <ChartBar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.automation_rate}%</div>
              <p className="text-xs text-muted-foreground">
                Mensagens automáticas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas 50 Mensagens</CardTitle>
          <CardDescription>
            Histórico de conversas com seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem registrada ainda
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.direction === 'in' 
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                      : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {log.direction === 'in' ? (
                          <ArrowDown className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        )}
                        <Badge variant={log.direction === 'in' ? 'default' : 'secondary'}>
                          {log.direction === 'in' ? 'Recebida' : 'Enviada'}
                        </Badge>
                        <span className="text-sm font-medium">{log.to_from}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      {log.content && (
                        <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                      )}
                      {log.template_name && (
                        <Badge variant="outline" className="mt-2">
                          Template: {log.template_name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      €{log.cost_estimate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

