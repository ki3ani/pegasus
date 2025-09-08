/**
 * Portfolio Card Component
 * Displays portfolio overview in the portfolio list
 */

import { Settings, Trash2, Clock } from 'lucide-react'
import type { Portfolio } from '../../services/portfolioService'

interface PortfolioCardProps {
  portfolio: Portfolio
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export function PortfolioCard({ portfolio, isSelected, onClick, onDelete }: PortfolioCardProps) {
  const allocations = portfolio.targetAllocations as Record<string, number>
  const topAssets = Object.entries(allocations)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`)) {
      onDelete()
    }
  }


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected 
          ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{portfolio.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {portfolio.autoRebalance && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                <Clock className="h-3 w-3 mr-1" />
                Auto
              </span>
            )}
            <span className="text-xs text-gray-500">
              {portfolio.rebalanceFrequency}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Open settings modal
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Portfolio settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete portfolio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Target Allocations */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Target Allocation</div>
        <div className="flex flex-wrap gap-1">
          {topAssets.map(([asset, percentage]) => (
            <span
              key={asset}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
            >
              {asset} {percentage}%
            </span>
          ))}
          {Object.keys(allocations).length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
              +{Object.keys(allocations).length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Risk & Status Info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-500">Risk Threshold</div>
          <div className="font-medium text-gray-900">{portfolio.riskThreshold}%</div>
        </div>
        <div>
          <div className="text-gray-500">Max Slippage</div>
          <div className="font-medium text-gray-900">{portfolio.maxSlippage}%</div>
        </div>
      </div>

      {/* Last Rebalance */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Last rebalanced</span>
          <span className="text-gray-700">{formatDate(portfolio.lastRebalance)}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status</span>
          <div className="flex items-center gap-1">
            {portfolio.isActive ? (
              <>
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-green-600">Active</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-500">Inactive</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}