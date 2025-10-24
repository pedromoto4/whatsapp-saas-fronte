import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import ConversationsList from './ConversationsList'
import ChatWindow from './ChatWindow'

export interface Conversation {
  phone_number: string
  contact_name?: string
  last_message: string
  last_message_time: string
  direction: 'in' | 'out'
  unread_count: number
  is_automated: boolean
  is_archived: boolean
  tags?: string | null
}

export interface Message {
  id: number
  direction: 'in' | 'out'
  content: string | null
  kind: 'text' | 'template' | 'media'
  template_name?: string
  created_at: string
  is_automated: boolean
  status?: 'sent' | 'delivered' | 'read'
  whatsapp_message_id?: string
  media_url?: string | null
  media_type?: string | null
  media_filename?: string | null
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const previousUnreadCountRef = useRef<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  const getAuthToken = () => {
    const token = localStorage.getItem('firebase_token')
    if (!token) {
      toast.error('Token de autenticação não encontrado.')
      return null
    }
    return token
  }


  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/conversations/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Calculate total unread count
        const totalUnread = data.reduce((sum: number, conv: Conversation) => sum + conv.unread_count, 0)
        
        // Show notification if new unread messages (only on silent refresh and if count increased)
        if (silent && totalUnread > previousUnreadCountRef.current && previousUnreadCountRef.current >= 0) {
          toast.info('📩 Nova mensagem recebida!')
        }
        
        previousUnreadCountRef.current = totalUnread
        setConversations(data)
      } else if (!silent) {
        toast.error('Erro ao carregar conversas')
      }
    } catch (error) {
      if (!silent) toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (phoneNumber: string, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(phoneNumber)}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else if (!silent) {
        toast.error('Erro ao carregar mensagens')
      }
    } catch (error) {
      if (!silent) toast.error('Erro de conexão')
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!activeConversation) return

    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(activeConversation)}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        toast.success('Mensagem enviada!')
        // Reload messages to show the new one
        await loadMessages(activeConversation)
        // Reload conversations to update preview
        await loadConversations()
        
        // Trigger global refresh (conversation now marked as read)
        window.dispatchEvent(new CustomEvent('conversation-read'))
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao enviar mensagem')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const handleConversationSelect = async (phoneNumber: string) => {
    setActiveConversation(phoneNumber)
    loadMessages(phoneNumber)
    
    // Mark conversation as read locally (immediate UI feedback)
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.phone_number === phoneNumber 
          ? { ...conv, unread_count: 0 }
          : conv
      )
      
      // Update global state after local update
      const newTotalUnread = updated.reduce((sum, conv) => sum + conv.unread_count, 0)
      
      // Dispatch event with new count
      window.dispatchEvent(new CustomEvent('unread-count-changed', { 
        detail: { count: newTotalUnread } 
      }))
      
      return updated
    })
    
    // Mark as read in backend (persists across refreshes)
    try {
      const token = getAuthToken()
      if (token) {
        await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(phoneNumber)}/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
    } catch (error) {
      // Silent fail - not critical
      console.log('Failed to mark as read in backend')
    }
  }

  // Load conversations on mount and initialize counter
  useEffect(() => {
    loadConversations().then(() => {
      // Initialize previous count to current count (avoid false notification on first load)
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0)
      previousUnreadCountRef.current = totalUnread
    })
  }, [])

  // Auto-refresh only messages of active conversation every 5 seconds (silent mode)
  useEffect(() => {
    if (!activeConversation) return

    const interval = setInterval(() => {
      loadMessages(activeConversation, true) // silent = true (no loading state)
    }, 5000)

    return () => clearInterval(interval)
  }, [activeConversation])

  // Refresh conversations list every 30 seconds (silent mode)
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true) // silent = true (no loading state)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Update page title when conversations change
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0)
    
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Nova${totalUnread > 1 ? 's' : ''} mensagem${totalUnread > 1 ? 's' : ''} - WhatsApp SaaS`
    } else {
      document.title = 'WhatsApp SaaS'
    }
  }, [conversations])

  // Archive/Unarchive conversation
  const toggleArchive = async (phoneNumber: string, isArchived: boolean) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const endpoint = isArchived ? 'unarchive' : 'archive'
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${encodeURIComponent(phoneNumber)}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        toast.success(isArchived ? 'Conversa desarquivada' : 'Conversa arquivada')
        loadConversations(true) // Reload conversations
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || 'Erro ao arquivar conversa'
        
        if (errorMessage.includes('migration')) {
          toast.error('Funcionalidade de arquivo não disponível. Execute a migração primeiro.')
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  // Filter conversations based on search, unread, and archive filters
  const filteredConversations = conversations.filter(conv => {
    // Archive filter
    const matchesArchive = showArchived ? conv.is_archived : !conv.is_archived
    
    // Search filter
    const matchesSearch = searchQuery === '' || 
      (conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      conv.phone_number.includes(searchQuery)
    
    // Unread filter
    const matchesUnread = !showOnlyUnread || conv.unread_count > 0
    
    return matchesArchive && matchesSearch && matchesUnread
  })

  return (
    <div className="h-[calc(100vh-120px)] flex gap-0 border rounded-lg overflow-hidden bg-background">
      {/* Left sidebar - Conversations list */}
      <div className="w-[380px] border-r flex-shrink-0">
        <ConversationsList
          conversations={filteredConversations}
          activeConversation={activeConversation}
          onSelectConversation={handleConversationSelect}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showOnlyUnread={showOnlyUnread}
          onToggleUnread={() => setShowOnlyUnread(!showOnlyUnread)}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
          onToggleArchive={toggleArchive}
        />
      </div>

      {/* Right panel - Chat window */}
      <div className="flex-1 flex flex-col">
        <ChatWindow
          conversation={conversations.find(c => c.phone_number === activeConversation)}
          messages={messages}
          onSendMessage={sendMessage}
          loading={messagesLoading}
        />
      </div>
    </div>
  )
}

