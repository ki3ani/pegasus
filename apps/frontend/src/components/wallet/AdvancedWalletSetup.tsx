import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '../ui/alert'

interface AdvancedWalletSetupProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AdvancedWalletSetup({ onSuccess, onCancel }: AdvancedWalletSetupProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Wallet Features</CardTitle>
            <CardDescription>
              Advanced wallet features (generate, import, recovery) are not available in this Freighter-only version.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                This application is configured to work exclusively with Freighter wallet extension for security and simplicity.
                For advanced wallet management, please use dedicated Stellar wallet applications.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4 mt-6">
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Back to Freighter Setup
              </Button>
              <Button onClick={onSuccess} className="flex-1">
                Continue with Freighter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
