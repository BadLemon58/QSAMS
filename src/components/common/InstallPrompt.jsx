import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-md mx-auto bg-white border border-[#e2e8f0] p-4 rounded-[20px] shadow-2xl flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-[#0f172a] font-bold text-sm font-['Source_Serif_4',Georgia,serif]">Install QSAMS</h3>
          <p className="text-[#64748b] text-xs truncate">Add to your home screen for quick access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDismiss}
            className="p-2 text-[#64748b] hover:text-[#0f172a] transition-colors rounded-lg"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#005a36] hover:bg-[#00482b] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Download size={14} />
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
