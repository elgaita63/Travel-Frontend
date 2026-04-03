import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemStatsProvider } from './contexts/SystemStatsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ClientForm from './pages/ClientForm';
import ClientDetails from './pages/ClientDetails';
import ProvidersList from './pages/ProvidersList';
import ProviderForm from './pages/ProviderForm';
import ProviderDetails from './pages/ProviderDetails';
import VendorDashboard from './pages/VendorDashboard';
import ServicesList from './pages/ServicesList';
import ServiceForm from './pages/ServiceForm';
import ServiceDetails from './pages/ServiceDetails';
import SalesList from './pages/SalesList';
import SaleWizard from './pages/SaleWizard';
import SaleSummary from './pages/SaleSummary';
import SaleEdit from './pages/SaleEdit';
import MonthlySales from './pages/MonthlySales';
import InventoryDashboard from './pages/InventoryDashboard';
import InventoryCalendar from './pages/InventoryCalendar';
import CupoForm from './pages/CupoForm';
import CupoDetails from './pages/CupoDetails';
import ReportingDashboard from './pages/ReportingDashboard';
import PaymentReports from './pages/PaymentReports';
import UserSettings from './pages/UserSettings';
import UsersList from './pages/UsersList';
import UserForm from './pages/UserForm';
import DailyReports from './pages/DailyReports';
import AdminInsightsDashboard from './pages/AdminInsightsDashboard';
import Balances from './pages/Balances';
import SearchPage from './pages/SearchPage';
import ForcePasswordChange from './pages/ForcePasswordChange';
import ProtectedRoute from './components/ProtectedRoute';
import SystemConfig from './pages/SystemConfig';

const MODO_MANTENIMIENTO = import.meta.env.VITE_MODO_MANTENIMIENTO === 'true';

const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' },
  content: { maxWidth: '500px', width: '100%', padding: '40px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  logo: { maxWidth: '200px', marginBottom: '20px' },
  highlight: { fontSize: '1.2rem', fontWeight: 'bold', color: '#00ffc4' }
};

const AppRoutes = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/force-password-change" element={<ForcePasswordChange />} />
      
      {/* RUTAS PROTEGIDAS COMPLETAS */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/register" element={<ProtectedRoute requireAdmin><Layout><Register /></Layout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Layout><ClientsList /></Layout></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><Layout><ClientForm /></Layout></ProtectedRoute>} />
      <Route path="/clients/:clientId" element={<ProtectedRoute><Layout><ClientDetails /></Layout></ProtectedRoute>} />
      <Route path="/providers" element={<ProtectedRoute><Layout><ProvidersList /></Layout></ProtectedRoute>} />
      <Route path="/providers/new" element={<ProtectedRoute><Layout><ProviderForm /></Layout></ProtectedRoute>} />
      <Route path="/providers/:providerId" element={<ProtectedRoute><Layout><ProviderDetails /></Layout></ProtectedRoute>} />
      <Route path="/providers/:providerId/dashboard" element={<ProtectedRoute><Layout><VendorDashboard /></Layout></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><Layout><ServicesList /></Layout></ProtectedRoute>} />
      <Route path="/services/new" element={<ProtectedRoute><Layout><ServiceForm /></Layout></ProtectedRoute>} />
      <Route path="/services/:id" element={<ProtectedRoute><Layout><ServiceDetails /></Layout></ProtectedRoute>} />
      <Route path="/services/:id/edit" element={<ProtectedRoute><Layout><ServiceForm /></Layout></ProtectedRoute>} />
      
      {/* RUTAS DE VENTAS - EL ORDEN IMPORTA AQUÍ */}
      <Route path="/sales" element={<ProtectedRoute><Layout><SalesList /></Layout></ProtectedRoute>} />
      <Route path="/sales/monthly" element={<ProtectedRoute><Layout><MonthlySales /></Layout></ProtectedRoute>} />
      <Route path="/sales/wizard" element={<ProtectedRoute><Layout><SaleWizard /></Layout></ProtectedRoute>} />
      
      {/* ESTA ES LA LÍNEA QUE ARREGLA EL ERROR: Declaramos 'new' antes que ':id' */}
      <Route path="/sales/new" element={<ProtectedRoute><Layout><SaleWizard /></Layout></ProtectedRoute>} />
      
      <Route path="/sales/:id" element={<ProtectedRoute><Layout><SaleSummary /></Layout></ProtectedRoute>} />
      <Route path="/sales/:id/edit" element={<ProtectedRoute><Layout><SaleEdit /></Layout></ProtectedRoute>} />
      
      <Route path="/inventory" element={<ProtectedRoute><Layout><InventoryDashboard /></Layout></ProtectedRoute>} />
      <Route path="/inventory/calendar" element={<ProtectedRoute><Layout><InventoryCalendar /></Layout></ProtectedRoute>} />
      <Route path="/cupos/new" element={<ProtectedRoute><Layout><CupoForm /></Layout></ProtectedRoute>} />
      <Route path="/cupos/:id" element={<ProtectedRoute><Layout><CupoDetails /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requireAdmin><Layout><ReportingDashboard /></Layout></ProtectedRoute>} />
      <Route path="/reports/payments" element={<ProtectedRoute requireAdmin><Layout><PaymentReports /></Layout></ProtectedRoute>} />
      <Route path="/daily-reports" element={<ProtectedRoute requireAdmin><Layout><DailyReports /></Layout></ProtectedRoute>} />
      <Route path="/admin-insights" element={<ProtectedRoute requireAdmin><Layout><AdminInsightsDashboard /></Layout></ProtectedRoute>} />
      <Route path="/balances" element={<ProtectedRoute requireAdmin><Layout><Balances /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><UserSettings /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Layout><UsersList /></Layout></ProtectedRoute>} />
      <Route path="/users/new" element={<ProtectedRoute><Layout><UserForm /></Layout></ProtectedRoute>} />
      <Route path="/users/:id/edit" element={<ProtectedRoute><Layout><UserForm /></Layout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>} />
      <Route path="/system-config" element={<ProtectedRoute requireAdmin><Layout><SystemConfig /></Layout></ProtectedRoute>} />

      {/* MANEJO DE REDIRECCIONES INTELIGENTES */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

function App() {
  if (MODO_MANTENIMIENTO) {
    const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          {agencyLogo && <img src={agencyLogo} alt="Logo" style={{...styles.logo, display: 'block', marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}} />}
          <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Mantenimiento Programado</h2>
          <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.5' }}>Estamos optimizando servidores. Volvemos en minutos.</p>
          <p style={styles.highlight}>Gracias por tu paciencia.</p>
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '25px 0' }} />
          <p style={{ fontSize: '0.8rem', color: '#666' }}>Equipo de IT</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemStatsProvider>
          <Router><AppRoutes /></Router>
        </SystemStatsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;