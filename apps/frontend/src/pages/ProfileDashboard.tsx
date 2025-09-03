import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWalletStore } from '../store/walletStore'
import Navigation from '../components/Navigation'
import WalletStatus from '../components/WalletStatus'
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function ProfileDashboard() {
  const { profile, updateProfile, loading, error } = useAuth()
  const { publicKey, balance, assets, refreshBalance, isLoading, isConnected } = useWalletStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || ''
  })

  useEffect(() => {
    if (publicKey && isConnected) {
      refreshBalance()
    }
  }, [publicKey, isConnected, refreshBalance])

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        email: profile.email || ''
      })
    }
  }, [profile])

  // Remove handleSignOut - now handled by Navigation component

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { error } = await updateProfile({
      full_name: editForm.full_name.trim() || null
    })
    
    if (!error) {
      setIsEditing(false)
    }
  }

  const handleEditCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      email: profile?.email || ''
    })
    setIsEditing(false)
  }

  const totalBalance = balance ? parseFloat(balance) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="mt-1 text-gray-600">
            Manage your portfolio and track your investments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2" />
                Profile
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-indigo-600 hover:text-indigo-500 p-1"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span>{error.message || 'An error occurred'}</span>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{profile?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{profile?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Member since</label>
                  <p className="text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Status */}
          <WalletStatus />

          {/* Portfolio Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Portfolio
              </h3>
              {isConnected && (
                <button
                  onClick={refreshBalance}
                  disabled={isLoading}
                  className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">
                      {totalBalance.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">XLM</span>
                  </div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                </div>

                <div className="space-y-2">
                  {!balance && assets.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        {isLoading ? 'Loading balances...' : 'No balances found'}
                      </p>
                      {!isLoading && publicKey && (
                        <a
                          href={`https://friendbot.stellar.org?addr=${publicKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 text-sm underline"
                        >
                          Fund testnet account
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      {balance && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-medium text-gray-900">XLM</span>
                          <span className="text-gray-600">{parseFloat(balance).toLocaleString()}</span>
                        </div>
                      )}
                      {assets
                        .map((asset, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="font-medium text-gray-900">{asset.asset || 'Unknown'}</span>
                          <span className="text-gray-600">{parseFloat(asset.balance).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Connect a wallet to view your portfolio</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => window.location.href = '/wallet-setup'}
            >
              <CurrencyDollarIcon className="h-5 w-5 text-indigo-600" />
              <span>Manage Wallet</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ChartBarIcon className="h-5 w-5 text-green-600" />
              <span>View Portfolio</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <span>Transaction History</span>
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🚀 Coming in Phase 2
          </h3>
          <p className="text-gray-600 mb-4">
            Portfolio rebalancing, automated strategies, and advanced analytics are coming soon!
          </p>
          <div className="flex flex-wrap gap-2">
            {['Automated Rebalancing', 'DCA Strategies', 'Risk Analytics', 'Yield Optimization'].map((feature) => (
              <span key={feature} className="px-3 py-1 bg-white text-indigo-700 rounded-full text-sm font-medium">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}