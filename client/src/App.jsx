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



// Protected Route Wrapper
const ProtectedRoute = ({ children, modulo }) => {
  const { user, tienePermiso } = useAuth();

  if (!user) return <Navigate to="/login" />;
  
  if (modulo && !tienePermiso(modulo)) {
    return <Navigate to="/home" />; // Redirect to home if no permission for module
  }
  
  return children;
};

// Route Dispatcher based on Role
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  // Default redirect to the new Dashboard for all roles
  return <Navigate to="/home" />;
}

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
              <Route path="/" element={<HomeRedirect />} />

            <Route element={<DashboardLayout />}>

              <Route path="/home" element={
                <ProtectedRoute>
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



            </Route>
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
