import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWalletStore } from './store/walletStore';
import WelcomePage from './pages/WelcomePage';
import SimpleAuthPage from './pages/SimpleAuthPage';
import ProfileDashboard from './pages/ProfileDashboard';
import WalletSetupPage from './pages/WalletSetupPage';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { hasWallet, isConnected } = useWalletStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {!user ? (
          // Unauthenticated routes
          <>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/auth" element={<SimpleAuthPage />} />
            <Route path="/login" element={<SimpleAuthPage />} />
            <Route path="/signup" element={<SimpleAuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : !hasWallet() || !isConnected ? (
          // Authenticated but no wallet
          <>
            <Route path="/wallet-setup" element={<WalletSetupPage />} />
            <Route path="/dashboard" element={<Navigate to="/wallet-setup" replace />} />
            <Route path="/" element={<Navigate to="/wallet-setup" replace />} />
            <Route path="*" element={<Navigate to="/wallet-setup" replace />} />
          </>
        ) : (
          // Authenticated with wallet
          <>
            <Route path="/dashboard" element={<ProfileDashboard />} />
            <Route path="/profile" element={<ProfileDashboard />} />
            <Route path="/wallet-setup" element={<WalletSetupPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
