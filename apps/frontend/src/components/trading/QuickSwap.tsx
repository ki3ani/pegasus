import React, { useState, useEffect, useCallback } from 'react'
import type { TradeInstruction } from '../../services/tradingService'
import { TradingModal } from './TradingModal'

interface QuickSwapProps {
  userPublicKey: string
  supportedAssets: string[]
}

export const QuickSwap: React.FC<QuickSwapProps> = ({ userPublicKey, supportedAssets }) => {
  const [fromAsset, setFromAsset] = useState<string>('XLM')
  const [toAsset, setToAsset] = useState<string>('USDC')
  const [fromAmount, setFromAmount] = useState<string>('')
  const [expectedAmount, setExpectedAmount] = useState<string>('')
  const [maxSlippage, setMaxSlippage] = useState<number>(2.0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [marketPrice, setMarketPrice] = useState<string>('')
  const [showTradingModal, setShowTradingModal] = useState(false)
  const [tradeInstruction, setTradeInstruction] = useState<TradeInstruction | null>(null)

  const calculateExpectedAmount = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return

    setIsCalculating(true)
    try {
      // Mock exchange rates for demo
      const mockRates: Record<string, Record<string, string>> = {
        'XLM': { 'USDC': '0.1247', 'KALE': '27.7111', 'BTC': '0.000002885', 'ETH': '0.000047' },
        'USDC': { 'XLM': '8.0192', 'KALE': '222.2222', 'BTC': '0.000023', 'ETH': '0.000377' },
        'KALE': { 'XLM': '0.0361', 'USDC': '0.0045', 'BTC': '0.0000001', 'ETH': '0.0000017' },
        'BTC': { 'XLM': '346,663', 'USDC': '43,250', 'KALE': '9,611,111', 'ETH': '16.32' },
        'ETH': { 'XLM': '21,243', 'USDC': '2,645', 'KALE': '588,444', 'BTC': '0.061' }
      }

      // Simulate network delay for realistic demo
      await new Promise(resolve => setTimeout(resolve, 800))

      const rate = mockRates[fromAsset]?.[toAsset] || '0'
      const expectedValue = parseFloat(fromAmount) * parseFloat(rate)
      
      setMarketPrice(rate)
      setExpectedAmount(expectedValue.toFixed(7))
    } catch (error) {
      console.error('Failed to calculate expected amount:', error)
      setMarketPrice('N/A')
      setExpectedAmount('0')
    } finally {
      setIsCalculating(false)
    }
  }, [fromAmount, fromAsset, toAsset])

  // Calculate expected amount when inputs change
  useEffect(() => {
    if (fromAmount && fromAsset && toAsset && fromAsset !== toAsset) {
      calculateExpectedAmount()
    } else {
      setExpectedAmount('')
      setMarketPrice('')
    }
  }, [fromAmount, fromAsset, toAsset, calculateExpectedAmount])

  const handleSwapAssets = () => {
    const tempAsset = fromAsset
    setFromAsset(toAsset)
    setToAsset(tempAsset)
    setFromAmount('')
    setExpectedAmount('')
  }

  const handleExecuteSwap = () => {
    if (!fromAmount || !expectedAmount) return

    const trade: TradeInstruction = {
      fromAsset,
      toAsset,
      fromAmount,
      expectedToAmount: expectedAmount,
      maxSlippage,
      priority: 1
    }

    setTradeInstruction(trade)
    setShowTradingModal(true)
  }

  const isValidSwap = () => {
    return (
      fromAmount &&
      parseFloat(fromAmount) > 0 &&
      expectedAmount &&
      parseFloat(expectedAmount) > 0 &&
      fromAsset !== toAsset &&
      marketPrice !== 'N/A'
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Swap</h3>
      
      <div className="space-y-4">
        {/* From Asset */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">From</label>
          <div className="flex space-x-2">
            <select
              value={fromAsset}
              onChange={(e) => setFromAsset(e.target.value)}
              className="flex-shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {supportedAssets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.0000001"
              min="0"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapAssets}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            title="Swap assets"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Asset */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">To</label>
          <div className="flex space-x-2">
            <select
              value={toAsset}
              onChange={(e) => setToAsset(e.target.value)}
              className="flex-shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {supportedAssets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.0"
              value={expectedAmount}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>
        </div>

        {/* Market Info */}
        {marketPrice && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Market Rate:</span>
              <span className="font-medium">1 {fromAsset} = {marketPrice} {toAsset}</span>
            </div>
            {isCalculating && (
              <div className="text-center mt-2">
                <span className="text-xs text-blue-600">Calculating...</span>
              </div>
            )}
          </div>
        )}

        {/* Slippage Tolerance */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Max Slippage: {maxSlippage}%
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={maxSlippage}
            onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1%</span>
            <span>10%</span>
          </div>
        </div>

        {/* Execute Button */}
        <button
          onClick={handleExecuteSwap}
          disabled={!isValidSwap() || isCalculating}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isValidSwap() && !isCalculating
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCalculating ? 'Calculating...' : 'Execute Swap'}
        </button>
      </div>

      {/* Trading Modal */}
      {showTradingModal && tradeInstruction && (
        <TradingModal
          isOpen={showTradingModal}
          onClose={() => {
            setShowTradingModal(false)
            setTradeInstruction(null)
          }}
          userPublicKey={userPublicKey}
          suggestedTrades={[tradeInstruction]}
          mode="single"
        />
      )}
    </div>
  )
}