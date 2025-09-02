import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletStore } from '@/store/walletStore'
import Navigation from '@/components/Navigation'
import AdvancedWalletSetup from '@/components/wallet/AdvancedWalletSetup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isFreighterAvailable } from '@/utils/freighter'

function WalletSetupPage() {
  const navigate = useNavigate()
  const {
    connect,
    isConnected,
    publicKey,
    isLoading,
    error
  } = useWalletStore()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [success, setSuccess] = useState('')
  const [freighterAvailable, setFreighterAvailable] = useState(false)
  const [freighterChecking, setFreighterChecking] = useState(true)

  useEffect(() => {
    const checkFreighter = async () => {
      try {
        console.log('Checking Freighter availability...')
        const available = await isFreighterAvailable()
        console.log('Freighter detection result:', available)
        setFreighterAvailable(available)
      } catch (err) {
        console.error('Error checking Freighter:', err)
        setFreighterAvailable(false)
      } finally {
        setFreighterChecking(false)
      }
    }

    checkFreighter()
  }, [])


  const handleFreighterConnect = async () => {
    console.log('Starting Freighter connection...')
    setSuccess('')

    try {
      console.log('Calling connect function...')
      await connect()
      console.log('Connect function completed successfully')
      setSuccess('Freighter connected successfully!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      console.error('Freighter connection error:', err)
    }
  }

  const handleAdvancedSuccess = () => {
    setSuccess('Wallet setup completed successfully!')
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  if (showAdvanced) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-6">
          <AdvancedWalletSetup
            onSuccess={handleAdvancedSuccess}
            onCancel={() => setShowAdvanced(false)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Connect Your Wallet
          </h1>
          <p className="text-muted-foreground">
            Choose how you'd like to connect to access your Stellar assets
          </p>
        </div>

        {/* Freighter Connection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              Freighter Wallet (Recommended)
            </CardTitle>
            <CardDescription>
              Connect securely with the official Stellar browser extension
            </CardDescription>
          </CardHeader>
          <CardContent>
            {freighterChecking ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking for Freighter...</p>
              </div>
            ) : !freighterAvailable ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <span className="text-yellow-600">⚠️</span>
                <AlertDescription className="text-yellow-800">
                  Freighter is not installed.{' '}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-900"
                  >
                    Install Freighter
                  </a>{' '}
                  to continue.
                </AlertDescription>
              </Alert>
            ) : isConnected && publicKey ? (
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">✅</span>
                <h3 className="text-lg font-semibold mb-2 text-green-600">Freighter Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Your Freighter wallet is connected and ready to use
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800 font-medium">Connected Account:</p>
                  <code className="text-xs text-green-700 break-all">
                    {publicKey}
                  </code>
                </div>
                <Button
                  onClick={handleFreighterConnect}
                  disabled={isLoading}
                  variant="outline"
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {isLoading ? 'Reconnecting...' : 'Reconnect Freighter'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">🚀</span>
                <h3 className="text-lg font-semibold mb-2">Connect Your Freighter Wallet</h3>
                <p className="text-muted-foreground mb-6">
                  Securely connect your Freighter wallet to access your Stellar assets
                </p>
                <Button
                  onClick={handleFreighterConnect}
                  disabled={isLoading}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {isLoading ? 'Connecting...' : 'Connect Freighter'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <span className="text-red-600">❌</span>
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <span className="text-green-600">✅</span>
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  )
}

export default WalletSetupPage