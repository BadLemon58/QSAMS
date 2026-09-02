import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AppRouter from './router/AppRouter'
import InstallPrompt from './components/common/InstallPrompt'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <InstallPrompt />
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
