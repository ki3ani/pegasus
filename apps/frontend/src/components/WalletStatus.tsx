import { useWalletStore } from '../store/walletStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  WalletIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

interface WalletStatusProps {
  showActions?: boolean
  compact?: boolean
}

export default function WalletStatus({ showActions = true, compact = false }: WalletStatusProps) {
  const navigate = useNavigate()
  const {
    isConnected,
    publicKey
  } = useWalletStore()

  const handleSetupWallet = () => {
    navigate('/wallet-setup')
  }

  const handleViewWallet = () => {
    navigate('/wallet-setup')
  }

  if (!isConnected) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-6'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">No Wallet Connected</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Freighter wallet to manage your Stellar assets
                </p>
              </div>
            </div>
            {showActions && (
              <Button onClick={handleSetupWallet} size="sm">
                Setup Wallet
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? 'p-4' : ''}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1 bg-green-100 rounded">
            <WalletIcon className="h-4 w-4 text-green-600" />
          </div>
          Freighter Wallet
        </CardTitle>
        <CardDescription>
          Connected and ready to use
        </CardDescription>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Connected</p>
              <p className="text-xs text-muted-foreground">
                {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : 'No public key'}
              </p>
            </div>
          </div>
          {showActions && (
            <Button onClick={handleViewWallet} variant="outline" size="sm">
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
