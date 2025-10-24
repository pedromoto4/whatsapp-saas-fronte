import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PaperPlaneRight, Robot, User as UserIcon, Check, Checks, Image, File, VideoCamera, MusicNote } from '@phosphor-icons/react'
import type { Conversation, Message } from './ConversationsPage'

interface ChatWindowProps {
  conversation?: Conversation
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  loading: boolean
}

export default function ChatWindow({
  conversation,
  messages,
  onSendMessage,
  loading
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(messages.length)

  // Auto-scroll to bottom only when NEW messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      }, 100)
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(newMessage)
      setNewMessage('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const renderMessageStatus = (message: Message) => {
    // Only show status for outgoing messages
    if (message.direction !== 'out') return null
    
    const status = message.status || 'sent'
    const iconClass = "inline-block ml-1"
    
    if (status === 'read') {
      return <Checks size={16} weight="bold" className={`${iconClass} text-blue-400`} />
    } else if (status === 'delivered') {
      return <Checks size={16} className={iconClass} />
    } else {
      return <Check size={16} className={iconClass} />
    }
  }

  const renderMediaContent = (message: Message) => {
    if (message.kind !== 'media' || !message.media_type) return null

    const mediaType = message.media_type
    const mediaUrl = message.media_url
    const filename = message.media_filename || 'arquivo'

    if (mediaType === 'image' && mediaUrl) {
      return (
        <div className="mb-2">
          <img 
            src={mediaUrl} 
            alt="Imagem" 
            className="max-w-full rounded-md max-h-64 object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none'
            }}
          />
          {message.content && message.content !== '[IMAGE]' && (
            <p className="text-sm mt-2">{message.content}</p>
          )}
        </div>
      )
    }

    // For other media types (document, video, audio), show icon + filename
    let Icon = File
    if (mediaType === 'video') Icon = VideoCamera
    if (mediaType === 'audio') Icon = MusicNote

    return (
      <div className="flex items-center gap-2 mb-2">
        <Icon size={24} />
        <div className="flex-1">
          <p className="text-sm font-medium">{filename}</p>
          <p className="text-xs opacity-70">{mediaType.toUpperCase()}</p>
        </div>
        {mediaUrl && (
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            Abrir
          </a>
        )}
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20">
        <UserIcon size={64} className="text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
        <p className="text-sm text-muted-foreground">
          Escolha uma conversa à esquerda para começar
        </p>
      </div>
    )
  }

  const displayName = conversation.contact_name || conversation.phone_number

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(conversation.contact_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{displayName}</h3>
          <p className="text-sm text-muted-foreground">{conversation.phone_number}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((message) => {
              const isIncoming = message.direction === 'in'
              const content = message.content || `[Template: ${message.template_name}]`
              const isMedia = message.kind === 'media'

              // Debug: Check if this is a media message
              if (message.kind === 'media') {
                console.log('🎯 MEDIA MESSAGE FOUND:', {
                  kind: message.kind,
                  media_type: message.media_type,
                  media_url: message.media_url,
                  content: message.content
                })
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`
                      max-w-[70%] rounded-lg px-4 py-2 
                      ${isIncoming 
                        ? 'bg-muted' 
                        : 'bg-primary text-primary-foreground'
                      }
                    `}
                  >
                    {/* Render media content if it's a media message */}
                    {isMedia && renderMediaContent(message)}
                    
                    {/* Render text content only if not media or if media has caption */}
                    {!isMedia && (
                      <div className="flex items-start gap-2 mb-1">
                        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {message.is_automated && !isIncoming && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${isIncoming ? '' : 'bg-primary-foreground/20 text-primary-foreground'}`}
                        >
                          <Robot size={10} className="mr-1" />
                          Auto
                        </Badge>
                      )}
                      {message.template_name && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${isIncoming ? '' : 'border-primary-foreground/20 text-primary-foreground'}`}
                        >
                          Template
                        </Badge>
                      )}
                      <span 
                        className={`text-xs flex items-center ${isIncoming ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}
                      >
                        {formatTime(message.created_at)}
                        {renderMessageStatus(message)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            size="icon"
          >
            <PaperPlaneRight size={20} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar
        </p>
      </div>
    </div>
  )
}

