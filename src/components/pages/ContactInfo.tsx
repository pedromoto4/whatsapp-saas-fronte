import { X, PencilSimple, FloppyDisk, Phone, Clock, FileText } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Conversation } from './ConversationsPage'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        const token = localStorage.getItem('firebase_token')
        const response = await fetch(`https://whatsapp-saas-fronte-production.up.railway.app/api/conversations/${conversation.phone_number}/info`, {
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
  }, [conversation.phone_number])

  const displayName = name || conversation.contact_name || contactData?.database_name || conversation.phone_number
  const displayPhone = conversation.phone_number
  const profilePictureUrl = contactData?.profile_picture_url

  const handleSave = () => {
    // TODO: Implement API call to save notes and name
    console.log('Saving contact info:', { name, notes })
    setIsEditing(false)
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
              <img src={profilePictureUrl} alt={displayName} />
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

