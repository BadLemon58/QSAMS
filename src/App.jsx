import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ModalProvider } from './contexts/ModalContext'
import AppRouter from './router/AppRouter'
import InstallPrompt from './components/common/InstallPrompt'

export default function App() {
  return (
    <ThemeProvider>
      <ModalProvider>
        <BrowserRouter>
          <AuthProvider>
            <InstallPrompt />
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </ModalProvider>
    </ThemeProvider>
  )
}
