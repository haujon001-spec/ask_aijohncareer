import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import ChatPage from './components/ChatPage'
import PortalEnroll from './components/JDPortal/auth/PortalEnroll'
import PortalLogin from './components/JDPortal/auth/PortalLogin'
import ProtectedRoute from './components/JDPortal/auth/ProtectedRoute'
import PortalShell from './components/JDPortal/PortalShell'
import JDPortal from './components/JDPortal/JDPortal'
import JDPortal2 from './components/JDPortal/JDPortal2'
import { PortalAuthProvider } from './context/PortalAuthContext'

// /portal2 (multi-profile) is parked for the live site (27 Oct 2026, user decision:
// "no need to deploy portal2 to the VPS for now"). It is on in dev builds and in any
// build made with VITE_ENABLE_PORTAL2=true; a normal production build redirects it.
// The matching server routes are gated in backend/jd_api_server.js.
const PORTAL2_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PORTAL2 === 'true'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route
        path="/portal/*"
        element={
          <PortalAuthProvider>
            <PortalShell>
              <Routes>
                <Route path="login" element={<PortalLogin />} />
                <Route path="enroll" element={<PortalEnroll />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <JDPortal />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </PortalShell>
          </PortalAuthProvider>
        }
      />
      {/* Multi-profile portal (Phase 2, 11 Aug 2026) — same auth gate as
          /portal, parallel route, v3-backed. /portal itself is untouched. */}
      {!PORTAL2_ENABLED && <Route path="/portal2/*" element={<Navigate to="/portal" replace />} />}
      {PORTAL2_ENABLED && (
      <Route
        path="/portal2/*"
        element={
          <PortalAuthProvider>
            <PortalShell basePath="/portal2" brandLabel="Multi-Profile Portal">
              <Routes>
                <Route path="login" element={<PortalLogin basePath="/portal2" />} />
                <Route path="enroll" element={<PortalEnroll basePath="/portal2" />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute basePath="/portal2">
                      <JDPortal2 />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </PortalShell>
          </PortalAuthProvider>
        }
      />
      )}
    </Routes>
  )
}

export default App
