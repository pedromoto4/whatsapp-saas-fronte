import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatCircle, Robot } from '@phosphor-icons/react'
import type { Conversation } from './ConversationsPage'

interface ConversationsListProps {
  conversations: Conversation[]
  activeConversation: string | null
  onSelectConversation: (phoneNumber: string) => void
  loading: boolean
}

export default function ConversationsList({
  conversations,
  activeConversation,
  onSelectConversation,
  loading
}: ConversationsListProps) {
  
  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Ontem'
    } else if (days < 7) {
      return date.toLocaleDateString('pt-PT', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando conversas...</p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ChatCircle size={64} className="text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Nenhuma conversa</h3>
        <p className="text-sm text-muted-foreground">
          As conversas aparecerão aqui quando receber mensagens
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <h2 className="text-lg font-semibold">Conversas</h2>
        <p className="text-sm text-muted-foreground">{conversations.length} conversas</p>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {conversations.map((conversation) => {
          const isActive = conversation.phone_number === activeConversation
          const displayName = conversation.contact_name || conversation.phone_number

          return (
            <div
              key={conversation.phone_number}
              onClick={() => onSelectConversation(conversation.phone_number)}
              className={`
                flex items-start gap-3 p-4 border-b cursor-pointer transition-colors
                hover:bg-accent
                ${isActive ? 'bg-accent border-l-4 border-l-primary' : ''}
              `}
            >
              {/* Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(conversation.contact_name)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium truncate">{displayName}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatTime(conversation.last_message_time)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  {conversation.direction === 'out' && (
                    <span className="text-xs text-muted-foreground">Você:</span>
                  )}
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {conversation.last_message}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {conversation.is_automated && (
                    <Badge variant="secondary" className="text-xs">
                      <Robot size={12} className="mr-1" />
                      Auto
                    </Badge>
                  )}
                  {conversation.unread_count > 0 && (
                    <Badge className="text-xs bg-primary">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}

