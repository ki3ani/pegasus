import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Shield, Zap, Target } from 'lucide-react'

export default function MinimalWelcome() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            RebalanceX
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link to="/profile">Dashboard</Link>
              </Button>
            ) : (
              <Link 
                to="/auth"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 cursor-pointer"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Portfolio Rebalancing
            <span className="text-primary"> Made Simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Automate your crypto portfolio rebalancing on Stellar. Non-custodial, secure, and designed for maximum returns.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-lg font-medium rounded-md hover:bg-indigo-700 cursor-pointer"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a 
                  href="#features"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 bg-white text-gray-700 text-lg font-medium rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Learn More
                </a>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why Choose RebalanceX?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built on Stellar with modern authentication and security
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: 'Secure Authentication',
              description: 'Google Sign-in, email verification, and secure session management.'
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Powered by Stellar network for instant, low-cost transactions.'
            },
            {
              icon: Target,
              title: 'Smart Rebalancing',
              description: 'AI-powered portfolio optimization and automated rebalancing (Coming in Phase 2).'
            }
          ].map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="container py-24">
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of users who trust RebalanceX with their portfolio management.
                Phase 1 includes secure authentication and wallet management.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link 
                to="/auth" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-lg font-medium rounded-md hover:bg-indigo-700 cursor-pointer"
              >
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 RebalanceX. Built with ❤️ on Stellar.
          </p>
        </div>
      </footer>
    </div>
  )
}