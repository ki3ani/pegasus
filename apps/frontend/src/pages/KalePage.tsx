/**
 * KALE Farming Page
 * Dedicated page showcasing KALE integration for hackathon demo
 */

import { Navigation } from '../components/Navigation'
import { KaleIntegration } from '../components/kale/KaleIntegration'
import { ReflectorStatus } from '../components/oracle/ReflectorStatus'
import { useWalletStore } from '../store/walletStore'

export default function KalePage() {
  const { publicKey } = useWalletStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KALE Farming & Oracle</h1>
          <p className="mt-2 text-gray-600">
            Farm KALE tokens through proof-of-work and monitor real-time Reflector Oracle feeds
          </p>
        </div>

        <div className="space-y-8">
          {/* KALE Integration */}
          <KaleIntegration userPublicKey={publicKey || undefined} />
          
          {/* Reflector Oracle Status */}
          <ReflectorStatus />
        </div>
      </div>
    </div>
  )
}