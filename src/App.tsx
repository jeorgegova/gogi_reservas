import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';

import DashboardLayout from './components/layout/DashboardLayout';
import Calendario from './pages/Calendario';
import NewReservationPage from './pages/NewReservation';
import MyReservationsPage from './pages/MyReservations';
import AdminReservationsPage from './pages/admin/AdminReservations';
import AdminAreasPage from './pages/admin/AdminAreas';
import AdminUsersPage from './pages/admin/AdminUsers';
import AdminSubscriptionPage from './pages/admin/AdminSubscription';
import SuperAdminOrganizations from './pages/super-admin/Organizations';
import SuperAdminSubscriptionPlans from './pages/super-admin/SubscriptionPlans';
import SuperAdminSubscriptionPayments from './pages/super-admin/SubscriptionPayments';
import ProfilePage from './pages/Profile';
import MaintenancePage from './pages/Maintenance';
import PaymentMockPage from './pages/PaymentMock';
import Bonificaciones from './pages/Bonificaciones';
import AdminBonificaciones from './pages/admin/Bonificaciones';
import VerifyEmail from './pages/VerifyEmail';

const OrganizationHome = () => {
  const { profile, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  
  if (profile) {
    return (
      <DashboardLayout>
        <Calendario />
      </DashboardLayout>
    );
  }
  
  return <LoginPage />;
};

const PrivateRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!profile) return <Navigate to="/" />; // Redirect to root for login
  if (adminOnly && profile.role !== 'admin' && profile.role !== 'super_admin') return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!profile || profile.role !== 'super_admin') return <Navigate to="/" />; // Redirect to root if not super_admin

  return <>{children}</>;
};

// Componente que redirige al último slug usado o a super-admin
const RootLoader = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const [shouldShowLogin, setShouldShowLogin] = useState(false);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Solo procesar una vez para evitar bucles
    if (hasProcessed.current) return;

    if (!loading) {
      hasProcessed.current = true;
      if (profile) {
        // Usuario autenticado
        if (profile.role === 'super_admin') {
          navigate('/super-admin/organizations', { replace: true });
        } else {
          // Redirigir al slug de la organización si está disponible
          const targetSlug = profile.organization_slug;
          if (targetSlug) {
            navigate(`/${targetSlug}`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        // Usuario no autenticado - ir a login
        const lastSlug = localStorage.getItem('lastOrganizationSlug');
        if (lastSlug) {
          navigate(`/${lastSlug}/login`, { replace: true });
        } else {
          // Si no hay slug previo, mostramos el login central aquí mismo
          setShouldShowLogin(true);
        }
      }
    }
  }, [profile, loading, navigate]);

  if (shouldShowLogin) {
    return <LoginPage />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          {/* Root - muestra pantalla de carga o redirige */}
          <Route path="/" element={<RootLoader />} />

          {/* Organization Routes - muestra dashboard si está logueado, sino login */}
          <Route path="/:slug" element={<OrganizationHome />} />
          <Route path="/:slug/login" element={<LoginPage />} />
          <Route path="/:slug/register" element={<RegisterPage />} />
          <Route path="/:slug/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/:slug/verify-email" element={<VerifyEmail />} />

          {/* Legacy/Global Redirects */}
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/register" element={<Navigate to="/" />} />
          <Route path="/forgot-password" element={<Navigate to="/" />} />

          {/* Standard Routes (session based) */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <Calendario />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reservations/new"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <NewReservationPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reservations/my"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <MyReservationsPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reservations/edit/:id"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <NewReservationPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/bonificaciones"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <Bonificaciones />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <Calendario />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/reservations"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <AdminReservationsPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/areas"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <AdminAreasPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <AdminUsersPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/subscription"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <AdminSubscriptionPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/bonificaciones"
            element={
              <PrivateRoute adminOnly>
                <DashboardLayout>
                  <AdminBonificaciones />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/super-admin/organizations"
            element={
              <SuperAdminRoute>
                <DashboardLayout>
                  <SuperAdminOrganizations />
                </DashboardLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/subscription-plans"
            element={
              <SuperAdminRoute>
                <DashboardLayout>
                  <SuperAdminSubscriptionPlans />
                </DashboardLayout>
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/subscription-payments"
            element={
              <SuperAdminRoute>
                <DashboardLayout>
                  <SuperAdminSubscriptionPayments />
                </DashboardLayout>
              </SuperAdminRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <MaintenancePage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/payment/:id"
            element={
              <PrivateRoute>
                <PaymentMockPage />
              </PrivateRoute>
            }
          />

          {/* Catch-all to root */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
