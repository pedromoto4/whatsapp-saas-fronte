import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChatCircle, Robot, MagnifyingGlass, Funnel, X, ArchiveBox, Tag } from '@phosphor-icons/react'
import type { Conversation } from './ConversationsPage'

interface ConversationsListProps {
  conversations: Conversation[]
  activeConversation: string | null
  onSelectConversation: (phoneNumber: string) => void
  loading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  showOnlyUnread: boolean
  onToggleUnread: () => void
  showArchived: boolean
  onToggleArchived: () => void
  onToggleArchive: (phoneNumber: string, isArchived: boolean) => void
}

export default function ConversationsList({
  conversations,
  activeConversation,
  onSelectConversation,
  loading,
  searchQuery,
  onSearchChange,
  showOnlyUnread,
  onToggleUnread,
  showArchived,
  onToggleArchived,
  onToggleArchive
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <p className="text-sm text-muted-foreground">{conversations.length}</p>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={showOnlyUnread ? "default" : "outline"}
            size="sm"
            onClick={onToggleUnread}
            className="flex-1"
          >
            <Funnel size={16} className="mr-2" />
            {showOnlyUnread ? 'Todas' : 'Não lidas'}
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={onToggleArchived}
            className="flex-1"
          >
            <ArchiveBox size={16} className="mr-2" />
            {showArchived ? 'Ativas' : 'Arquivadas'}
          </Button>
        </div>
      </div>

      {/* Conversations list or empty state */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <ChatCircle size={64} className="text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {searchQuery || showOnlyUnread ? 'Nenhum resultado' : 'Nenhuma conversa'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery 
              ? 'Tente buscar por outro nome ou número'
              : showOnlyUnread
              ? 'Não há conversas não lidas no momento'
              : 'As conversas aparecerão aqui quando receber mensagens'
            }
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
        {conversations.map((conversation) => {
          const isActive = conversation.phone_number === activeConversation
          const displayName = conversation.contact_name || conversation.phone_number
          const tags = conversation.tags ? JSON.parse(conversation.tags) : []

          return (
            <div
              key={conversation.phone_number}
              className={`
                flex items-start gap-3 p-4 border-b transition-colors relative group
                hover:bg-accent
                ${isActive ? 'bg-accent border-l-4 border-l-primary' : ''}
                ${conversation.unread_count > 0 && !isActive ? 'bg-primary/5 font-semibold' : ''}
              `}
            >
              {/* Archive button (shows on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleArchive(conversation.phone_number, conversation.is_archived)
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded"
                title={conversation.is_archived ? 'Desarquivar' : 'Arquivar'}
              >
                <ArchiveBox size={18} className={conversation.is_archived ? 'text-primary' : 'text-muted-foreground'} />
              </button>

              <div onClick={() => onSelectConversation(conversation.phone_number)} className="flex items-start gap-3 flex-1 cursor-pointer">
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

                <div className="flex items-center gap-2 flex-wrap">
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
                  {tags.length > 0 && tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Tag size={10} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              </div>
            </div>
          )
        })}
        </ScrollArea>
      )}
    </div>
  )
}

