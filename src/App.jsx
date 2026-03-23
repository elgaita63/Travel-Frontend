import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
// Notification imports - DISABLED
// import NotificationHistory from './pages/NotificationHistory';
// import NotificationAdmin from './pages/NotificationAdmin';
// import NotificationForm from './pages/NotificationForm';
import UserSettings from './pages/UserSettings';
import UsersList from './pages/UsersList';
import UserForm from './pages/UserForm';
import DailyReports from './pages/DailyReports';
import AdminInsightsDashboard from './pages/AdminInsightsDashboard';
import SearchPage from './pages/SearchPage';
import ProtectedRoute from './components/ProtectedRoute';


// Ahora el sistema le pregunta a Netlify si debe mostrar el mantenimiento
const MODO_MANTENIMIENTO = import.meta.env.VITE_MODO_MANTENIMIENTO === 'true';

const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' },
  content: { maxWidth: '500px', width: '100%', padding: '40px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  logo: { maxWidth: '200px', marginBottom: '20px' },
  highlight: { fontSize: '1.2rem', fontWeight: 'bold', color: '#00ffc4' }
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute>
            <Layout>
              <ClientsList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients/new" 
        element={
          <ProtectedRoute>
            <Layout>
              <ClientForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients/:clientId" 
        element={
          <ProtectedRoute>
            <Layout>
              <ClientDetails />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/providers" 
        element={
          <ProtectedRoute>
            <Layout>
              <ProvidersList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/providers/new" 
        element={
          <ProtectedRoute>
            <Layout>
              <ProviderForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/providers/:providerId" 
        element={
          <ProtectedRoute>
            <Layout>
              <ProviderDetails />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/providers/:providerId/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <VendorDashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services" 
        element={
          <ProtectedRoute>
            <Layout>
              <ServicesList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/new" 
        element={
          <ProtectedRoute>
            <Layout>
              <ServiceForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:id" 
        element={
          <ProtectedRoute>
            <Layout>
              <ServiceDetails />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:id/edit" 
        element={
          <ProtectedRoute>
            <Layout>
              <ServiceForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales" 
        element={
          <ProtectedRoute>
            <Layout>
              <SalesList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/monthly" 
        element={
          <ProtectedRoute>
            <Layout>
              <MonthlySales />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/wizard" 
        element={
          <ProtectedRoute>
            <Layout>
              <SaleWizard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/new" 
        element={
          <ProtectedRoute>
            <Layout>
              <SaleWizard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <SaleSummary />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <SaleEdit />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/:id/wizard"
        element={
          <ProtectedRoute>
            <Layout>
              <SaleWizard />
            </Layout>
          </ProtectedRoute>
        } 
      />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/calendar"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryCalendar />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cupos/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CupoForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cupos/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CupoDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ReportingDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/payments"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <PaymentReports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-reports"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <DailyReports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-insights"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <AdminInsightsDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Notification routes - DISABLED */}
            {/* <Route
              path="/notifications/history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/send"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/admin"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UsersList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SearchPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
};

function App() {

  // --- Relato de variables de arranque (FRONT) ---
  console.log("%c--- CONFIGURACIÓN DE ARRANQUE (FRONT) ---", "color: #00ffc4; font-weight: bold;");
  console.log("VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
  console.log("VITE_NODE_ENV:", import.meta.env.VITE_NODE_ENV);
  console.log("VITE_MODO_MANTENIMIENTO:", import.meta.env.VITE_MODO_MANTENIMIENTO);
  console.log("VITE_AGENCY_NAME:", import.meta.env.VITE_AGENCY_NAME);
  console.log("%c---------------------------------------", "color: #00ffc4; font-weight: bold;");


// --- Lógica de Mantenimiento ---

if (MODO_MANTENIMIENTO) {
    const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;

    return (
      <div style={styles.container}>
        <div style={styles.content}>
          {/* Centrado del logo con lógica condicional */}
          {agencyLogo && (
            <img 
              src={agencyLogo} 
              alt="Marenostrum Logo" 
              style={{
                ...styles.logo,
                display: 'block',    // Lo hacemos bloque
                marginLeft: 'auto',  // Margen izquierdo auto
                marginRight: 'auto', // Margen derecho auto
                marginBottom: '20px' // Espacio con el título
              }} 
            />
          )}
          
          <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Mantenimiento Programado</h2>
          <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.5' }}>
            Estamos optimizando nuestros servidores de base de datos. 
            El sistema volverá a estar en línea en unos minutos.
          </p>
          <p style={styles.highlight}>Gracias por tu paciencia.</p>
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '25px 0' }} />
          <p style={{ fontSize: '0.8rem', color: '#666' }}>Equipo de IT</p>
        </div>
      </div>
    );
  }


// --- Fin Mantenimiento ---


  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemStatsProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SystemStatsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;