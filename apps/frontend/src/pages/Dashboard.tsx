import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWalletStore } from '../store/walletStore'
import Navigation from '../components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  WalletIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { profile } = useAuth()
  const { publicKey, balance, assets, refreshBalance, isLoading, isConnected } = useWalletStore()

  useEffect(() => {
    if (publicKey && isConnected) {
      refreshBalance();
    }
  }, [publicKey, isConnected, refreshBalance])

  const totalBalance = balance ? parseFloat(balance) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your portfolio overview and recent activity
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBalance.toLocaleString()} XLM</div>
              <p className="text-xs text-muted-foreground">
                {isConnected ? '+0% from yesterday' : 'Set up wallet to view balance'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets</CardTitle>
              <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length + (balance && parseFloat(balance) > 0 ? 1 : 0)}</div>
              <p className="text-xs text-muted-foreground">
                Active holdings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Change</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+0.0%</div>
              <p className="text-xs text-muted-foreground">
                Portfolio performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rebalances</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Coming in Phase 2
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Wallet Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <WalletIcon className="h-5 w-5" />
                    Wallet Status
                  </CardTitle>
                  <CardDescription>
                    {isConnected ? 'Connected and ready' : 'Set up your wallet to start trading'}
                  </CardDescription>
                </div>
                {isConnected && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshBalance}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Public Key</p>
                    <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                      {publicKey}
                    </p>
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/wallet-setup">Manage Wallet</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <WalletIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">No wallet connected</p>
                  <Button asChild>
                    <Link to="/wallet-setup" className="flex items-center gap-2">
                      <PlusIcon className="h-4 w-4" />
                      Set Up Wallet
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Holdings */}
          <Card>
            <CardHeader>
              <CardTitle>Current Holdings</CardTitle>
              <CardDescription>
                Your portfolio breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="space-y-4">
                  {!balance && assets.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        {isLoading ? 'Loading balances...' : 'No balances found'}
                      </p>
                      {!isLoading && publicKey && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://friendbot.stellar.org?addr=${publicKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Fund Testnet Account
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {balance && (
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="font-medium">XLM</span>
                          <span className="text-muted-foreground">{parseFloat(balance).toLocaleString()}</span>
                        </div>
                      )}
                      {assets
                        .map((asset, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                          <span className="font-medium">{asset.asset || 'Unknown'}</span>
                          <span className="text-muted-foreground">{parseFloat(asset.balance).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ChartBarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Connect a wallet to view your holdings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 Coming in Phase 2</CardTitle>
            <CardDescription>
              Advanced portfolio management features are in development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {['Automated Rebalancing', 'DCA Strategies', 'Risk Analytics', 'Yield Optimization'].map((feature) => (
                <div key={feature} className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full"></div>
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}