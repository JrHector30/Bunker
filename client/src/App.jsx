import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { CajaProvider } from './context/CajaContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import TablesView from './pages/TablesView';
import KitchenView from './pages/KitchenView';
import CashierView from './pages/CashierView';
import WaiterOrderView from './pages/WaiterOrderView';
import CategoriesView from './pages/CategoriesView'; // New
import InventoryView from './pages/InventoryView';   // New
import UsersView from './pages/UsersView';           // New
import StaffStatsView from './pages/StaffStatsView'; // New
import SettingsView from './pages/SettingsView';     // New
import HomeView from './pages/HomeView';             // New
import LandingView from './pages/LandingView';       // New
import SupportView from './pages/SupportView';       // New
import NotFoundView from './views/NotFoundView';

const getDefaultRoute = (user, tienePermiso) => {
  if (!user) return "/login";
  if (user.rol === 'admin') return "/home";
  
  if (tienePermiso('inicio')) return "/home";
  if (tienePermiso('mesas')) return "/tables";
  if (tienePermiso('cocina')) return "/kitchen";
  if (tienePermiso('caja')) return "/cashier";
  if (tienePermiso('logistica')) return "/admin/inventory";
  if (tienePermiso('categories')) return "/admin/categories";
  if (tienePermiso('usuarios')) return "/admin/users";
  if (tienePermiso('reportes')) return "/admin/staff-stats";
  
  return "/settings"; // Default fallback
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, modulo }) => {
  const { user, tienePermiso } = useAuth();

  if (!user) return <Navigate to="/login" />;
  
  if (modulo && !tienePermiso(modulo)) {
    return <Navigate to={getDefaultRoute(user, tienePermiso)} />;
  }
  
  return children;
};

// Route Dispatcher based on Role
const HomeRedirect = () => {
  const { user, tienePermiso } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return <Navigate to={getDefaultRoute(user, tienePermiso)} />;
}

const RootRoute = () => {
  const { user, tienePermiso } = useAuth();
  if (user) return <Navigate to={getDefaultRoute(user, tienePermiso)} />;
  return <LandingView />;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <ConfirmationProvider>
            <CajaProvider>
              <AuthProvider>
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<RootRoute />} />
              <Route path="/app" element={<HomeRedirect />} />

            <Route element={<DashboardLayout />}>

              <Route path="/home" element={
                <ProtectedRoute modulo="inicio">
                  <HomeView />
                </ProtectedRoute>
              } />

              <Route path="/tables" element={
                <ProtectedRoute modulo="mesas">
                  <TablesView />
                </ProtectedRoute>
              } />

              <Route path="/order/:tableId" element={
                <ProtectedRoute modulo="mesas">
                  <WaiterOrderView />
                </ProtectedRoute>
              } />

              <Route path="/kitchen" element={
                <ProtectedRoute modulo="cocina">
                  <KitchenView />
                </ProtectedRoute>
              } />

              <Route path="/cashier" element={
                <ProtectedRoute modulo="caja">
                  <CashierView />
                </ProtectedRoute>
              } />

              {/* Admin / Inventory Modules */}
              <Route path="/admin/categories" element={
                <ProtectedRoute modulo="categories">
                  <CategoriesView />
                </ProtectedRoute>
              } />

              <Route path="/admin/inventory" element={
                <ProtectedRoute modulo="logistica">
                  <InventoryView />
                </ProtectedRoute>
              } />



              <Route path="/admin/users" element={
                <ProtectedRoute modulo="usuarios">
                  <UsersView />
                </ProtectedRoute>
              } />

              <Route path="/admin/staff-stats" element={
                <ProtectedRoute modulo="reportes">
                  <StaffStatsView />
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsView />
                </ProtectedRoute>
              } />

              <Route path="/support" element={
                <ProtectedRoute>
                  <SupportView />
                </ProtectedRoute>
              } />



            </Route>
            <Route path="*" element={<NotFoundView />} />
          </Routes>
          </AuthProvider>
            </CajaProvider>
          </ConfirmationProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
