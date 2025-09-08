/**
 * KALE Integration Component
 * Comprehensive KALE farming, rewards, and staking interface
 * This is the showcase component for the hackathon
 */

import { useState, useEffect, useCallback } from 'react'
import { Leaf, TrendingUp, Zap, Award, Info, AlertCircle, CheckCircle, Loader } from 'lucide-react'

interface KaleStatus {
  hasTrustline: boolean
  balance: string
  farmingStatus: {
    isActive: boolean
    currentBlock: number
    nextBlockIn: number
    stakedAmount: string
    pendingRewards: string
  }
  stakingInfo: {
    totalStaked: string
    apy: number
    earnings: string
    minimumStake: string
  }
  rewardHistory: Array<{
    id: string
    amount: string
    type: 'rebalance' | 'auto_rebalance' | 'farming' | 'staking_reward'
    timestamp: string
    status: 'pending' | 'completed'
  }>
}

export function KaleIntegration({ userPublicKey }: { userPublicKey?: string }) {
  const [kaleStatus, setKaleStatus] = useState<KaleStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'farming' | 'staking' | 'rewards'>('overview')
  const [farmingAction, setFarmingAction] = useState<'plant' | 'work' | 'harvest' | null>(null)
  const [stakeAmount, setStakeAmount] = useState('')
  const [farmingProgress, setFarmingProgress] = useState({
    planted: false,
    worked: false,
    harvested: false,
    currentHash: '',
    zeros: 0
  })

  const loadKaleStatus = useCallback(async () => {
    if (!userPublicKey) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Demo data for hackathon presentation
      const mockStatus: KaleStatus = {
        hasTrustline: true,
        balance: '127.5430000',
        farmingStatus: {
          isActive: true,
          currentBlock: 14827,
          nextBlockIn: 45,
          stakedAmount: '50.0000000',
          pendingRewards: '12.3450000'
        },
        stakingInfo: {
          totalStaked: '200.0000000',
          apy: 12.0,
          earnings: '24.1800000',
          minimumStake: '100.0000000'
        },
        rewardHistory: [
          {
            id: '1',
            amount: '10.0000000',
            type: 'rebalance',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: '2',
            amount: '5.0000000',
            type: 'auto_rebalance',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: '3',
            amount: '8.7500000',
            type: 'farming',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: '4',
            amount: '2.3450000',
            type: 'staking_reward',
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          }
        ]
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      setKaleStatus(mockStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KALE status')
    } finally {
      setLoading(false)
    }
  }, [userPublicKey])

  useEffect(() => {
    if (userPublicKey) {
      loadKaleStatus()
    }
  }, [userPublicKey, loadKaleStatus])

  const setupTrustline = async () => {
    try {
      setLoading(true)
      // Simulate trustline setup
      await new Promise(resolve => setTimeout(resolve, 2000))
      await loadKaleStatus() // This will now set hasTrustline to true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup trustline')
    } finally {
      setLoading(false)
    }
  }

  const startFarming = async (action: 'plant' | 'work' | 'harvest') => {
    try {
      setFarmingAction(action)
      setLoading(true)
      
      const response = await fetch(`/api/kale/farm/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userPublicKey,
          stakeAmount: action === 'plant' ? stakeAmount || '0' : undefined
        })
      })
      const data = await response.json()
      
      if (data.success) {
        if (action === 'plant') {
          setFarmingProgress(prev => ({ ...prev, planted: true }))
        } else if (action === 'work') {
          setFarmingProgress(prev => ({ 
            ...prev, 
            worked: true, 
            currentHash: data.hash,
            zeros: data.zeros 
          }))
        } else if (action === 'harvest') {
          setFarmingProgress(prev => ({ ...prev, harvested: true }))
          await loadKaleStatus() // Refresh to show new balance
        }
      } else {
        setError(data.error || `Failed to ${action}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setFarmingAction(null)
      setLoading(false)
    }
  }

  const stakeKale = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kale/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userPublicKey,
          amount: stakeAmount
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setStakeAmount('')
        await loadKaleStatus()
      } else {
        setError(data.error || 'Failed to stake KALE')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake KALE')
    } finally {
      setLoading(false)
    }
  }

  if (!userPublicKey) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Leaf className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your Freighter wallet to start farming KALE tokens</p>
      </div>
    )
  }

  if (loading && !kaleStatus) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Loader className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-gray-600">Loading KALE status...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Leaf className="h-8 w-8 mr-3" />
              <h2 className="text-2xl font-bold">KALE Farming</h2>
            </div>
            <p className="text-green-100">Farm KALE tokens through proof-of-work and earn rewards</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">🥬</div>
            <div className="text-lg font-semibold">
              {kaleStatus?.balance || '0.0000000'} KALE
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
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

      {/* Trustline Setup */}
      {kaleStatus && !kaleStatus.hasTrustline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="font-semibold text-yellow-800">Setup Required</h3>
              </div>
              <p className="text-yellow-700">
                You need to establish a trustline to KALE before you can start farming.
              </p>
            </div>
            <button
              onClick={setupTrustline}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Setup KALE Trustline'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      {kaleStatus?.hasTrustline && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'farming', 'staking', 'rewards'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'overview' | 'farming' | 'staking' | 'rewards')}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {kaleStatus?.hasTrustline && (
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Leaf className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">KALE Balance</p>
                    <p className="text-lg font-semibold">{kaleStatus.balance}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Staked</p>
                    <p className="text-lg font-semibold">{kaleStatus.stakingInfo.totalStaked}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">APY</p>
                    <p className="text-lg font-semibold">{kaleStatus.stakingInfo.apy}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Farming</p>
                    <p className="text-lg font-semibold">
                      {kaleStatus.farmingStatus.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Farming Tab */}
          {activeTab === 'farming' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">KALE Farming Process</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-blue-800 text-sm">
                    <strong>How it works:</strong> Plant (stake) → Work (proof-of-work) → Harvest (claim rewards).
                    Only 500 KALE can be farmed per minute across the entire network!
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Step 1: Plant */}
                <div className={`border rounded-lg p-4 ${farmingProgress.planted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${farmingProgress.planted ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                        {farmingProgress.planted ? <CheckCircle className="h-5 w-5" /> : '1'}
                      </div>
                      <h4 className="ml-3 font-semibold">Plant (Stake KALE)</h4>
                    </div>
                    {!farmingProgress.planted && (
                      <button
                        onClick={() => startFarming('plant')}
                        disabled={loading || farmingAction === 'plant'}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {farmingAction === 'plant' ? 'Planting...' : 'Plant'}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    Stake KALE to participate in farming. Higher stakes = higher rewards.
                  </p>
                  {!farmingProgress.planted && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder="0.0000000"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        min="0"
                        step="0.0000001"
                      />
                      <span className="text-gray-500">KALE</span>
                    </div>
                  )}
                </div>

                {/* Step 2: Work */}
                <div className={`border rounded-lg p-4 ${farmingProgress.worked ? 'bg-green-50 border-green-200' : farmingProgress.planted ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        farmingProgress.worked ? 'bg-green-600 text-white' : 
                        farmingProgress.planted ? 'bg-blue-600 text-white' : 'bg-gray-300'
                      }`}>
                        {farmingProgress.worked ? <CheckCircle className="h-5 w-5" /> : '2'}
                      </div>
                      <h4 className="ml-3 font-semibold">Work (Proof-of-Work)</h4>
                    </div>
                    {farmingProgress.planted && !farmingProgress.worked && (
                      <button
                        onClick={() => startFarming('work')}
                        disabled={loading || farmingAction === 'work'}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {farmingAction === 'work' ? 'Working...' : 'Start Work'}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">
                    Generate hash with maximum prefix zeros. More zeros = higher rewards.
                  </p>
                  {farmingProgress.currentHash && (
                    <div className="mt-3 p-3 bg-gray-100 rounded">
                      <div className="text-sm">
                        <strong>Hash:</strong> <code className="text-xs">{farmingProgress.currentHash}</code>
                      </div>
                      <div className="text-sm mt-1">
                        <strong>Prefix Zeros:</strong> {farmingProgress.zeros}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Harvest */}
                <div className={`border rounded-lg p-4 ${farmingProgress.harvested ? 'bg-green-50 border-green-200' : farmingProgress.worked ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        farmingProgress.harvested ? 'bg-green-600 text-white' : 
                        farmingProgress.worked ? 'bg-purple-600 text-white' : 'bg-gray-300'
                      }`}>
                        {farmingProgress.harvested ? <CheckCircle className="h-5 w-5" /> : '3'}
                      </div>
                      <h4 className="ml-3 font-semibold">Harvest (Claim Rewards)</h4>
                    </div>
                    {farmingProgress.worked && !farmingProgress.harvested && (
                      <button
                        onClick={() => startFarming('harvest')}
                        disabled={loading || farmingAction === 'harvest'}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        {farmingAction === 'harvest' ? 'Harvesting...' : 'Harvest'}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">
                    Claim your share of the block reward based on your contribution.
                  </p>
                  {kaleStatus.farmingStatus.pendingRewards && parseFloat(kaleStatus.farmingStatus.pendingRewards) > 0 && (
                    <div className="mt-3 p-3 bg-purple-100 rounded">
                      <div className="text-purple-800 font-semibold">
                        Pending Rewards: {kaleStatus.farmingStatus.pendingRewards} KALE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Staking Tab */}
          {activeTab === 'staking' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">KALE Staking</h3>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <div className="font-semibold text-purple-800">
                      {kaleStatus.stakingInfo.apy}% APY
                    </div>
                    <div className="text-purple-700 text-sm">
                      Minimum stake: {kaleStatus.stakingInfo.minimumStake} KALE
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Stake KALE</h4>
                  <div className="space-y-3">
                    <input
                      type="number"
                      placeholder="Amount to stake"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      min="0"
                      step="0.0000001"
                    />
                    <button
                      onClick={stakeKale}
                      disabled={loading || !stakeAmount || parseFloat(stakeAmount) < parseFloat(kaleStatus.stakingInfo.minimumStake)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Staking...' : 'Stake KALE'}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Your Staking Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Staked:</span>
                      <span className="font-semibold">{kaleStatus.stakingInfo.totalStaked} KALE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Earnings:</span>
                      <span className="font-semibold text-green-600">+{kaleStatus.stakingInfo.earnings} KALE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">APY:</span>
                      <span className="font-semibold">{kaleStatus.stakingInfo.apy}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Reward History</h3>
              
              <div className="space-y-3">
                {kaleStatus.rewardHistory.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        reward.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'
                      }`} />
                      <div>
                        <div className="font-semibold">+{reward.amount} KALE</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {reward.type.replace('_', ' ')} • {new Date(reward.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      reward.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {reward.status}
                    </div>
                  </div>
                ))}
                
                {kaleStatus.rewardHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No rewards yet. Start farming or rebalancing to earn KALE!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}