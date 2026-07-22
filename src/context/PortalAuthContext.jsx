import React, { createContext, useContext, useState, useCallback } from 'react'
import { fetchMe, logout as logoutRequest } from '../utils/jdApi'

const PortalAuthContext = createContext()

export function PortalAuthProvider({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'authenticated' | 'unauthenticated'

  const checkAuth = useCallback(async () => {
    setStatus('checking')
    try {
      await fetchMe()
      setStatus('authenticated')
      return true
    } catch {
      setStatus('unauthenticated')
      return false
    }
  }, [])

  const markAuthenticated = useCallback(() => setStatus('authenticated'), [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setStatus('unauthenticated')
    }
  }, [])

  return (
    <PortalAuthContext.Provider value={{ status, checkAuth, markAuthenticated, logout }}>
      {children}
    </PortalAuthContext.Provider>
  )
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext)
  if (!context) {
    throw new Error('usePortalAuth must be used within PortalAuthProvider')
  }
  return context
}
