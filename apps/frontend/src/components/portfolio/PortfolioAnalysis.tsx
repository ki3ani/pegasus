/**
 * Portfolio Analysis Component
 * Shows drift analysis, rebalancing suggestions, and portfolio management
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, ArrowRightLeft, Zap } from 'lucide-react'
import type { Portfolio, PortfolioAnalysis as AnalysisData, PriceData } from '../../services/portfolioService'
import { TradingModal } from '../trading/TradingModal'
import { QuickSwap } from '../trading/QuickSwap'
import { useWalletStore } from '../../store/walletStore'

interface PortfolioAnalysisProps {
  portfolio: Portfolio
}

export function PortfolioAnalysis({ portfolio }: PortfolioAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [prices, setPrices] = useState<PriceData[]>([])
  const [, setUserBalances] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTradingModal, setShowTradingModal] = useState(false)
  const [supportedAssets, setSupportedAssets] = useState<string[]>(['XLM', 'USDC', 'KALE'])
  const [isRebalancing, setIsRebalancing] = useState(false)

  // Use wallet store instead of local state
  const { isConnected, publicKey } = useWalletStore()


  const loadPricesAndAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock price data for demo
      const mockPriceData: PriceData[] = [
        { asset: 'XLM', price: '0.1247', timestamp: Date.now(), source: 'Reflector' },
        { asset: 'USDC', price: '1.0001', timestamp: Date.now(), source: 'Reflector' },
        { asset: 'KALE', price: '0.0045', timestamp: Date.now(), source: 'Reflector' },
        { asset: 'BTC', price: '43250.67', timestamp: Date.now(), source: 'Demo' },
        { asset: 'ETH', price: '2645.33', timestamp: Date.now(), source: 'Demo' }
      ]
      setPrices(mockPriceData)

      // Mock user balances for demo
      const mockBalances: Record<string, string> = {
        'XLM': '1000.5',
        'USDC': '2500.0',
        'KALE': '750.25',
        'BTC': '0.1',
        'ETH': '2.5'
      }
      setUserBalances(mockBalances)

      // Mock portfolio analysis data
      const mockAnalysis: AnalysisData = {
        totalValueUsd: '8,432.67',
        currentAllocations: {
          'XLM': 28.5,
          'USDC': 62.1,
          'KALE': 9.4
        },
        targetAllocations: portfolio.targetAllocations,
        drift: 15.2,
        driftByAsset: {
          'XLM': -11.5,
          'USDC': +12.1,
          'KALE': -10.6
        },
        needsRebalancing: true,
        suggestedTrades: [
          {
            fromAsset: 'USDC',
            toAsset: 'XLM',
            fromAmount: '800.50',
            expectedToAmount: '6420.12',
            maxSlippage: 2.5,
            priority: 1
          },
          {
            fromAsset: 'USDC',
            toAsset: 'KALE',
            fromAmount: '200.00',
            expectedToAmount: '44444.44',
            maxSlippage: 3.0,
            priority: 2
          }
        ],
        assetBalances: [
          { asset: 'XLM', balance: '1000.5', valueUsd: '124.76', percentage: 28.5 },
          { asset: 'USDC', balance: '2500.0', valueUsd: '2500.25', percentage: 62.1 },
          { asset: 'KALE', balance: '750.25', valueUsd: '3.38', percentage: 9.4 }
        ]
      }

      // Simulate network delay for realistic demo
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      setAnalysis(mockAnalysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio analysis')
    } finally {
      setLoading(false)
    }
  }, [portfolio.targetAllocations])

  useEffect(() => {
    loadPricesAndAnalysis()
  }, [loadPricesAndAnalysis])

  useEffect(() => {
    loadSupportedAssets()
  }, []) // Only load once on mount

  const loadSupportedAssets = async () => {
    try {
      // Mock supported assets for demo
      const mockSupportedAssets = ['XLM', 'USDC', 'KALE', 'BTC', 'ETH']
      setSupportedAssets(mockSupportedAssets)
    } catch (error) {
      console.error('Failed to load supported assets:', error)
    }
  }


  const getDriftStatus = (drift: number) => {
    if (drift > portfolio.riskThreshold) {
      return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle, status: 'High Risk' }
    } else if (drift > portfolio.riskThreshold * 0.7) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: TrendingUp, status: 'Monitor' }
    } else {
      return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, status: 'On Track' }
    }
  }

  if (loading && !analysis) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading portfolio analysis...</span>
        </div>
      </div>
    )
  }

  const driftStatus = analysis ? getDriftStatus(analysis.drift) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{portfolio.name}</h2>
          <button
            onClick={loadPricesAndAnalysis}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">${analysis.totalValueUsd}</div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${driftStatus?.color}`}>
                {analysis.drift.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Portfolio Drift</div>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${driftStatus?.bg} ${driftStatus?.color}`}>
                {driftStatus && <driftStatus.icon className="h-4 w-4 mr-1" />}
                {driftStatus?.status}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current vs Target Allocations */}
      {analysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocations</h3>
          <div className="space-y-4">
            {Object.entries(analysis.targetAllocations).map(([asset, targetPercentage]) => {
              const currentPercentage = analysis.currentAllocations[asset] || 0
              const drift = analysis.driftByAsset[asset] || 0
              const assetPrice = prices.find(p => p.asset === asset)

              return (
                <div key={asset} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{asset}</span>
                      {assetPrice && (
                        <span className="text-sm text-gray-500">${assetPrice.price}</span>
                      )}
                    </div>
                    <div className={`text-sm font-medium ${
                      Math.abs(drift) > 2 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {drift > 0 ? '+' : ''}{drift.toFixed(1)}%
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-gray-500">Target:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${targetPercentage}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right">{targetPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-gray-500">Current:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            Math.abs(drift) > 2 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${currentPercentage}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right">{currentPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rebalancing Suggestions */}
      {analysis?.needsRebalancing && analysis.suggestedTrades.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rebalancing Suggestions</h3>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-600 font-medium">Action Required</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {analysis.suggestedTrades.map((trade, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Sell {parseFloat(trade.fromAmount).toFixed(4)} {trade.fromAsset}
                    </div>
                    <div className="text-sm text-gray-500">
                      Get ~{parseFloat(trade.expectedToAmount).toFixed(4)} {trade.toAsset}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Slippage</div>
                  <div className="font-medium">{trade.maxSlippage.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <div>Estimated total trades: {analysis.suggestedTrades.length}</div>
              <div>This will help reduce drift from {analysis.drift.toFixed(2)}% to ~1%</div>
            </div>
            {isConnected ? (
              <button
                onClick={() => {
                  if (!isRebalancing) {
                    setIsRebalancing(true)
                    setShowTradingModal(true)
                  }
                }}
                disabled={isRebalancing}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isRebalancing ? 'Processing...' : 'Execute Rebalancing'}
              </button>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Connect your wallet on the Wallet page to execute trades
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Rebalancing Needed */}
      {analysis && !analysis.needsRebalancing && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <h3 className="mt-2 text-lg font-semibold text-gray-900">Portfolio is Well Balanced</h3>
            <p className="mt-1 text-gray-500">
              Current drift of {analysis.drift.toFixed(2)}% is below your {portfolio.riskThreshold}% threshold.
              No rebalancing needed at this time.
            </p>
          </div>
        </div>
      )}

      {/* Quick Swap Section */}
      {isConnected && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Swap</h3>
          <QuickSwap
            userPublicKey={publicKey || ''}
            supportedAssets={supportedAssets}
          />
        </div>
      )}

      {/* Trading Modal */}
      {showTradingModal && analysis?.suggestedTrades && isConnected && (
        <TradingModal
          isOpen={showTradingModal}
          onClose={() => {
            setShowTradingModal(false)
            // Keep rebalancing disabled for a bit to prevent rapid clicking
            setTimeout(() => {
              setIsRebalancing(false)
            }, 1000)
            loadPricesAndAnalysis() // Refresh data after trading
          }}
          onComplete={() => {
            // Keep rebalancing disabled for a bit to prevent rapid clicking
            setTimeout(() => {
              setIsRebalancing(false)
            }, 1000)
          }}
          userPublicKey={publicKey || ''}
          portfolioId={portfolio.id}
          suggestedTrades={analysis.suggestedTrades}
          mode="rebalance"
        />
      )}
    </div>
  )
}