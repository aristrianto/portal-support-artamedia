import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CountsProvider } from '@/context/CountsContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';

// Customer pages (Broadband removed)
import DedicatedInternet from '@/pages/customers/DedicatedInternet';
import CrossConnect from '@/pages/customers/CrossConnect';
import DarkFiber from '@/pages/customers/DarkFiber';
import MetroEthernet from '@/pages/customers/MetroEthernet';

// Partners
import MitraBroadband from '@/pages/partners/MitraBroadband';
import MitraDedicated from '@/pages/partners/MitraDedicated';
import MitraMetro from '@/pages/partners/MitraMetro';
import MitraDarkFiber from '@/pages/partners/MitraDarkFiber';
import MitraCrossConnect from '@/pages/partners/MitraCrossConnect';

// Documents (Customer + Provider variants; PO/SO removed)
import BACustomer from '@/pages/documents/BACustomer';
import BAProvider from '@/pages/documents/BAProvider';
import SLACustomer from '@/pages/documents/SLACustomer';
import SLAProvider from '@/pages/documents/SLAProvider';
import KontrakCustomer from '@/pages/documents/KontrakCustomer';
import KontrakProvider from '@/pages/documents/KontrakProvider';
import Teknis from '@/pages/documents/Teknis';

// My DataCenter
import RackDevice from '@/pages/RackDevice';
import MyInterconnection from '@/pages/datacenter/MyInterconnection';

// CRM
import BroadbandTicket from '@/pages/crm/BroadbandTicket';
import DedicatedTicket from '@/pages/crm/DedicatedTicket';
import CRMDashboard from '@/pages/crm/CRMDashboard';

// Network
import PublicIPv4Management from '@/pages/network/PublicIPv4Management';
import MikroTikSetup from '@/pages/network/MikroTikSetup';
import IPAMAuditLog from '@/pages/network/IPAMAuditLog';

// Operations
import ShiftHandover from '@/pages/ShiftHandover';
import Incidents from '@/pages/Incidents';
import Maintenance from '@/pages/Maintenance';
import Users from '@/pages/Users';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CountsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />

                {/* Customers group — Broadband REMOVED */}
                <Route path="customers" element={<Navigate to="/customers/dedicated" replace />} />
                <Route path="customers/broadband" element={<Navigate to="/customers/dedicated" replace />} />
                <Route path="customers/dedicated" element={<DedicatedInternet />} />
                <Route path="customers/cross-connect" element={<CrossConnect />} />
                <Route path="customers/dark-fiber" element={<DarkFiber />} />
                <Route path="customers/metro-ethernet" element={<MetroEthernet />} />

                {/* Partners */}
                <Route path="partners" element={<Navigate to="/partners/broadband" replace />} />
                <Route path="partners/broadband" element={<MitraBroadband />} />
                <Route path="partners/dedicated" element={<MitraDedicated />} />
                <Route path="partners/metro-ethernet" element={<MitraMetro />} />
                <Route path="partners/dark-fiber" element={<MitraDarkFiber />} />
                <Route path="partners/cross-connect" element={<MitraCrossConnect />} />

                {/* Documents — restructured: BA/SLA/Contract → Customer + Provider, no PO/SO */}
                <Route path="documents" element={<Navigate to="/documents/ba/customer" replace />} />
                <Route path="documents/ba" element={<Navigate to="/documents/ba/customer" replace />} />
                <Route path="documents/ba/customer" element={<BACustomer />} />
                <Route path="documents/ba/provider" element={<BAProvider />} />
                <Route path="documents/sla" element={<Navigate to="/documents/sla/customer" replace />} />
                <Route path="documents/sla/customer" element={<SLACustomer />} />
                <Route path="documents/sla/provider" element={<SLAProvider />} />
                <Route path="documents/kontrak" element={<Navigate to="/documents/kontrak/customer" replace />} />
                <Route path="documents/kontrak/customer" element={<KontrakCustomer />} />
                <Route path="documents/kontrak/provider" element={<KontrakProvider />} />
                <Route path="documents/teknis" element={<Teknis />} />
                {/* Legacy PO/SO redirects to Contract */}
                <Route path="documents/po" element={<Navigate to="/documents/kontrak/customer" replace />} />
                <Route path="documents/so" element={<Navigate to="/documents/kontrak/customer" replace />} />
                {/* Legacy rack-device path — moved to My DataCenter */}
                <Route path="documents/rack-device" element={<Navigate to="/datacenter/rack-device" replace />} />

                {/* My DataCenter */}
                <Route path="datacenter" element={<Navigate to="/datacenter/rack-device" replace />} />
                <Route path="datacenter/rack-device" element={<RackDevice />} />
                <Route path="datacenter/interconnection" element={<MyInterconnection />} />

                {/* CRM */}
                <Route path="crm" element={<Navigate to="/crm/dashboard" replace />} />
                <Route path="crm/dashboard" element={<CRMDashboard />} />
                <Route path="crm/broadband" element={<BroadbandTicket />} />
                <Route path="crm/dedicated" element={<DedicatedTicket />} />

                {/* Network */}
                <Route path="network" element={<Navigate to="/network/ipv4" replace />} />
                <Route path="network/ipv4" element={<PublicIPv4Management />} />
                <Route path="network/mikrotik" element={<MikroTikSetup />} />
                <Route path="network/audit" element={<IPAMAuditLog />} />

                {/* Operations */}
                <Route path="operations/shift-handover" element={<ShiftHandover />} />
                <Route path="operations/incidents" element={<Incidents />} />
                <Route path="operations/maintenances" element={<Maintenance />} />

                {/* Admin */}
                <Route path="users" element={<Users />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <Toaster richColors position="bottom-right" closeButton />
          </CountsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
