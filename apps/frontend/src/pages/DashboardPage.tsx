import { useEffect } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const { publicKey, balances, loadBalances, isLoadingBalances, disconnect } = useWalletStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (publicKey) {
      loadBalances();
    }
  }, [publicKey, loadBalances]);

  const handleLogout = () => {
    disconnect();
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RebalanceX</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Wallet Info */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Wallet Information
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Public Key:</span>
                  <br />
                  <code className="mt-1 text-xs bg-gray-100 px-2 py-1 rounded">
                    {publicKey}
                  </code>
                </p>
              </div>
            </div>
          </div>

          {/* Balances */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Account Balances
                </h3>
                <button
                  onClick={loadBalances}
                  disabled={isLoadingBalances}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-1 rounded-md text-sm"
                >
                  {isLoadingBalances ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {balances.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">
                    {isLoadingBalances ? 'Loading balances...' : 'No balances found. Fund your wallet to get started.'}
                  </p>
                  {!isLoadingBalances && (
                    <p className="text-sm text-gray-400 mt-2">
                      For testnet: Visit{' '}
                      <a
                        href={`https://friendbot.stellar.org?addr=${publicKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        Stellar Friendbot
                      </a>
                      {' '}to fund your account
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="font-medium text-gray-900">
                        {balance.asset}
                      </span>
                      <span className="text-gray-600">
                        {parseFloat(balance.balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coming Soon */}
          <div className="bg-white overflow-hidden shadow rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Portfolio Management
              </h3>
              <div className="text-center py-8 text-gray-500">
                <p>Portfolio creation and management coming in Phase 2!</p>
                <p className="text-sm mt-2">This is just the wallet setup phase.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}