/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { ProtectedRoute, PublicRoute } from "./components/auth/RouteGuards";
import { AdminRoute } from "./components/auth/AdminRoute";
import { PlatformThemeBootstrap } from "./components/theme/PlatformThemeBootstrap";
import "./styles/plans-texture.css";

// Pages
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { ClientList } from "./pages/clientes/ClientList";
import { ClientForm } from "./pages/clientes/ClientForm";
import { ClientDetails } from "./pages/clientes/ClientDetails";
import { ProposalList } from "./pages/propostas/ProposalList";
import { ProposalDetailsRoute } from "./components/proposals/ProposalDetailsRoute";
import { DesignPdf } from "./pages/design-pdf/DesignPdf";
import { PublicProposal } from "./pages/public/PublicProposal";
import { SettingsRoute } from "./pages/SettingsRoute";
import { SolarKitCatalog } from "./pages/kits/SolarKitCatalog";
import { Plans } from "./pages/Plans";
import { BillingCheckout } from "./pages/BillingCheckout";
import { Onboarding } from "./pages/Onboarding";
import { AccountData } from "./pages/AccountData";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { LegalDocumentPage } from "./pages/legal/LegalDocumentPage";

function Home() {
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PlatformThemeBootstrap />
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/planos" element={<Plans />} />
          <Route path="/precos" element={<Navigate to="/planos" replace />} />
          <Route path="/termos" element={<LegalDocumentPage type="terms" />} />
          <Route path="/privacidade" element={<LegalDocumentPage type="privacy" />} />
          <Route path="/cancelamento-reembolso" element={<LegalDocumentPage type="refund" />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="primeiros-passos" element={<Onboarding />} />
              <Route path="clientes" element={<ClientList />} />
              <Route path="clientes/novo" element={<ClientForm />} />
              <Route path="clientes/:id" element={<ClientDetails />} />
              <Route path="clientes/:id/editar" element={<ClientForm />} />
              <Route path="propostas" element={<ProposalList />} />
              <Route path="propostas/nova" element={null} />
              <Route path="propostas/:id" element={<ProposalDetailsRoute />} />
              <Route path="propostas/:id/editar" element={null} />
              <Route path="kits-solares" element={<SolarKitCatalog />} />
              <Route path="design-pdf" element={<DesignPdf />} />
              <Route path="checkout" element={<BillingCheckout />} />
              <Route path="configuracoes" element={<SettingsRoute />} />
              <Route path="privacidade-dados" element={<AccountData />} />
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          <Route path="/proposta/:publicToken" element={<PublicProposal />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
