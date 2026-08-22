import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { PageLoader } from './components/ui/Spinner';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import ProblemsPage from './pages/ProblemsPage';

// Protected route wrapper — redirects unauthenticated users to /signup first
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signup?redirect=${redirectUrl}`} replace />;
  }
  return children;
}

// Public route — redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/problems" element={<ProtectedRoute><ProblemsPage /></ProtectedRoute>} />
      <Route
        path="/room/:roomCode"
        element={
          <ProtectedRoute>
            <RoomProvider>
              <RoomPage />
            </RoomProvider>
          </ProtectedRoute>
        }
      />
      <Route path="/join/:roomCode" element={<ProtectedRoute><JoinRoomPage /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
