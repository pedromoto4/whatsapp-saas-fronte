import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from '@/hooks/use-router'
import { CheckCircleIcon, ChatIcon, ChartBarIcon, GearIcon } from '@phosphor-icons/react'

export default function LandingPage() {
  const { navigate } = useRouter()

  const features = [
    {
      icon: <ChatIcon size={48} className="text-primary" />,
      title: "Smart Automation",
      description: "Automate customer conversations with intelligent responses and workflows"
    },
    {
      icon: <ChartBarIcon size={48} className="text-primary" />,
      title: "Product Catalog",
      description: "Showcase your products with rich media and instant availability updates"
    },
    {
      icon: <GearIcon size={48} className="text-primary" />,
      title: "Sales Analytics",
      description: "Track performance with detailed reports and actionable insights"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
            Automate Your Customer Engagement
            <br />
            <span className="text-primary">Boost Your Sales</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline customer communications, showcase your products, and track performance 
            with our all-in-one engagement platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg"
              onClick={() => navigate('/login')}
            >
              Start Free 14-Day Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-3 text-lg"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-4">
            Everything You Need to Scale
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Powerful tools designed to help businesses of all sizes improve customer engagement and increase sales.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-6 py-16 bg-secondary/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-8">
            Trusted by Growing Businesses
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Active Businesses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Messages Automated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of businesses already using EngagePro to automate their customer engagement.
          </p>
          <Button 
            size="lg" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg"
            onClick={() => navigate('/login')}
          >
            Get Started Free Today
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  )
}