import React from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import ChatPage from './components/ChatPage'
import PortalEnroll from './components/JDPortal/auth/PortalEnroll'
import PortalLogin from './components/JDPortal/auth/PortalLogin'
import ProtectedRoute from './components/JDPortal/auth/ProtectedRoute'
import PortalShell from './components/JDPortal/PortalShell'
import JDPortal from './components/JDPortal/JDPortal'
import JDPortal2 from './components/JDPortal/JDPortal2'
import { PortalAuthProvider } from './context/PortalAuthContext'

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
    </Routes>
  )
}

export default App
