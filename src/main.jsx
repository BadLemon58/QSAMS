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

  // Global UI Debounce/Throttle to prevent rapid double-clicks on buttons/links
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, [role="button"]');
    if (target) {
      const now = Date.now();
      const lastClick = parseInt(target.getAttribute('data-last-click') || '0', 10);
      
      // Enforce a 500ms cooldown on the exact same button
      if (now - lastClick < 500) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      target.setAttribute('data-last-click', now.toString());
    }
  }, true); // Use capture phase to intercept before React handles it
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
