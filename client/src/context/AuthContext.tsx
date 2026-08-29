import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../utils/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ user: User }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        api.setToken(token)
        try {
          const userData = await api.getMe()
          setUser(userData)
        } catch {
          localStorage.removeItem('token')
          api.setToken(null)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user: userData } = await api.login(email, password)
    localStorage.setItem('token', token)
    api.setToken(token)
    setUser(userData)
    return { user: userData }
  }

  const logout = () => {
    localStorage.removeItem('token')
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}