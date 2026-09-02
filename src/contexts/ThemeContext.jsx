import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light'
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('qsams-theme') || 'system'
    } catch {
      return 'system'
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState('light')

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      let isDark = false
      if (theme === 'dark') {
        isDark = true
      } else if (theme === 'light') {
        isDark = false
      } else {
        // system
        isDark = mediaQuery.matches
      }

      setResolvedTheme(isDark ? 'dark' : 'light')

      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }

      // Update mobile browser header theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#0b1329' : '#005a36')
      }
    }

    applyTheme()

    const handleMediaChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [theme])

  const setTheme = (newTheme) => {
    try {
      localStorage.setItem('qsams-theme', newTheme)
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e)
    }
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
