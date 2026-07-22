import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { usePortalAuth } from '../../../context/PortalAuthContext'

function ProtectedRoute({ children }) {
  const { status, checkAuth } = usePortalAuth()

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'checking') {
    return <div className="portal-loading">Checking session…</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/portal/login" replace />
  }

  return children
}

export default ProtectedRoute
