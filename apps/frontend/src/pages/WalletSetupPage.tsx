import { useState } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { FreighterService } from '../services/freighter';

export default function WalletSetupPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'import' | 'freighter'>('freighter');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { generateWallet, importWallet, connectFreighter } = useWalletStore();
  const { updateWallet, user } = useAuthStore();

  const handleFreighterConnect = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!FreighterService.isFreighterAvailable()) {
        throw new Error('Freighter extension not found. Please install Freighter wallet.');
      }

      const freighterWallet = await connectFreighter();
      if (freighterWallet) {
        await updateWallet(freighterWallet.publicKey);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const wallet = await generateWallet(password);
      await updateWallet(wallet.publicKey, JSON.stringify({ encrypted: true }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const wallet = await importWallet(secretKey, password);
      await updateWallet(wallet.publicKey, JSON.stringify({ encrypted: true }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set up your wallet
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome {user?.email}! Choose how you'd like to manage your Stellar wallet.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('freighter')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                activeTab === 'freighter'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Freighter
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                activeTab === 'generate'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                activeTab === 'import'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Import
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Freighter Tab */}
          {activeTab === 'freighter' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Connect your existing Freighter wallet for a seamless experience.
                </p>
                <button
                  onClick={handleFreighterConnect}
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Connecting...' : 'Connect Freighter Wallet'}
                </button>
              </div>
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <form onSubmit={handleGenerateWallet} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a new Stellar wallet. Your keys will be encrypted and stored securely.
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Wallet Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Choose a strong password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Confirm your password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || password !== confirmPassword || !password}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : 'Generate Wallet'}
              </button>
            </form>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <form onSubmit={handleImportWallet} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Import an existing Stellar wallet using your secret key.
                </p>
              </div>
              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <input
                  id="secretKey"
                  type="password"
                  required
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="S..."
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Wallet Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Choose a strong password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Confirm your password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || password !== confirmPassword || !password || !secretKey}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Importing...' : 'Import Wallet'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}