/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { ProtectedRoute, PublicRoute } from "./components/auth/RouteGuards";
import { PlatformThemeBootstrap } from "./components/theme/PlatformThemeBootstrap";

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
import { ProposalWizard } from "./pages/propostas/ProposalWizard";
import { ProposalDetailsRoute } from "./components/proposals/ProposalDetailsRoute";
import { DesignPdf } from "./pages/design-pdf/DesignPdf";
import { PublicProposal } from "./pages/public/PublicProposal";
import { Configuracoes } from "./pages/Configuracoes";
import { SolarKitCatalog } from "./pages/kits/SolarKitCatalog";
import { Plans } from "./pages/Plans";

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
          {/* Public marketing route, available with or without an active session. */}
          <Route path="/planos" element={<Plans />} />
          <Route path="/precos" element={<Navigate to="/planos" replace />} />

          {/* Public Routes (Only accessible if NOT logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Reset Password (Accessible both with or without a recovery session) */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes (Require Login, Uses Main Layout) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clientes" element={<ClientList />} />
              <Route path="clientes/novo" element={<ClientForm />} />
              <Route path="clientes/:id" element={<ClientDetails />} />
              <Route path="clientes/:id/editar" element={<ClientForm />} />
              <Route path="propostas" element={<ProposalList />} />
              <Route path="propostas/nova" element={<ProposalWizard />} />
              <Route path="propostas/:id" element={<ProposalDetailsRoute />} />
              <Route path="propostas/:id/editar" element={<ProposalWizard />} />
              <Route path="kits-solares" element={<SolarKitCatalog />} />
              <Route path="design-pdf" element={<DesignPdf />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </Route>
          
          {/* Public route without layout for external proposal viewing */}
          <Route path="/proposta/:publicToken" element={<PublicProposal />} />
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}
