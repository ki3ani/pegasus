import React, { useState, useEffect, useCallback } from 'react'
import type { TradeInstruction, TradeResult } from '../../services/tradingService'

interface TradingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  userPublicKey: string
  portfolioId?: string
  suggestedTrades?: TradeInstruction[]
  mode: 'single' | 'rebalance'
}

export const TradingModal: React.FC<TradingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userPublicKey,
  portfolioId,
  suggestedTrades = [],
  mode
}) => {
  // Suppress unused variable warning for portfolioId (used in production)
  void portfolioId;
  const [currentStep, setCurrentStep] = useState<'review' | 'signing' | 'executing' | 'complete'>('review')
  const [result, setResult] = useState<TradeResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [marketPrices, setMarketPrices] = useState<Record<string, string>>({})
  const [isFetchingPrices, setIsFetchingPrices] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)

  const fetchMarketPrices = useCallback(async () => {
    if (suggestedTrades.length === 0 || isFetchingPrices) return
    
    setIsFetchingPrices(true)
    try {
      // Mock market prices for demo
      const mockPrices: Record<string, string> = {
        'USDC/XLM': '8.0192',
        'USDC/KALE': '222.2222',
        'XLM/USDC': '0.1247',
        'XLM/KALE': '27.7111',
        'KALE/XLM': '0.0361',
        'KALE/USDC': '0.0045'
      }
      
      // Simulate network delay for realistic demo
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const priceMap: Record<string, string> = {}
      suggestedTrades.forEach(trade => {
        const key = `${trade.fromAsset}/${trade.toAsset}`
        priceMap[key] = mockPrices[key] || 'N/A'
      })
      setMarketPrices(priceMap)
    } catch {
      console.error('Failed to fetch market prices')
    } finally {
      setIsFetchingPrices(false)
    }
  }, [suggestedTrades, isFetchingPrices])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('review')
      setResult(null)
      setError('')
      fetchMarketPrices()
    }
  }, [isOpen, fetchMarketPrices])

  const handleConfirmTrade = async () => {
    const now = Date.now()
    if (now - lastClickTime < 3000) return // Prevent clicks within 3 seconds
    setLastClickTime(now)

    if (!userPublicKey || suggestedTrades.length === 0 || isLoading) return

    setIsLoading(true)
    setError('')

    try {
      // Mock demo transaction flow - simulates successful trading without requiring wallet
      console.log('🎭 Demo mode: Simulating trade execution...')
      
      // Step 1: Mock building transaction
      setCurrentStep('signing')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 2: Mock signing (no Freighter required for demo)
      console.log('✍️ Demo: Simulating transaction signing...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Mock submitting transaction
      setCurrentStep('executing')
      console.log('🚀 Demo: Simulating transaction submission...')
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Mock successful result
      const mockResult: TradeResult = {
        success: true,
        transactionId: `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actualSlippage: Math.random() * 2 // Random slippage between 0-2%
      }

      setResult(mockResult)
      setCurrentStep('complete')
      
      console.log('✅ Demo: Trade execution simulation completed successfully!')
      
      // Auto-close after showing success for 3 seconds
      setTimeout(() => {
        if (onComplete) {
          onComplete()
        }
      }, 3000)

    } catch (err) {
      console.error('Trade execution failed:', err)
      setError(err instanceof Error ? err.message : 'Trade execution failed')
      setCurrentStep('review')
      if (onComplete) {
        onComplete()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (amount: string, decimals: number = 7): string => {
    return parseFloat(amount).toFixed(decimals).replace(/\.?0+$/, '')
  }

  const calculateTotalValue = (): string => {
    return suggestedTrades.reduce((total, trade) => {
      const amount = parseFloat(trade.fromAmount)
      // For simplicity, assume 1:1 USD rate - in reality would use price feeds
      return total + amount
    }, 0).toFixed(2)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'single' ? 'Execute Trade' : 'Rebalance Portfolio'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {currentStep === 'review' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Trades:</span>
                    <span className="ml-2 font-medium">{suggestedTrades.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Est. Total Value:</span>
                    <span className="ml-2 font-medium">${calculateTotalValue()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {suggestedTrades.map((trade, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{trade.fromAsset}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{trade.toAsset}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Max Slippage: {trade.maxSlippage}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Sell:</span>
                        <span className="ml-2 font-medium">{formatAmount(trade.fromAmount)} {trade.fromAsset}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Expected:</span>
                        <span className="ml-2 font-medium">{formatAmount(trade.expectedToAmount)} {trade.toAsset}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Market Price:</span>
                        <span className="ml-2 font-medium">
                          {marketPrices[`${trade.fromAsset}/${trade.toAsset}`] || 'Loading...'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTrade}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading || suggestedTrades.length === 0}
              >
                {isLoading ? 'Processing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'signing' && (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Sign Transaction</h3>
            <p className="text-gray-600">Please approve the transaction in your Freighter wallet.</p>
          </div>
        )}

        {currentStep === 'executing' && (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Executing Transaction</h3>
            <p className="text-gray-600">Submitting to Stellar network...</p>
          </div>
        )}

        {currentStep === 'complete' && result && (
          <div className="text-center py-8">
            {result.success ? (
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-green-800">Transaction Successful!</h3>
                {result.transactionId && (
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-700 mb-2">Transaction ID:</p>
                    <p className="font-mono text-xs break-all bg-white p-2 rounded border">
                      {result.transactionId}
                    </p>
                  </div>
                )}
                {result.actualSlippage !== undefined && (
                  <p className="text-sm text-gray-600 mb-4">
                    Actual Slippage: {result.actualSlippage.toFixed(2)}%
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-800">Transaction Failed</h3>
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-red-700">{result.error}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}