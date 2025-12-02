import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Calendar, Clock, Plus, Trash, X } from '@phosphor-icons/react'

interface RecurringAvailability {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active: boolean
}

interface AvailabilityException {
  id: number
  date: string
  is_blocked: boolean
  custom_slots: string | null
}

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

export default function AvailabilityManagement() {
  const [recurringAvailability, setRecurringAvailability] = useState<RecurringAvailability[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState<RecurringAvailability | null>(null)
  const [formData, setFormData] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 30,
    is_active: true
  })
  const [exceptionFormData, setExceptionFormData] = useState({
    date: '',
    is_blocked: false,
    custom_slots: ''
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  const getAuthToken = () => {
    return localStorage.getItem('firebase_token')
  }

  const loadRecurringAvailability = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/availability/recurring`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecurringAvailability(data)
      }
    } catch (error) {
      console.error('Error loading recurring availability:', error)
    }
  }

  const loadExceptions = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/availability/exceptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setExceptions(data)
      }
    } catch (error) {
      console.error('Error loading exceptions:', error)
    }
  }

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([loadRecurringAvailability(), loadExceptions()])
      setLoading(false)
    }
    loadAll()
  }, [])

  const handleSaveRecurring = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const url = editingAvailability
        ? `${API_BASE_URL}/api/appointments/availability/recurring/${editingAvailability.id}`
        : `${API_BASE_URL}/api/appointments/availability/recurring`

      const method = editingAvailability ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingAvailability ? 'Horário atualizado!' : 'Horário criado!')
        setIsDialogOpen(false)
        setEditingAvailability(null)
        setFormData({
          day_of_week: 0,
          start_time: '09:00',
          end_time: '18:00',
          slot_duration_minutes: 30,
          is_active: true
        })
        loadRecurringAvailability()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao salvar horário')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const handleSaveException = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/availability/exceptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date(exceptionFormData.date).toISOString(),
          is_blocked: exceptionFormData.is_blocked,
          custom_slots: exceptionFormData.custom_slots || null
        })
      })

      if (response.ok) {
        toast.success('Exceção criada!')
        setIsExceptionDialogOpen(false)
        setExceptionFormData({
          date: '',
          is_blocked: false,
          custom_slots: ''
        })
        loadExceptions()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao criar exceção')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const handleDeleteRecurring = async (id: number) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/availability/recurring/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Horário removido!')
        loadRecurringAvailability()
      } else {
        toast.error('Erro ao remover horário')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const handleDeleteException = async (id: number) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/availability/exceptions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Exceção removida!')
        loadExceptions()
      } else {
        toast.error('Erro ao remover exceção')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return recurringAvailability.filter(a => a.day_of_week === dayOfWeek)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Disponibilidade</h1>
          <p className="text-muted-foreground">Configure horários de funcionamento e exceções</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExceptionDialogOpen(true)}>
            <X className="mr-2 h-4 w-4" />
            Bloquear Data
          </Button>
          <Button onClick={() => {
            setEditingAvailability(null)
            setFormData({
              day_of_week: 0,
              start_time: '09:00',
              end_time: '18:00',
              slot_duration_minutes: 30,
              is_active: true
            })
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Horário
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horários Recorrentes Semanais</CardTitle>
          <CardDescription>Configure os horários de funcionamento para cada dia da semana</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Duração do Slot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayAvailability = getAvailabilityForDay(index)
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{day}</TableCell>
                      <TableCell>
                        {dayAvailability.length > 0 ? (
                          <div className="space-y-1">
                            {dayAvailability.map((av) => (
                              <div key={av.id} className="flex items-center gap-2 text-sm">
                                <Clock className="h-3 w-3" />
                                <span>{av.start_time} - {av.end_time}</span>
                                {!av.is_active && <Badge variant="secondary">Inativo</Badge>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem horário configurado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {dayAvailability.length > 0 && (
                          <span>{dayAvailability[0].slot_duration_minutes} min</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {dayAvailability.length > 0 && (
                          <Badge variant={dayAvailability[0].is_active ? 'default' : 'secondary'}>
                            {dayAvailability[0].is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {dayAvailability.length > 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAvailability(dayAvailability[0])
                                  setFormData({
                                    day_of_week: dayAvailability[0].day_of_week,
                                    start_time: dayAvailability[0].start_time,
                                    end_time: dayAvailability[0].end_time,
                                    slot_duration_minutes: dayAvailability[0].slot_duration_minutes,
                                    is_active: dayAvailability[0].is_active
                                  })
                                  setIsDialogOpen(true)
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteRecurring(dayAvailability[0].id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAvailability(null)
                              setFormData({
                                day_of_week: index,
                                start_time: '09:00',
                                end_time: '18:00',
                                slot_duration_minutes: 30,
                                is_active: true
                              })
                              setIsDialogOpen(true)
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceções</CardTitle>
          <CardDescription>Bloqueios e horários especiais para datas específicas</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma exceção configurada
            </div>
          ) : (
            <div className="space-y-2">
              {exceptions.map((exception) => (
                <div key={exception.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(exception.date).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {exception.is_blocked ? 'Dia bloqueado' : 'Horários especiais'}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteException(exception.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAvailability ? 'Editar Horário' : 'Novo Horário'}
            </DialogTitle>
            <DialogDescription>
              Configure o horário de funcionamento para {DAYS_OF_WEEK[formData.day_of_week]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dia da Semana</label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                disabled={!!editingAvailability}
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Horário de Início</label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Horário de Fim</label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duração do Slot (minutos)</label>
              <Input
                type="number"
                value={formData.slot_duration_minutes}
                onChange={(e) => setFormData({ ...formData, slot_duration_minutes: parseInt(e.target.value) })}
                min={15}
                step={15}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Ativo</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRecurring}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Data</DialogTitle>
            <DialogDescription>
              Bloqueie uma data específica ou configure horários especiais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={exceptionFormData.date}
                onChange={(e) => setExceptionFormData({ ...exceptionFormData, date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_blocked"
                checked={exceptionFormData.is_blocked}
                onChange={(e) => setExceptionFormData({ ...exceptionFormData, is_blocked: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="is_blocked" className="text-sm font-medium">Bloquear dia completo</label>
            </div>
            {!exceptionFormData.is_blocked && (
              <div>
                <label className="text-sm font-medium">Horários Especiais (JSON)</label>
                <Input
                  value={exceptionFormData.custom_slots}
                  onChange={(e) => setExceptionFormData({ ...exceptionFormData, custom_slots: e.target.value })}
                  placeholder='{"times": ["09:00", "10:00", "14:00"]}'
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsExceptionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveException}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

