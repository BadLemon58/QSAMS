import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './router/AppRouter'
import InstallPrompt from './components/common/InstallPrompt'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InstallPrompt />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}
