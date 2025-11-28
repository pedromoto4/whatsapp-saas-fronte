import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from '@/hooks/use-router'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import FAQManagement from '@/components/pages/FAQManagement'
import CatalogManagement from '@/components/pages/CatalogManagement'
import ContactsManagement from '@/components/pages/ContactsManagement'
// import TemplateManagement from '@/components/pages/TemplateManagement' // Hidden - in stand-by
import ConversationsPage from '@/components/pages/ConversationsPage'
import SettingsPage from '@/components/pages/SettingsPage'
import { 
  Circle, 
  ChartBar, 
  Gear, 
  Question,
  List,
  Users,
  TrendUp,
  ShoppingCart,
  Bug,
  Check,
  X,
  FileText,
  ChatCircleText
} from '@phosphor-icons/react'

type DashboardSection = 'overview' | 'catalog' | 'api-test' | 'faqs' | 'contacts' | 'conversations' | 'settings' // 'templates' removed - in stand-by

export default function DashboardPage() {
  const { navigate } = useRouter()
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')
  const [apiTestResults, setApiTestResults] = useState<{[key: string]: 'pending' | 'success' | 'error'}>({})
  const [isTestingAll, setIsTestingAll] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/conversations/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_count)
        
        // Update page title
        if (data.unread_count > 0) {
          document.title = `(${data.unread_count}) Nova${data.unread_count > 1 ? 's' : ''} mensagem${data.unread_count > 1 ? 's' : ''} - WhatsApp SaaS`
        } else {
          document.title = 'WhatsApp SaaS'
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    
    // Listen for conversation-read event to fetch from backend
    const handleConversationRead = () => {
      fetchUnreadCount()
    }
    
    // Listen for unread-count-changed event to immediately update from local state
    const handleUnreadCountChanged = (event: CustomEvent) => {
      const newCount = event.detail.count
      setUnreadCount(newCount)
      
      // Update page title immediately
      if (newCount > 0) {
        document.title = `(${newCount}) Nova${newCount > 1 ? 's' : ''} mensagem${newCount > 1 ? 's' : ''} - WhatsApp SaaS`
      } else {
        document.title = 'WhatsApp SaaS'
      }
    }
    
    // Listen for select-conversation event (from ContactsManagement)
    const handleSelectConversation = (event: CustomEvent) => {
      const { phoneNumber } = event.detail
      if (phoneNumber) {
        setActiveSection('conversations')
        // Forward event to ConversationsPage
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('select-conversation', { 
            detail: { phoneNumber } 
          }))
        }, 100)
      }
    }
    
    window.addEventListener('conversation-read', handleConversationRead)
    window.addEventListener('unread-count-changed', handleUnreadCountChanged as EventListener)
    window.addEventListener('select-conversation', handleSelectConversation as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('conversation-read', handleConversationRead)
      window.removeEventListener('unread-count-changed', handleUnreadCountChanged as EventListener)
      window.removeEventListener('select-conversation', handleSelectConversation as EventListener)
    }
  }, [])

  const sidebarItems = [
    { id: 'overview' as const, label: 'Visão Geral', icon: ChartBar },
    { id: 'conversations' as const, label: 'Conversas', icon: ChatCircleText },
    { id: 'contacts' as const, label: 'Contatos', icon: Users },
    // { id: 'templates' as const, label: 'Templates', icon: FileText }, // Hidden - in stand-by
    { id: 'faqs' as const, label: 'FAQs', icon: Question },
    { id: 'catalog' as const, label: 'Catálogo', icon: ShoppingCart },
    { id: 'settings' as const, label: 'Configurações', icon: Gear },
    { id: 'api-test' as const, label: 'Teste API', icon: Bug },
  ]

  const stats = [
    { label: 'Mensagens Enviadas', value: '2,847', change: '+12%', icon: Circle },
    { label: 'Clientes Ativos', value: '156', change: '+8%', icon: Users },
    { label: 'Taxa de Conversão', value: '3.2%', change: '+0.5%', icon: TrendUp },
    { label: 'Produtos Listados', value: '24', change: '+3', icon: ShoppingCart },
  ]

  // Backend API URL - use environment variable or fallback to localhost for development
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  // Only force HTTPS in production
  if (import.meta.env.PROD && baseUrl.startsWith('http://')) {
    console.warn('⚠️ ENV variable has http://, forcing https://')
    baseUrl = baseUrl.replace('http://', 'https://')
  }
  const API_BASE_URL = baseUrl
  
  // Function to get auth token
  const getAuthToken = async () => {
    try {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebase_token')
      if (token) {
        return token
      }
      
      // Fallback: if user is logged in but no token, try to get fresh token
      if (user) {
        console.warn('No Firebase token found, user might need to re-login')
        return null
      }
      
      return null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  // Generate consistent result key for endpoint
  const getResultKey = (endpoint: string, method: string) => {
    if (method === 'POST') {
      // Remove trailing slash and add -post suffix
      return endpoint.replace(/\/$/, '') + '-post'
    }
    // For GET, just remove trailing slash
    return endpoint.replace(/\/$/, '')
  }

  // Test individual endpoints
  const testEndpoint = async (endpoint: string, method: string = 'GET', data?: any) => {
    // Build URL from base and endpoint
    let fullUrl = `${API_BASE_URL}${endpoint}`
    
    // Safety check: force HTTPS only in production
    if (import.meta.env.PROD && fullUrl.startsWith('http://')) {
      console.warn('⚠️ URL has http://, forcing https://', fullUrl)
      fullUrl = fullUrl.replace('http://', 'https://')
    }
    
    const resultKey = getResultKey(endpoint, method)
    setApiTestResults(prev => ({ ...prev, [resultKey]: 'pending' }))
    
    try {
      const token = await getAuthToken()
      
      // Check if endpoint requires auth and user is not logged in
      const requiresAuth = endpoint.includes('/api/')
      if (requiresAuth && !token) {
        throw new Error('Você precisa estar logado para testar este endpoint')
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const options: RequestInit = {
        method,
        headers,
      }

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(fullUrl, options)
      
      if (response.ok) {
        const result = await response.json()
        setApiTestResults(prev => ({ ...prev, [resultKey]: 'success' }))
        toast.success(`${endpoint} funcionando!`, {
          description: `Status: ${response.status} - ${method}`
        })
      } else {
        const errorText = await response.text()
        console.error('❌ Error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Exception:', error)
      setApiTestResults(prev => ({ ...prev, [resultKey]: 'error' }))
      toast.error(`Erro em ${endpoint}`, {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  // Test all endpoints
  const testAllEndpoints = async () => {
    setIsTestingAll(true)
    toast.info('Testando todos os endpoints...')
    
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/me', method: 'GET' },
      { path: '/whatsapp/status', method: 'GET' },
      { path: '/whatsapp/templates', method: 'GET' },
      { path: '/api/contacts/', method: 'GET' },
      { path: '/api/contacts/', method: 'POST', data: { phone_number: '+5511999999999', name: 'Test Contact', email: 'test@example.com' } },
      { path: '/api/campaigns/', method: 'GET' },
      { path: '/api/campaigns/', method: 'POST', data: { name: 'Test Campaign', message_template: 'Hello from dashboard test' } },
      { path: '/api/messages/', method: 'GET' },
      { path: '/api/messages/', method: 'POST', data: { content: 'Test message from dashboard', contact_id: 1 } },
    ]

    for (const endpoint of endpoints) {
      await testEndpoint(endpoint.path, endpoint.method, endpoint.data)
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsTestingAll(false)
    toast.success('Testes concluídos!')
  }

  const getStatusIcon = (status: 'pending' | 'success' | 'error' | undefined) => {
    switch (status) {
      case 'pending':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border border-muted-foreground"></div>
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta!</h2>
              <p className="text-muted-foreground">
                Aqui está o que está acontecendo com o seu negócio hoje.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <Badge variant="secondary" className="text-xs">
                      {stat.change} from last month
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest customer interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New customer inquiry</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Order completed</p>
                        <p className="text-xs text-muted-foreground">15 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Product catalog updated</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks to get you started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveSection('catalog')}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add products
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveSection('analytics')}
                  >
                    <TrendUp className="mr-2 h-4 w-4" />
                    View reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case 'faqs':
        return <FAQManagement />
      
      case 'catalog':
        return <CatalogManagement />
      
      case 'contacts':
        return <ContactsManagement />
      
      // case 'templates':
      //   return <TemplateManagement /> // Hidden - in stand-by
      
      case 'conversations':
        return <ConversationsPage />
      
      case 'settings':
        return <SettingsPage />
      
      case 'api-test':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">API Testing</h2>
              <p className="text-muted-foreground">
                Test your backend endpoints to ensure they're working correctly.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Backend Configuration</CardTitle>
                <CardDescription>
                  Current backend URL: <code className="bg-muted px-2 py-1 rounded text-sm">{API_BASE_URL}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button 
                    onClick={testAllEndpoints}
                    disabled={isTestingAll}
                  >
                    {isTestingAll ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Bug className="mr-2 h-4 w-4" />
                    )}
                    Testar Todos os Endpoints
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setApiTestResults({})
                      toast.info('Resultados limpos')
                    }}
                  >
                    Limpar Resultados
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Health & Auth</CardTitle>
                  <CardDescription>Basic connectivity and authentication tests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /health</p>
                      <p className="text-sm text-muted-foreground">Server health check</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/health'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/health', 'GET')}
                        disabled={apiTestResults['/health'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /api/me</p>
                      <p className="text-sm text-muted-foreground">Get current user</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/me'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/me', 'GET')}
                        disabled={apiTestResults['/api/me'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp API</CardTitle>
                  <CardDescription>WhatsApp Business API integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /whatsapp/status</p>
                      <p className="text-sm text-muted-foreground">WhatsApp service status</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/whatsapp/status'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/whatsapp/status', 'GET')}
                        disabled={apiTestResults['/whatsapp/status'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /whatsapp/templates</p>
                      <p className="text-sm text-muted-foreground">Get message templates</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/whatsapp/templates'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/whatsapp/templates', 'GET')}
                        disabled={apiTestResults['/whatsapp/templates'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Messages API</CardTitle>
                  <CardDescription>WhatsApp message management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /api/messages</p>
                      <p className="text-sm text-muted-foreground">List messages</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/messages'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/messages/', 'GET')}
                        disabled={apiTestResults['/api/messages'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">POST /api/messages</p>
                      <p className="text-sm text-muted-foreground">Send message</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/messages-post'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/messages/', 'POST', { 
                          content: 'Test message from dashboard', 
                          contact_id: 1
                        })}
                        disabled={apiTestResults['/api/messages-post'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contacts API</CardTitle>
                  <CardDescription>Contact management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /api/contacts</p>
                      <p className="text-sm text-muted-foreground">List contacts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/contacts'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/contacts/', 'GET')}
                        disabled={apiTestResults['/api/contacts'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">POST /api/contacts</p>
                      <p className="text-sm text-muted-foreground">Create contact</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/contacts-post'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/contacts/', 'POST', { 
                          phone_number: '+5511999999999',
                          name: 'Test Contact', 
                          email: 'test@example.com'
                        })}
                        disabled={apiTestResults['/api/contacts-post'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaigns API</CardTitle>
                  <CardDescription>Campaign management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">GET /api/campaigns</p>
                      <p className="text-sm text-muted-foreground">List campaigns</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/campaigns'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/campaigns/', 'GET')}
                        disabled={apiTestResults['/api/campaigns'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">POST /api/campaigns</p>
                      <p className="text-sm text-muted-foreground">Create campaign</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apiTestResults['/api/campaigns-post'])}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testEndpoint('/api/campaigns/', 'POST', { 
                          name: 'Test Campaign', 
                          message_template: 'Hello from dashboard test'
                        })}
                        disabled={apiTestResults['/api/campaigns-post'] === 'pending'}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>Summary of API test results</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(apiTestResults).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum teste executado ainda. Clique nos botões acima para testar os endpoints.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(apiTestResults).map(([endpoint, status]) => (
                        <div key={endpoint} className="flex items-center justify-between p-2 bg-muted rounded">
                          <code className="text-sm">{endpoint}</code>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <span className="text-sm capitalize">{status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">WhatsApp SaaS</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card min-h-screen">
          <nav className="p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {item.id === 'api-test' && (
                    <li className="my-4">
                      <div className="h-px bg-border" />
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} />
                        {item.label}
                      </div>
                      {item.id === 'conversations' && unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  </li>
                </React.Fragment>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}