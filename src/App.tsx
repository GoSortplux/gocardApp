import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { SchoolManagement } from './pages/SchoolManagement';
import { UserManagement } from './pages/UserManagement';
import { StudentManagement } from './pages/StudentManagement';
import type { JSX } from 'react';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: JSX.Element; roles: string[] }) => {
  const { user, isLoading } = useAuth();
  console.log('ProtectedRoute - user:', user, 'isLoading:', isLoading);
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['school_admin', 'admin', 'superadmin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schools"
            element={
              <ProtectedRoute roles={['superadmin', 'super_admin']}>
                <SchoolManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['superadmin', 'super_admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={['school_admin', 'admin', 'superadmin', 'super_admin']}>
                <StudentManagement />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);