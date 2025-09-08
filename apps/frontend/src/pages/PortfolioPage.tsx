/**
 * Portfolio Management Page
 * Main interface for creating and managing portfolios
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
import { Navigation } from '../components/Navigation'
import type { Portfolio } from '../services/portfolioService'
import { CreatePortfolioModal } from '../components/portfolio/CreatePortfolioModal'
import { PortfolioCard } from '../components/portfolio/PortfolioCard'
import { PortfolioAnalysis } from '../components/portfolio/PortfolioAnalysis'

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true)
      
      // Mock portfolio data for demo
      const mockPortfolios: Portfolio[] = [
        {
          id: 'demo_portfolio_1',
          userId: 'demo_user',
          name: 'Balanced Growth Portfolio',
          targetAllocations: {
            'XLM': 40.0,
            'USDC': 40.0,
            'KALE': 20.0
          },
          riskThreshold: 15.0,
          autoRebalance: true,
          maxAutoAmount: '500.00',
          minTradeAmount: '10.00',
          maxSlippage: 3.0,
          rebalanceFrequency: 'weekly',
          isActive: true,
          kaleStakingEnabled: true,
          lastRebalance: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo_portfolio_2',
          userId: 'demo_user',
          name: 'Conservative Stable',
          targetAllocations: {
            'USDC': 70.0,
            'XLM': 30.0
          },
          riskThreshold: 5.0,
          autoRebalance: false,
          maxAutoAmount: '200.00',
          minTradeAmount: '5.00',
          maxSlippage: 1.5,
          rebalanceFrequency: 'monthly',
          isActive: true,
          kaleStakingEnabled: false,
          lastRebalance: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
          updatedAt: new Date().toISOString()
        }
      ]
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPortfolios(mockPortfolios)
      
      // Auto-select first portfolio if none selected
      if (mockPortfolios.length > 0 && !selectedPortfolioId) {
        setSelectedPortfolioId(mockPortfolios[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolios')
    } finally {
      setLoading(false)
    }
  }, [selectedPortfolioId])

  useEffect(() => {
    loadPortfolios()
  }, [loadPortfolios])

  const handleCreatePortfolio = async (portfolioData: {
    name: string;
    targetAllocations: Record<string, number>;
    riskThreshold?: number;
    autoRebalance?: boolean;
    maxAutoAmount?: string;
    minTradeAmount?: string;
    maxSlippage?: number;
    rebalanceFrequency?: string;
  }) => {
    try {
      // Mock portfolio creation for demo
      const newPortfolio: Portfolio = {
        id: `demo_portfolio_${Date.now()}`,
        userId: 'demo_user',
        name: portfolioData.name,
        targetAllocations: portfolioData.targetAllocations,
        riskThreshold: portfolioData.riskThreshold || 10.0,
        autoRebalance: portfolioData.autoRebalance || false,
        maxAutoAmount: portfolioData.maxAutoAmount || '100.00',
        minTradeAmount: portfolioData.minTradeAmount || '1.00',
        maxSlippage: portfolioData.maxSlippage || 2.0,
        rebalanceFrequency: portfolioData.rebalanceFrequency || 'weekly',
        isActive: true,
        kaleStakingEnabled: Object.keys(portfolioData.targetAllocations).includes('KALE'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setPortfolios(prev => [...prev, newPortfolio])
      setSelectedPortfolioId(newPortfolio.id)
      setShowCreateModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio')
    }
  }

  const handleDeletePortfolio = async (portfolioId: string) => {
    try {
      // Mock portfolio deletion for demo
      console.log(`🗑️ Demo: Deleting portfolio ${portfolioId}`)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setPortfolios(prev => prev.filter(p => p.id !== portfolioId))
      
      // Select another portfolio if current was deleted
      if (selectedPortfolioId === portfolioId) {
        const remaining = portfolios.filter(p => p.id !== portfolioId)
        setSelectedPortfolioId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio')
    }
  }

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="ml-4 text-gray-600">Loading portfolios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
              <p className="mt-2 text-gray-600">
                Create and manage your automated rebalancing portfolios
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Portfolio
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {portfolios.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No portfolios yet</h3>
            <p className="mt-1 text-gray-500">Get started by creating your first portfolio</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Portfolio
              </button>
            </div>
          </div>
        ) : (
          /* Portfolio Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Portfolios</h2>
              <div className="space-y-4">
                {portfolios.map((portfolio) => (
                  <PortfolioCard
                    key={portfolio.id}
                    portfolio={portfolio}
                    isSelected={portfolio.id === selectedPortfolioId}
                    onClick={() => setSelectedPortfolioId(portfolio.id)}
                    onDelete={() => handleDeletePortfolio(portfolio.id)}
                  />
                ))}
              </div>
            </div>

            {/* Portfolio Details & Analysis */}
            <div className="lg:col-span-2">
              {selectedPortfolio ? (
                <PortfolioAnalysis
                  portfolio={selectedPortfolio}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Select a portfolio</h3>
                  <p className="mt-1 text-gray-500">Choose a portfolio to view analysis and manage settings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePortfolio}
        />
      )}
    </div>
  )
}