import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { Calendar, Clock, User, X, PencilSimple, List, CalendarBlank } from '@phosphor-icons/react'

interface Appointment {
  id: number
  contact_id: number
  service_type_id: number | null
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  contact?: {
    name: string
    phone_number: string
  }
  service_type?: {
    name: string
  }
}

interface ServiceType {
  id: number
  name: string
  duration_minutes: number
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [activeView, setActiveView] = useState<string>('calendar')
  const [formData, setFormData] = useState({
    contact_id: '',
    service_type_id: '',
    scheduled_at: '',
    notes: '',
    status: 'pending' as const
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  const getAuthToken = () => {
    return localStorage.getItem('firebase_token')
  }

  // Load appointments for a specific day
  const loadDayAppointments = async (date: Date) => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) return

      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      const response = await fetch(
        `${API_BASE_URL}/api/appointments/?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      } else {
        toast.error('Erro ao carregar agendamentos')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // Load appointments for the entire month
  const loadMonthAppointments = async (month: Date) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)

      const response = await fetch(
        `${API_BASE_URL}/api/appointments/?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMonthAppointments(data)
      }
    } catch (error) {
      console.error('Error loading month appointments:', error)
    }
  }

  const loadServiceTypes = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/service-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setServiceTypes(data)
      }
    } catch (error) {
      console.error('Error loading service types:', error)
    }
  }

  // Count appointments per day for the calendar
  const appointmentsByDay = useMemo(() => {
    const counts: Record<string, { total: number; pending: number; confirmed: number }> = {}
    
    monthAppointments.forEach(apt => {
      if (apt.status === 'cancelled') return // Don't count cancelled
      
      const dateKey = new Date(apt.scheduled_at).toISOString().split('T')[0]
      if (!counts[dateKey]) {
        counts[dateKey] = { total: 0, pending: 0, confirmed: 0 }
      }
      counts[dateKey].total++
      if (apt.status === 'pending') counts[dateKey].pending++
      if (apt.status === 'confirmed') counts[dateKey].confirmed++
    })
    
    return counts
  }, [monthAppointments])

  // Get dates that have appointments
  const datesWithAppointments = useMemo(() => {
    return Object.keys(appointmentsByDay).map(dateStr => new Date(dateStr))
  }, [appointmentsByDay])

  useEffect(() => {
    loadDayAppointments(selectedDate)
    loadServiceTypes()
  }, [selectedDate])

  useEffect(() => {
    loadMonthAppointments(currentMonth)
  }, [currentMonth])

  const handleSave = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const url = editingAppointment
        ? `${API_BASE_URL}/api/appointments/${editingAppointment.id}`
        : `${API_BASE_URL}/api/appointments/`

      const method = editingAppointment ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact_id: parseInt(formData.contact_id),
          service_type_id: formData.service_type_id ? parseInt(formData.service_type_id) : null,
          scheduled_at: formData.scheduled_at,
          notes: formData.notes,
          status: formData.status
        })
      })

      if (response.ok) {
        toast.success(editingAppointment ? 'Agendamento atualizado!' : 'Agendamento criado!')
        setIsDialogOpen(false)
        setEditingAppointment(null)
        setFormData({
          contact_id: '',
          service_type_id: '',
          scheduled_at: '',
          notes: '',
          status: 'pending'
        })
        loadDayAppointments(selectedDate)
        loadMonthAppointments(currentMonth)
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao salvar agendamento')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Agendamento cancelado!')
        loadDayAppointments(selectedDate)
        loadMonthAppointments(currentMonth)
      } else {
        toast.error('Erro ao cancelar agendamento')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'outline'
    }
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Concluído'
    }
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-PT'),
      time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  // Handle month change in calendar
  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month)
  }

  // Render appointments list (shared between views)
  const renderAppointmentsList = () => {
    if (loading) {
      return <div className="text-center py-8">Carregando...</div>
    }
    
    if (appointments.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum agendamento para esta data
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {appointments.map((appointment) => {
          const { time } = formatDateTime(appointment.scheduled_at)
          return (
            <div 
              key={appointment.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-lg font-semibold text-primary min-w-[60px]">
                  {time}
                </div>
                <div className="space-y-1">
                  {appointment.contact && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {appointment.contact.name || appointment.contact.phone_number}
                      </span>
                    </div>
                  )}
                  {appointment.service_type && (
                    <div className="text-sm text-muted-foreground">
                      {appointment.service_type.name}
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="text-sm text-muted-foreground italic">
                      {appointment.notes}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(appointment.status)}
                {appointment.status !== 'cancelled' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAppointment(appointment)
                        setFormData({
                          contact_id: appointment.contact_id.toString(),
                          service_type_id: appointment.service_type_id?.toString() || '',
                          scheduled_at: new Date(appointment.scheduled_at).toISOString().slice(0, 16),
                          notes: appointment.notes || '',
                          status: appointment.status
                        })
                        setIsDialogOpen(true)
                      }}
                    >
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancel(appointment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos e consultas</p>
        </div>
        <Button onClick={() => {
          setEditingAppointment(null)
          setFormData({
            contact_id: '',
            service_type_id: '',
            scheduled_at: new Date().toISOString().slice(0, 16),
            notes: '',
            status: 'pending'
          })
          setIsDialogOpen(true)
        }}>
          <Calendar className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarBlank className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Calendar */}
            <Card>
              <CardContent className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  onMonthChange={handleMonthChange}
                  modifiers={{
                    hasAppointments: datesWithAppointments
                  }}
                  modifiersClassNames={{
                    hasAppointments: 'bg-primary/20 font-bold text-primary'
                  }}
                  className="rounded-md"
                />
                
                {/* Appointments summary for month */}
                <div className="mt-4 pt-4 border-t space-y-3">
                  <p className="text-sm font-medium">Resumo do mês:</p>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {Object.entries(appointmentsByDay)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(0, 7)
                      .map(([dateKey, data]) => {
                        const date = new Date(dateKey)
                        return (
                          <button
                            key={dateKey}
                            onClick={() => setSelectedDate(date)}
                            className={`p-2 rounded text-center hover:bg-accent transition-colors ${
                              selectedDate.toISOString().split('T')[0] === dateKey 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <div className="font-medium">{date.getDate()}</div>
                            <Badge variant="secondary" className="text-[10px] px-1 h-4">
                              {data.total}
                            </Badge>
                          </button>
                        )
                      })}
                  </div>
                  {Object.keys(appointmentsByDay).length > 7 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {Object.keys(appointmentsByDay).length - 7} dias com agendamentos
                    </p>
                  )}
                </div>
                
                {/* Legend */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary/20"></div>
                      <span>Dias com agendamentos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Day appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatSelectedDate(selectedDate)}
                </CardTitle>
                <CardDescription>
                  {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderAppointmentsList()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtrar por Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="max-w-xs"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  Agendamentos de {formatSelectedDate(selectedDate)}
                </h3>
                {loading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : appointments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum agendamento encontrado para esta data
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {appointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.scheduled_at)
                      return (
                        <Card key={appointment.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{date}</span>
                                  <Clock className="h-4 w-4 text-muted-foreground ml-4" />
                                  <span className="font-medium">{time}</span>
                                </div>
                                {appointment.contact && (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{appointment.contact.name || appointment.contact.phone_number}</span>
                                  </div>
                                )}
                                {appointment.service_type && (
                                  <div className="text-sm text-muted-foreground">
                                    Serviço: {appointment.service_type.name}
                                  </div>
                                )}
                                {appointment.notes && (
                                  <div className="text-sm text-muted-foreground">
                                    {appointment.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(appointment.status)}
                                {appointment.status !== 'cancelled' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingAppointment(appointment)
                                        setFormData({
                                          contact_id: appointment.contact_id.toString(),
                                          service_type_id: appointment.service_type_id?.toString() || '',
                                          scheduled_at: new Date(appointment.scheduled_at).toISOString().slice(0, 16),
                                          notes: appointment.notes || '',
                                          status: appointment.status
                                        })
                                        setIsDialogOpen(true)
                                      }}
                                    >
                                      <PencilSimple className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCancel(appointment.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment ? 'Atualize as informações do agendamento' : 'Crie um novo agendamento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Contato ID</label>
              <Input
                type="number"
                value={formData.contact_id}
                onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                placeholder="ID do contato"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Serviço</label>
              <Select
                value={formData.service_type_id}
                onValueChange={(value) => setFormData({ ...formData, service_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {serviceTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id.toString()}>
                      {st.name} ({st.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data e Hora</label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
