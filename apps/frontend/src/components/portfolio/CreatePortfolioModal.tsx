/**
 * Create Portfolio Modal
 * Form for creating new portfolios with target allocations
 */

import React, { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

interface CreatePortfolioModalProps {
  onClose: () => void
  onSubmit: (data: {
    name: string
    targetAllocations: Record<string, number>
    riskThreshold: number
    autoRebalance: boolean
    maxAutoAmount: string
    minTradeAmount: string
    maxSlippage: number
    rebalanceFrequency: string
  }) => void
}

const COMMON_ASSETS = ['XLM', 'USDC', 'KALE', 'BTC', 'ETH']
const REBALANCE_FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

export function CreatePortfolioModal({ onClose, onSubmit }: CreatePortfolioModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    riskThreshold: 5.0,
    autoRebalance: false,
    maxAutoAmount: '1000',
    minTradeAmount: '10',
    maxSlippage: 1.0,
    rebalanceFrequency: 'weekly'
  })

  const [allocations, setAllocations] = useState<Array<{ asset: string; percentage: number }>>([
    { asset: 'USDC', percentage: 50 },
    { asset: 'XLM', percentage: 30 },
    { asset: 'KALE', percentage: 20 }
  ])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Portfolio name is required'
    }

    // Validate allocations
    const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      newErrors.allocations = 'Allocations must sum to exactly 100%'
    }

    // Check for duplicate assets
    const assets = allocations.map(a => a.asset)
    const uniqueAssets = new Set(assets)
    if (assets.length !== uniqueAssets.size) {
      newErrors.allocations = 'Cannot have duplicate assets'
    }

    // Check for empty assets
    const hasEmptyAsset = allocations.some(a => !a.asset.trim())
    if (hasEmptyAsset) {
      newErrors.allocations = 'All assets must be specified'
    }

    // Validate risk threshold
    if (formData.riskThreshold < 0.1 || formData.riskThreshold > 50) {
      newErrors.riskThreshold = 'Risk threshold must be between 0.1% and 50%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // Convert allocations array to object
    const targetAllocations: Record<string, number> = {}
    allocations.forEach(alloc => {
      targetAllocations[alloc.asset.toUpperCase()] = alloc.percentage
    })

    onSubmit({
      ...formData,
      targetAllocations
    })
  }

  const addAllocation = () => {
    setAllocations(prev => [...prev, { asset: '', percentage: 0 }])
  }

  const removeAllocation = (index: number) => {
    if (allocations.length > 1) {
      setAllocations(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateAllocation = (index: number, field: 'asset' | 'percentage', value: string | number) => {
    setAllocations(prev => prev.map((alloc, i) => 
      i === index ? { ...alloc, [field]: value } : alloc
    ))
  }

  const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Portfolio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Portfolio Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Conservative Growth, High Risk/Reward"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Target Allocations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Target Allocations
              </label>
              <span className={`text-sm font-medium ${
                Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
              }`}>
                Total: {totalPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="space-y-3">
              {allocations.map((allocation, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={allocation.asset}
                    onChange={(e) => updateAllocation(index, 'asset', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Asset</option>
                    {COMMON_ASSETS.map(asset => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                  
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={allocation.percentage}
                      onChange={(e) => updateAllocation(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAllocation(index)}
                    disabled={allocations.length <= 1}
                    className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addAllocation}
              className="mt-3 inline-flex items-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Asset
            </button>

            {errors.allocations && <p className="mt-1 text-sm text-red-600">{errors.allocations}</p>}
          </div>

          {/* Risk Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Threshold (%)
              </label>
              <input
                type="number"
                value={formData.riskThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, riskThreshold: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="0.1"
                max="50"
                step="0.1"
              />
              <p className="mt-1 text-xs text-gray-500">Rebalance when drift exceeds this threshold</p>
              {errors.riskThreshold && <p className="mt-1 text-sm text-red-600">{errors.riskThreshold}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Slippage (%)
              </label>
              <input
                type="number"
                value={formData.maxSlippage}
                onChange={(e) => setFormData(prev => ({ ...prev, maxSlippage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="0.1"
                max="10"
                step="0.1"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum acceptable slippage for trades</p>
            </div>
          </div>

          {/* Auto-rebalancing Settings */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="autoRebalance"
                checked={formData.autoRebalance}
                onChange={(e) => setFormData(prev => ({ ...prev, autoRebalance: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRebalance" className="ml-2 text-sm font-medium text-gray-700">
                Enable automatic rebalancing
              </label>
            </div>

            {formData.autoRebalance && (
              <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Auto Amount ($)
                    </label>
                    <input
                      type="text"
                      value={formData.maxAutoAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxAutoAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="1000"
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximum USD value for auto-trades</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Trade Amount ($)
                    </label>
                    <input
                      type="text"
                      value={formData.minTradeAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, minTradeAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="10"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum trade size in USD</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rebalance Frequency
                  </label>
                  <select
                    value={formData.rebalanceFrequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, rebalanceFrequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {REBALANCE_FREQUENCIES.map(freq => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Math.abs(totalPercentage - 100) > 0.01}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Create Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}