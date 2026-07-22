import React from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import ChatPage from './components/ChatPage'
import PortalEnroll from './components/JDPortal/auth/PortalEnroll'
import PortalLogin from './components/JDPortal/auth/PortalLogin'
import ProtectedRoute from './components/JDPortal/auth/ProtectedRoute'
import PortalShell from './components/JDPortal/PortalShell'
import JDPortal from './components/JDPortal/JDPortal'
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
    </Routes>
  )
}

export default App
