import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from '@/hooks/use-router'
import { useKV } from '@github/spark/hooks'
import { 
  ChatCircle, 
  ChartBar, 
  Gear, 
  Question,
  List,
  Users,
  TrendUp,
  Chat,
  ShoppingCart
} from '@phosphor-icons/react'

type DashboardSection = 'overview' | 'automation' | 'catalog' | 'analytics'

export default function DashboardPage() {
  const { navigate } = useRouter()
  const [userEmail] = useKV<string>('userEmail', '')
  const [, setIsLoggedIn] = useKV<boolean>('isLoggedIn', false)
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')

  const handleLogout = () => {
    setIsLoggedIn(false)
    navigate('/')
  }

  const sidebarItems = [
    { id: 'overview' as const, label: 'Overview', icon: ChartBar },
    { id: 'automation' as const, label: 'Automation', icon: ChatCircle },
    { id: 'catalog' as const, label: 'Product Catalog', icon: ShoppingCart },
    { id: 'analytics' as const, label: 'Analytics', icon: TrendUp },
  ]

  const stats = [
    { label: 'Messages Sent', value: '2,847', change: '+12%', icon: Chat },
    { label: 'Active Customers', value: '156', change: '+8%', icon: Users },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.5%', icon: TrendUp },
    { label: 'Products Listed', value: '24', change: '+3', icon: ShoppingCart },
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
              <p className="text-muted-foreground">
                Here's what's happening with your business today.
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
                    <ChatCircle className="mr-2 h-4 w-4" />
                    Set up automation
                  </Button>
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
                  <ChatCircle size={48} className="text-muted-foreground mx-auto mb-4" />
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
                  <ShoppingCart size={48} className="text-muted-foreground mx-auto mb-4" />
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
                  <TrendUp size={48} className="text-muted-foreground mx-auto mb-4" />
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
            <h1 className="text-2xl font-bold text-primary">EngagePro</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{userEmail}</span>
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