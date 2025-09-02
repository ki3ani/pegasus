import { useEffect } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import WalletStatus from '../components/WalletStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { 
    publicKey, 
    balance, 
    assets, 
    refreshBalance, 
    isLoading, 
    isConnected 
  } = useWalletStore();
  const { profile } = useAuth();

  useEffect(() => {
    if (publicKey && isConnected) {
      refreshBalance();
    }
  }, [publicKey, isConnected, refreshBalance]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Stellar portfolio and track your investments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Wallet Status */}
          <div className="lg:col-span-2">
            <WalletStatus />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common wallet operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/wallet-setup'}
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                Manage Wallet
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={!isConnected}
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Balances Section */}
        {isConnected && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5" />
                    Account Balances
                  </CardTitle>
                  <CardDescription>
                    Your current Stellar asset balances
                  </CardDescription>
                </div>
                <Button
                  onClick={refreshBalance}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!balance && assets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {isLoading ? 'Loading balances...' : 'No balances found. Fund your wallet to get started.'}
                  </p>
                  {!isLoading && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        For testnet: Visit{' '}
                        <a
                          href={`https://friendbot.stellar.org?addr=${publicKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          Stellar Friendbot
                        </a>
                        {' '}to fund your account
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {balance && (
                    <div className="flex justify-between items-center py-3 px-4 bg-muted/50 rounded-lg">
                      <span className="font-medium">XLM</span>
                      <span className="text-lg font-semibold">
                        {parseFloat(balance).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {assets
                    .map((asset, index) => (
                    <div key={index} className="flex justify-between items-center py-3 px-4 bg-muted/50 rounded-lg">
                      <span className="font-medium">
                        {asset.asset || 'Unknown'}
                      </span>
                      <span className="text-lg font-semibold">
                        {parseFloat(asset.balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Coming Soon */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🚀 Coming in Phase 2</CardTitle>
            <CardDescription>
              Advanced portfolio management features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Portfolio rebalancing, automated strategies, and advanced analytics are coming soon!
            </p>
            <div className="flex flex-wrap gap-2">
              {['Automated Rebalancing', 'DCA Strategies', 'Risk Analytics', 'Yield Optimization'].map((feature) => (
                <span key={feature} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {feature}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}