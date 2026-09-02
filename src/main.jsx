import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto update PWA Service Worker immediately whenever a new build is deployed
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force activate the new service worker immediately without waiting
    updateSW(true)
  },
  onOfflineReady() {
    console.log('QSAMS is cached for offline use.')
  },
})

// Periodically check for updates when returning to the app window / tab
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateSW(true)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
