import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthProvider from './context/AuthContext';
import { FEATURES } from './lib/features';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Chargement immédiat — requis pour le shell applicatif
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading — chaque page n'est téléchargée que si elle est visitée
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const LandingPage        = lazy(() => import('./pages/LandingPage'));
const LegalPage          = lazy(() => import('./pages/LegalPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const WaitlistPage       = lazy(() => import('./pages/WaitlistPage'));
const LeadsLitigesDIPPage = lazy(() => import('./pages/LeadsLitigesDIPPage'));
const BaseLitigesDIPPage  = lazy(() => import('./pages/BaseLitigesDIPPage'));
const SharedDIPPage      = lazy(() => import('./pages/SharedDIPPage'));
const SharedContractPage = lazy(() => import('./pages/SharedContractPage'));
const AttestationPublicPage = lazy(() => import('./pages/AttestationPublicPage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const AvocatSessionPage  = lazy(() => import('./pages/AvocatSessionPage'));
const TrialExpiredPage   = lazy(() => import('./pages/TrialExpiredPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const DIPPage            = lazy(() => import('./pages/DIPPage'));
const UploadDIPPage      = lazy(() => import('./pages/UploadDIPPage'));
const GenerateDIPPage    = lazy(() => import('./pages/GenerateDIPPage'));
const ContractPage       = lazy(() => import('./pages/ContractPage'));
const UploadContractPage = lazy(() => import('./pages/UploadContractPage'));
const GenerateContractPage = lazy(() => import('./pages/GenerateContractPage'));
const AlertsPage         = lazy(() => import('./pages/AlertsPage'));
const HistoryPage        = lazy(() => import('./pages/HistoryPage'));
const FranchiseesPage    = lazy(() => import('./pages/FranchiseesPage'));
const SettingsPage       = lazy(() => import('./pages/SettingsPage'));
const ExportPage         = lazy(() => import('./pages/ExportPage'));
const CertificatesPage   = lazy(() => import('./pages/CertificatesPage'));
const CompliancePage     = lazy(() => import('./pages/CompliancePage'));
const DocumentsPage      = lazy(() => import('./pages/DocumentsPage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const MonitorPage        = lazy(() => import('./pages/MonitorPage'));
const DocMonitoringPage  = lazy(() => import('./pages/DocMonitoringPage'));
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage'));
const DIPAvocatPage      = lazy(() => import('./pages/DIPAvocatPage'));
const AvocatCertificatesPage = lazy(() => import('./pages/AvocatCertificatesPage'));
const AvocatConformitePage   = lazy(() => import('./pages/AvocatConformitePage'));
const AvocatBibliothequePage = lazy(() => import('./pages/AvocatBibliothequePage'));
const AvocatDocumentsPage    = lazy(() => import('./pages/AvocatDocumentsPage'));
const AvocatExportPage       = lazy(() => import('./pages/AvocatExportPage'));
const AvocatMonitoringPage   = lazy(() => import('./pages/AvocatMonitoringPage'));
const AvocatFilesPage        = lazy(() => import('./pages/AvocatFilesPage'));
const DesignPreviewPage  = lazy(() => import('./pages/DesignPreviewPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-primary">
    <LoadingSpinner size="lg" />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// "Recherche conformité" a fusionné dans l'onglet "Moteur juridique" —
// redirige une éventuelle ancienne URL en favori plutôt que de la laisser
// atterrir sur une route morte.
function AvocatRechercheRedirect() {
  const { franchiseurId } = useParams();
  return <Navigate to={`/avocat/${franchiseurId}/bibliotheque`} replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <S>
      <LandingPage />
    </S>
  );
}

function TrialGuard({ children }) {
  const { user, loading, isTrialExpired } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (isTrialExpired) return <Navigate to="/trial-expired" replace />;
  return children;
}

function FranchisorOnlyRoute({ children }) {
  const { profile, loading } = useAuth();
  // Tant que le profil charge encore, profile?.role est undefined — sans ce
  // garde, un avocat rafraîchissant une page franchiseur (ex: /dip/upload)
  // la voyait s'afficher et pouvait déclencher une action avant que la
  // redirection n'arrive, provoquant un 403 confus côté backend au lieu
  // d'une redirection propre.
  if (loading) return <PageLoader />;
  if (profile?.role === 'avocat') return <Navigate to="/dashboard" replace />;
  return children;
}

// Chaque route publique passait au travers sans protection contre un crash
// de rendu (seules les routes sous Layout avaient un <ErrorBoundary> —
// exactement le trou qui a laissé un visiteur sur une page blanche sur "/"
// lors d'un chunk périmé après déploiement). L'ErrorBoundary fait
// maintenant partie de S lui-même, pour que toute route l'obtienne
// automatiquement, sans dépendre de ne pas oublier de l'ajouter à la main.
const S = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/cgu"             element={<S><LegalPage /></S>} />
        <Route path="/privacy"         element={<S><LegalPage /></S>} />
        <Route path="/mentions-legales" element={<S><LegalPage /></S>} />
        <Route path="/cookies"         element={<S><LegalPage /></S>} />

        <Route path="/login"            element={<PublicOnlyRoute><S><LoginPage /></S></PublicOnlyRoute>} />
        <Route path="/register"         element={<PublicOnlyRoute><S><RegisterPage /></S></PublicOnlyRoute>} />
        <Route path="/forgot-password"  element={<PublicOnlyRoute><S><ForgotPasswordPage /></S></PublicOnlyRoute>} />
        <Route path="/reset-password"   element={<S><ResetPasswordPage /></S>} />

        <Route path="/waitlist"               element={<S><WaitlistPage /></S>} />
        <Route path="/ressources/litiges-dip"       element={<S><LeadsLitigesDIPPage /></S>} />
        <Route path="/ressources/base-litiges-dip"  element={<S><BaseLitigesDIPPage /></S>} />
        <Route path="/dip/partage/:token"     element={<S><SharedDIPPage /></S>} />
        <Route path="/contrat/partage/:token" element={<S><SharedContractPage /></S>} />
        <Route path="/attestation/:token"      element={<S><AttestationPublicPage /></S>} />
        <Route path="/avocat/session"          element={<S><AvocatSessionPage /></S>} />

        <Route path="/trial-expired" element={<ProtectedRoute><S><TrialExpiredPage /></S></ProtectedRoute>} />

        <Route path="/" element={<TrialGuard><Layout /></TrialGuard>}>
          <Route path="dashboard"   element={<S><DashboardPage /></S>} />
          <Route path="fichiers"    element={<S><AvocatFilesPage /></S>} />
          <Route path="dip"         element={<FranchisorOnlyRoute><S><DIPPage /></S></FranchisorOnlyRoute>} />
          <Route path="dip/upload"  element={<FranchisorOnlyRoute><S><UploadDIPPage /></S></FranchisorOnlyRoute>} />
          <Route path="dip/generate" element={<FranchisorOnlyRoute><S><GenerateDIPPage /></S></FranchisorOnlyRoute>} />
          <Route path="contrat"             element={<FranchisorOnlyRoute><S><ContractPage /></S></FranchisorOnlyRoute>} />
          <Route path="contrat/upload"      element={<FranchisorOnlyRoute><S><UploadContractPage /></S></FranchisorOnlyRoute>} />
          <Route path="contrat/generate"    element={<FranchisorOnlyRoute><S><GenerateContractPage /></S></FranchisorOnlyRoute>} />
          <Route path="alerts"      element={<FranchisorOnlyRoute><S><AlertsPage /></S></FranchisorOnlyRoute>} />
          <Route path="history"     element={<FranchisorOnlyRoute><S><HistoryPage /></S></FranchisorOnlyRoute>} />
          <Route path="franchisees" element={<FranchisorOnlyRoute><S><FranchiseesPage /></S></FranchisorOnlyRoute>} />
          <Route path="settings"    element={<S><SettingsPage /></S>} />
          <Route path="export"      element={<FranchisorOnlyRoute><S><ExportPage /></S></FranchisorOnlyRoute>} />
          <Route path="certifications" element={<FranchisorOnlyRoute><S><CertificatesPage /></S></FranchisorOnlyRoute>} />
          <Route path="conformite"     element={<FranchisorOnlyRoute><S><CompliancePage /></S></FranchisorOnlyRoute>} />
          <Route path="documents"      element={<FranchisorOnlyRoute><S><DocumentsPage /></S></FranchisorOnlyRoute>} />
          <Route path="admin"       element={<S><AdminPage /></S>} />
          <Route path="monitor"     element={FEATURES.monitor ? <FranchisorOnlyRoute><S><MonitorPage /></S></FranchisorOnlyRoute> : <Navigate to="/dashboard" replace />} />
          <Route path="monitoring"  element={<FranchisorOnlyRoute><S><DocMonitoringPage /></S></FranchisorOnlyRoute>} />
          <Route path="analytics/dip/:dipId"          element={<FranchisorOnlyRoute><S><AnalyticsPage /></S></FranchisorOnlyRoute>} />
          <Route path="dip/avocat/:franchiseurId"      element={<S><DIPAvocatPage /></S>} />
          <Route path="avocat/:franchiseurId/certifications" element={<S><AvocatCertificatesPage /></S>} />
          <Route path="avocat/:franchiseurId/conformite"     element={<S><AvocatConformitePage /></S>} />
          <Route path="avocat/:franchiseurId/bibliotheque"   element={<S><AvocatBibliothequePage /></S>} />
          <Route path="avocat/:franchiseurId/documents"      element={<S><AvocatDocumentsPage /></S>} />
          <Route path="avocat/:franchiseurId/export"         element={<S><AvocatExportPage /></S>} />
          <Route path="avocat/:franchiseurId/surveillance"   element={<S><AvocatMonitoringPage /></S>} />
          <Route path="avocat/:franchiseurId/recherche"      element={<AvocatRechercheRedirect />} />
          <Route path="design-preview" element={FEATURES.design_preview ? <S><DesignPreviewPage /></S> : <Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<S><NotFoundPage /></S>} />
      </Routes>
    </AuthProvider>
  );
}
