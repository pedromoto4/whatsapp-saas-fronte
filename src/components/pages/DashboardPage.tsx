import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from '@/hooks/use-router'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import WhatsAppMessage from '@/components/WhatsAppMessage'
import { 
  CircleIcon, 
  ChartBarIcon, 
  GearIcon, 
  QuestionIcon,
  ListIcon,
  UsersIcon,
  TrendUpIcon,
  CircleIcon,
  ShoppingCartIcon,
  BugIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon
} from '@phosphor-icons/react'

type DashboardSection = 'overview' | 'automation' | 'catalog' | 'analytics' | 'api-test' | 'whatsapp'

export default function DashboardPage() {
  const { navigate } = useRouter()
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')
  const [apiTestResults, setApiTestResults] = useState<{[key: string]: 'pending' | 'success' | 'error'}>({})
  const [isTestingAll, setIsTestingAll] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const sidebarItems = [
    { id: 'overview' as const, label: 'Visão Geral', icon: ChartBarIcon },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: PhoneIcon },
    { id: 'automation' as const, label: 'Automação', icon: CircleIcon },
    { id: 'catalog' as const, label: 'Catálogo', icon: ShoppingCartIcon },
    { id: 'analytics' as const, label: 'Relatórios', icon: TrendUpIcon },
    { id: 'api-test' as const, label: 'Teste API', icon: BugIcon },
  ]

  const stats = [
    { label: 'Mensagens Enviadas', value: '2,847', change: '+12%', icon: ChatIcon },
    { label: 'Clientes Ativos', value: '156', change: '+8%', icon: UsersIcon },
    { label: 'Taxa de Conversão', value: '3.2%', change: '+0.5%', icon: TrendUpIcon },
    { label: 'Produtos Listados', value: '24', change: '+3', icon: ShoppingCartIcon },
  ]

  // Backend API URL - use environment variable or fallback, always enforce HTTPS
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'
  // Force HTTPS even if environment variable is wrong
  if (baseUrl.startsWith('http://')) {
    console.warn('⚠️ ENV variable has http://, forcing https://')
    baseUrl = baseUrl.replace('http://', 'https://')
  }
  const API_BASE_URL = baseUrl
  
  // Function to get auth token
  const getAuthToken = async () => {
    if (user) {
      try {
        // For demo purposes, return a mock token
        // In production this would be a real JWT token from your auth system
        return `demo-token-${user.uid}`
      } catch (error) {
        console.error('Error getting auth token:', error)
        return null
      }
    }
    return null
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
    
    // Safety check: force HTTPS if somehow http slipped through
    if (fullUrl.startsWith('http://')) {
      console.warn('⚠️ URL has http://, forcing https://', fullUrl)
      fullUrl = fullUrl.replace('http://', 'https://')
    }
    
    console.group(`🌐 ${method} ${endpoint}`)
    console.log('Base URL:', API_BASE_URL)
    console.log('Endpoint:', endpoint)
    console.log('Full URL:', fullUrl)
    console.log('Has trailing slash:', endpoint.endsWith('/'))
    
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
      
      console.log('Response status:', response.status)
      console.log('Response URL:', response.url) // This shows final URL after redirects
      
      if (response.ok) {
        const result = await response.json()
        setApiTestResults(prev => ({ ...prev, [resultKey]: 'success' }))
        console.log('✅ Success:', result)
        console.groupEnd()
        toast.success(`${endpoint} funcionando!`, {
          description: `Status: ${response.status} - ${method}`
        })
      } else {
        const errorText = await response.text()
        console.error('❌ Error:', response.status, errorText)
        console.groupEnd()
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Exception:', error)
      console.groupEnd()
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
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />
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
                    onClick={() => setActiveSection('automation')}
                  >
                    <CircleIcon className="mr-2 h-4 w-4" />
                    Set up automation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveSection('catalog')}
                  >
                    <ShoppingCartIcon className="mr-2 h-4 w-4" />
                    Add products
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveSection('analytics')}
                  >
                    <TrendUpIcon className="mr-2 h-4 w-4" />
                    View reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case 'whatsapp':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">WhatsApp Business</h2>
              <p className="text-muted-foreground">
                Envie mensagens diretamente via WhatsApp Business API
              </p>
            </div>
            <WhatsAppMessage onMessageSent={() => {
              toast.success('Mensagem enviada!')
            }} />
          </div>
        )
      
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
                      <BugIcon className="mr-2 h-4 w-4" />
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
      
      case 'automation':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Smart Automation</h2>
              <p className="text-muted-foreground">
                Set up automated responses and workflows for your customers.
              </p>
            </div>
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <CircleIcon size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Automation Coming Soon</h3>
                  <p className="text-muted-foreground">
                    We're building powerful automation tools for you.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'catalog':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Product Catalog</h2>
              <p className="text-muted-foreground">
                Manage your products and showcase them to customers.
              </p>
            </div>
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <ShoppingCartIcon size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Catalog Management Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Advanced product management tools are in development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Analytics & Reports</h2>
              <p className="text-muted-foreground">
                Track your performance with detailed insights.
              </p>
            </div>
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <TrendUpIcon size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Comprehensive reporting and analytics dashboard in development.
                  </p>
                </div>
              </CardContent>
            </Card>
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
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </button>
                </li>
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