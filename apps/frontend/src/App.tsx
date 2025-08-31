import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useWalletStore } from './store/walletStore';
import WelcomePage from './pages/WelcomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WalletSetupPage from './pages/WalletSetupPage';

function App() {
  const { isAuthenticated, loadUser } = useAuthStore();
  const { isConnected, hasWallet } = useWalletStore();

  useEffect(() => {
    // Load user on app start if token exists
    loadUser();
  }, [loadUser]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : !hasWallet() || !isConnected ? (
            <>
              <Route path="/wallet-setup" element={<WalletSetupPage />} />
              <Route path="*" element={<Navigate to="/wallet-setup" replace />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
