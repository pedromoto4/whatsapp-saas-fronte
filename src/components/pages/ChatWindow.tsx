import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PaperPlaneRight, Robot, User as UserIcon, Check, Checks, Image, File, VideoCamera, MusicNote, X, Upload } from '@phosphor-icons/react'
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string
    media_type: string
    public_url: string
  } | null>(null)
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
      alert('Ficheiro muito grande. Tamanho máximo: 16MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de ficheiro não suportado')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('firebase_token')
      const response = await fetch('https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setUploadedFile(result)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erro ao fazer upload do ficheiro')
    } finally {
      setUploading(false)
    }
  }

  const handleSendMedia = async () => {
    if (!uploadedFile || !conversation || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('firebase_token')
      const response = await fetch('https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/send-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: conversation.phone_number,
          media_url: uploadedFile.public_url,
          media_type: uploadedFile.media_type,
          caption: newMessage || ''
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send media')
      }

      setNewMessage('')
      setUploadedFile(null)
      
      // Refresh messages
      window.location.reload()
    } catch (error) {
      console.error('Error sending media:', error)
      alert('Erro ao enviar media')
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
      // Use proxy endpoint for media (handles authentication automatically)
      const imageUrl = `https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/media/${mediaUrl}`
        
      return (
        <div className="mb-2">
          <img 
            src={imageUrl} 
            alt="Imagem" 
            className="max-w-full rounded-md max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedImage(imageUrl)}
            onError={(e) => {
              // Show fallback when image fails to load
              e.currentTarget.style.display = 'none'
              const fallback = e.currentTarget.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'block'
            }}
          />
          {/* Fallback when image fails to load */}
          <div className="hidden flex items-center gap-2 p-3 bg-muted rounded-md">
            <Image size={24} />
            <div className="flex-1">
              <p className="text-sm font-medium">Imagem</p>
              <p className="text-xs text-muted-foreground">Não foi possível carregar a imagem</p>
            </div>
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs underline"
            >
              Abrir
            </a>
          </div>
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

    // Use proxy endpoint for media (handles authentication automatically)
    const finalMediaUrl = mediaUrl 
      ? `https://whatsapp-saas-fronte-production.up.railway.app/whatsapp/media/${mediaUrl}`
      : null

    return (
      <div className="flex items-center gap-2 mb-2">
        <Icon size={24} />
        <div className="flex-1">
          <p className="text-sm font-medium">{filename}</p>
          <p className="text-xs opacity-70">{mediaType.toUpperCase()}</p>
        </div>
        {finalMediaUrl && (
          <a 
            href={finalMediaUrl} 
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
        {/* File Preview */}
        {uploadedFile && (
          <div className="mb-3 p-3 bg-muted rounded-lg flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              {uploadedFile.media_type === 'image' ? (
                <Image size={24} />
              ) : uploadedFile.media_type === 'video' ? (
                <VideoCamera size={24} />
              ) : uploadedFile.media_type === 'audio' ? (
                <MusicNote size={24} />
              ) : (
                <File size={24} />
              )}
              <div>
                <p className="text-sm font-medium">{uploadedFile.filename}</p>
                <p className="text-xs text-muted-foreground">{uploadedFile.media_type.toUpperCase()}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedFile(null)}
            >
              <X size={16} />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {/* File Upload Button */}
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading || sending}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              ) : (
                <Upload size={20} />
              )}
            </Button>
          </div>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={uploadedFile ? handleSendMedia : handleSend} 
            disabled={(!newMessage.trim() && !uploadedFile) || sending || uploading}
            size="icon"
          >
            <PaperPlaneRight size={20} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar
        </p>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={selectedImage} 
              alt="Imagem ampliada" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

