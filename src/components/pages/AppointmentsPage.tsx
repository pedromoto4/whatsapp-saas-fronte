import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Calendar, Clock, User, X, Check, PencilSimple } from '@phosphor-icons/react'

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
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
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

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) return

      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
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

  useEffect(() => {
    loadAppointments()
    loadServiceTypes()
  }, [selectedDate])

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
        loadAppointments()
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
        loadAppointments()
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
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
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

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum agendamento encontrado para esta data
          </CardContent>
        </Card>
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

