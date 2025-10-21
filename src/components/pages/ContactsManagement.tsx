import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, User, Phone, ChatCircle, MagnifyingGlass } from '@phosphor-icons/react'

interface Contact {
  id: number
  name: string
  phone_number: string
  tags?: string
  notes?: string
  owner_id: number
  created_at: string
}

export default function ContactsManagement() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    tags: '',
    notes: ''
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  const getAuthToken = async () => {
    const token = localStorage.getItem('firebase_token')
    if (!token) {
      toast.error('Token de autenticação não encontrado. Por favor, faça login novamente.')
      return null
    }
    return token
  }

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    // Filter contacts based on search query
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.phone_number.toLowerCase().includes(query)
      )
      setFilteredContacts(filtered)
    }
  }, [searchQuery, contacts])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        setFilteredContacts(data.contacts || [])
      } else {
        toast.error('Erro ao carregar contatos')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const saveContact = async () => {
    // Validate phone number format
    if (!formData.phone_number.startsWith('+')) {
      toast.error('O telefone deve começar com + e código do país (ex: +351912345678)')
      return
    }

    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório')
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          phone_number: formData.phone_number,
          tags: formData.tags || null,
          notes: formData.notes || null
        })
      })

      if (response.ok) {
        toast.success('Contato criado com sucesso!')
        setIsDialogOpen(false)
        resetForm()
        loadContacts()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao criar contato')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const deleteContact = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este contato?')) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Contato deletado!')
        loadContacts()
      } else {
        toast.error('Erro ao deletar contato')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', phone_number: '', tags: '', notes: '' })
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove + and format for display
    return phone.replace('+', '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Gestão de Contatos</h2>
          <p className="text-muted-foreground mt-1">
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contato' : 'contatos'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus size={20} className="mr-2" /> Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Contato</DialogTitle>
              <DialogDescription>
                Adicione um novo contato à sua lista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome *</label>
                <Input
                  placeholder="Ex: João Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Telefone *</label>
                <Input
                  placeholder="Ex: +351912345678"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: +[código país][número] (ex: +351912345678)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags (opcional)</label>
                <Input
                  placeholder="Ex: cliente, vip, urgente"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notas (opcional)</label>
                <Input
                  placeholder="Ex: Cliente desde 2024"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button onClick={saveContact} className="w-full">
                Criar Contato
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando contatos...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado ainda'}
              </p>
              {!searchQuery && (
                <Button onClick={openCreateDialog} className="mt-4" variant="outline">
                  <Plus size={20} className="mr-2" /> Adicionar Primeiro Contato
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User size={24} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Phone size={14} />
                        {formatPhoneNumber(contact.phone_number)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.tags && (
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.split(',').map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {contact.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {contact.notes}
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  Adicionado em {formatDate(contact.created_at)}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      // Navigate to WhatsApp section with pre-filled phone
                      toast.info('Funcionalidade de envio rápido em breve!')
                    }}
                  >
                    <ChatCircle size={16} className="mr-1" />
                    Enviar Mensagem
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteContact(contact.id)}
                  >
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

