import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="text-2xl font-bold text-indigo-600">
            RebalanceX
          </div>
          <div className="space-x-4">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <main className="py-20 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Portfolio Rebalancing
            <span className="block text-indigo-600">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automate your crypto portfolio rebalancing on Stellar. Non-custodial, 
            secure, and designed for maximum returns with email verification and Google Sign-in.
          </p>
          <div className="space-x-4">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md text-lg font-medium inline-block"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md text-lg font-medium inline-block"
              >
                Start Rebalancing
              </Link>
            )}
            <a
              href="#features"
              className="text-indigo-600 hover:text-indigo-500 px-8 py-3 text-lg font-medium inline-block"
            >
              Learn More
            </a>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose RebalanceX?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built on Stellar with modern authentication and security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-3">Secure Authentication</h3>
              <p className="text-gray-600">
                Google Sign-in, email verification, and secure session management powered by Supabase.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-gray-600">
                Powered by Stellar network for instant, low-cost transactions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-3">Smart Rebalancing</h3>
              <p className="text-gray-600">
                AI-powered portfolio optimization and automated rebalancing (Coming in Phase 2).
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust RebalanceX with their portfolio management.
              Phase 1 includes secure authentication and wallet management.
            </p>
            {!user && (
              <Link
                to="/auth"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md text-lg font-medium inline-block"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}