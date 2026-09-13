import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme] = useState('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('dos_theme', 'light')
  }, [])

  const toggleTheme = () => {}

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
