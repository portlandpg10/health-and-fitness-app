import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import WeightTracker from './pages/WeightTracker';
import WorkoutCreator from './pages/WorkoutCreator';
import WorkoutDisplay from './pages/WorkoutDisplay';
import LiftsDisplay from './pages/LiftsDisplay';
import WorkoutHistory from './pages/WorkoutHistory';
import WorkoutHistoryDetail from './pages/WorkoutHistoryDetail';
import CurrentLifts from './pages/CurrentLifts';

function ProtectedRoute({ children }) {
  const { authenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/workout/:id/display" element={<ProtectedRoute><WorkoutDisplay tv /></ProtectedRoute>} />
      <Route path="/lifts/display" element={<ProtectedRoute><LiftsDisplay tv /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/weight" replace />} />
        <Route path="weight" element={<WeightTracker />} />
        <Route path="workouts" element={<WorkoutCreator />} />
        <Route path="workout/:id" element={<WorkoutDisplay />} />
        <Route path="lifts" element={<CurrentLifts />} />
        <Route path="history" element={<WorkoutHistory />} />
        <Route path="history/:id" element={<WorkoutHistoryDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
