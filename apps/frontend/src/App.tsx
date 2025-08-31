import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MinimalWelcome from './pages/MinimalWelcome';
import SimpleAuthPage from './pages/SimpleAuthPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import WalletSetupPage from './pages/WalletSetupPage';

function AppRoutes() {
  const { user, loading } = useAuth();

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
            <Route path="/" element={<MinimalWelcome />} />
            <Route path="/auth" element={<SimpleAuthPage />} />
            <Route path="/login" element={<SimpleAuthPage />} />
            <Route path="/signup" element={<SimpleAuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          // Authenticated user - wallet is optional
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wallet-setup" element={<WalletSetupPage />} />
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
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
