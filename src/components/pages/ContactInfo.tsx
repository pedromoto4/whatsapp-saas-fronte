import { X, PencilSimple, FloppyDisk, Phone, Clock, FileText, Robot } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Conversation } from './ConversationsPage'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getApiBaseUrl } from '@/lib/api-config'

interface ContactInfoProps {
  conversation: Conversation
  messageCount: number
  onClose: () => void
}

interface ContactData {
  phone_number: string
  name?: string
  verified_name?: string
  profile_picture_url?: string
  has_picture?: boolean
  database_name?: string
  tags?: string
}

export default function ContactInfo({ conversation, messageCount, onClose }: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [name, setName] = useState(conversation.contact_name || '')
  const [contactData, setContactData] = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)  // null = use global, true/false = override
  const [aiSource, setAiSource] = useState<'user' | 'contact'>('user')
  const [loadingAI, setLoadingAI] = useState(true)
  const [savingAI, setSavingAI] = useState(false)

  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        const token = localStorage.getItem('firebase_token')
        const response = await fetch(`${getApiBaseUrl()}/api/conversations/${conversation.phone_number}/info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setContactData(data)
          
          // Use WhatsApp name or database name if available
          if (data.database_name) {
            setName(data.database_name)
          } else if (data.name && data.name !== conversation.phone_number) {
            setName(data.name)
          }
        }
      } catch (error) {
        console.error('Error loading contact info:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadContactInfo()
    loadAISetting()
  }, [conversation.phone_number])

  const loadAISetting = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) return

      const response = await fetch(`${getApiBaseUrl()}/api/conversations/${conversation.phone_number}/ai-enabled`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAiEnabled(data.contact_override)
        setAiSource(data.source)
      }
    } catch (error) {
      console.error('Error loading AI setting:', error)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleToggleAI = async (newValue: boolean | null) => {
    setSavingAI(true)
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`${getApiBaseUrl()}/api/conversations/${conversation.phone_number}/ai-enabled`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newValue })
      })

      if (response.ok) {
        const data = await response.json()
        setAiEnabled(newValue)
        setAiSource(newValue === null ? 'user' : 'contact')
        toast.success(data.message || 'Configuração atualizada')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao atualizar configuração')
      }
    } catch (error) {
      console.error('Error updating AI setting:', error)
      toast.error('Erro de conexão')
    } finally {
      setSavingAI(false)
    }
  }

  const displayName = name || conversation.contact_name || contactData?.database_name || conversation.phone_number
  const displayPhone = conversation.phone_number
  const profilePictureUrl = null // WhatsApp doesn't provide profile pictures via API

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      // First, get or create the contact
      let contactId: number | null = null
      
      try {
        const getContactResponse = await fetch(`${getApiBaseUrl()}/api/contacts/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (getContactResponse.ok) {
          const contacts = await getContactResponse.json()
          const existingContact = contacts.contacts.find((c: any) => c.phone_number === conversation.phone_number)
          if (existingContact) {
            contactId = existingContact.id
          }
        }
      } catch (error) {
        console.error('Error getting contacts:', error)
      }

      // If contact doesn't exist, create it
      if (!contactId) {
        const createResponse = await fetch(`${getApiBaseUrl()}/api/contacts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: conversation.phone_number,
            name: name,
            notes: notes,
            tags: contactData?.tags
          })
        })

        if (createResponse.ok) {
          toast.success('Contacto criado com sucesso!')
          setIsEditing(false)
          return
        } else {
          const error = await createResponse.json()
          toast.error(error.detail || 'Erro ao criar contacto')
          return
        }
      }

      // Update existing contact
      const updateResponse = await fetch(`${getApiBaseUrl()}/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          notes: notes,
          tags: contactData?.tags
        })
      })

      if (updateResponse.ok) {
        toast.success('Informações atualizadas!')
        setIsEditing(false)
        // Update local state
        setContactData(prev => prev ? { ...prev, database_name: name } : null)
      } else {
        const error = await updateResponse.json()
        toast.error(error.detail || 'Erro ao atualizar contacto')
      }
    } catch (error) {
      console.error('Error saving contact info:', error)
      toast.error('Erro ao salvar informações')
    }
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Informações</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Profile Section */}
        <div className="flex flex-col items-center mb-6">
          <Avatar className="w-20 h-20 mb-4">
            {profilePictureUrl ? (
              <AvatarImage src={profilePictureUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="text-center">
            {isEditing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center mb-2"
              />
            ) : (
              <h3 className="text-lg font-semibold mb-1">
                {displayName}
              </h3>
            )}
            <p className="text-sm text-muted-foreground">{displayPhone}</p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <Phone size={20} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Telefone</p>
              <p className="text-sm text-muted-foreground">{conversation.phone_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock size={20} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Última conversa</p>
              <p className="text-sm text-muted-foreground">
                {new Date(conversation.last_message_time).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText size={20} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Total de mensagens</p>
              <p className="text-sm text-muted-foreground">{messageCount} mensagens</p>
            </div>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Robot size={20} className="text-muted-foreground" />
            <h4 className="text-sm font-semibold">Respostas por IA</h4>
          </div>
          
          {loadingAI ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="ai-contact" className="text-sm cursor-pointer">
                    {aiEnabled === null 
                      ? 'Usar configuração global'
                      : aiEnabled 
                      ? 'Ativado para este contacto'
                      : 'Desativado para este contacto'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {aiEnabled === null 
                      ? 'Usa a configuração geral das Configurações'
                      : aiEnabled
                      ? 'Este contacto receberá respostas por IA mesmo se desativado globalmente'
                      : 'Este contacto NÃO receberá respostas por IA mesmo se ativado globalmente'}
                  </p>
                </div>
                {aiSource === 'contact' && (
                  <Switch
                    id="ai-contact"
                    checked={aiEnabled === true}
                    onCheckedChange={(checked) => handleToggleAI(checked)}
                    disabled={savingAI}
                  />
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={aiEnabled === null ? "default" : "outline"}
                  onClick={() => handleToggleAI(null)}
                  disabled={savingAI}
                  className="flex-1"
                >
                  Global
                </Button>
                <Button
                  size="sm"
                  variant={aiEnabled === true ? "default" : "outline"}
                  onClick={() => handleToggleAI(true)}
                  disabled={savingAI}
                  className="flex-1"
                >
                  Ativar
                </Button>
                <Button
                  size="sm"
                  variant={aiEnabled === false ? "default" : "outline"}
                  onClick={() => handleToggleAI(false)}
                  disabled={savingAI}
                  className="flex-1"
                >
                  Desativar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Notas</h4>
            {isEditing ? (
              <Button size="sm" onClick={handleSave}>
                <FloppyDisk size={16} className="mr-1" />
                Guardar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <PencilSimple size={16} className="mr-1" />
                Editar
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas sobre este contacto..."
              className="min-h-[100px]"
            />
          ) : (
            <div className="p-3 bg-muted rounded-md min-h-[100px]">
              {notes || (
                <p className="text-sm text-muted-foreground">Nenhuma nota adicionada ainda.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

