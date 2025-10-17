import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from '@/hooks/use-router'
import { CheckIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export default function PricingPage() {
  const { navigate } = useRouter()

  const plans = [
    {
      name: 'Basic',
      price: '15',
      description: 'Perfect for small businesses getting started',
      features: [
        'Up to 1,000 messages/month',
        'Basic automation workflows',
        'Product catalog (50 items)',
        'Email support',
        'Basic analytics'
      ],
      popular: false
    },
    {
      name: 'Pro',
      price: '30',
      description: 'Ideal for growing businesses',
      features: [
        'Up to 10,000 messages/month',
        'Advanced automation workflows',
        'Unlimited product catalog',
        'Priority support',
        'Advanced analytics & reports',
        'Custom integrations',
        'Multi-channel support'
      ],
      popular: true
    }
  ]

  const handleSubscribe = (planName: string, price: string) => {
    toast.info(`${planName} plan selected (€${price}/month). Payment integration coming soon!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative p-6 ${plan.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground"
                  >
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckIcon 
                          size={20} 
                          className="text-primary mt-0.5 flex-shrink-0" 
                        />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${plan.popular 
                      ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                      : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleSubscribe(plan.name, plan.price)}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-semibold mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What happens after the trial?</h3>
                <p className="text-muted-foreground text-sm">
                  After 14 days, you'll be automatically subscribed to your chosen plan. Cancel anytime during the trial.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground text-sm">
                  We offer a 30-day money-back guarantee if you're not satisfied with our service.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is there setup assistance?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes! Our team provides onboarding support to help you get started quickly.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <button 
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}