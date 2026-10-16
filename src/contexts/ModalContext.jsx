import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import CustomModal from '../components/common/CustomModal'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [modalConfig, setModalConfig] = useState(null)
  const resolverRef = useRef(null)

  const closeModal = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false)
      resolverRef.current = null
    }
    setModalConfig(null)
  }, [])

  /**
   * Show custom confirmation modal.
   * Returns a Promise resolving to boolean (true = confirmed, false = cancelled).
   */
  const showConfirm = useCallback((config) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setModalConfig({
        ...config,
        cancelText: config.cancelText || 'Cancel',
        confirmText: config.confirmText || 'Confirm',
        onConfirm: () => {
          if (resolverRef.current) {
            resolverRef.current(true)
            resolverRef.current = null
          }
          setModalConfig(null)
          if (config.onConfirm) config.onConfirm()
        },
        onCancel: () => {
          if (resolverRef.current) {
            resolverRef.current(false)
            resolverRef.current = null
          }
          setModalConfig(null)
          if (config.onCancel) config.onCancel()
        },
        onClose: () => {
          if (resolverRef.current) {
            resolverRef.current(false)
            resolverRef.current = null
          }
          setModalConfig(null)
        }
      })
    })
  }, [])

  /**
   * Show custom alert modal.
   * Returns a Promise resolving when the user acknowledges the alert.
   */
  const showAlert = useCallback((configOrMessage) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve

      const config = typeof configOrMessage === 'string'
        ? { message: configOrMessage, title: 'Notice', type: 'info' }
        : configOrMessage

      setModalConfig({
        ...config,
        confirmText: config.buttonText || config.confirmText || 'Understood',
        cancelText: null, // alerts only have one acknowledgement button
        onConfirm: () => {
          if (resolverRef.current) {
            resolverRef.current(true)
            resolverRef.current = null
          }
          setModalConfig(null)
          if (config.onConfirm) config.onConfirm()
        },
        onClose: () => {
          if (resolverRef.current) {
            resolverRef.current(true)
            resolverRef.current = null
          }
          setModalConfig(null)
        }
      })
    })
  }, [])

  // Safely hook window.alert so even unexpected native alert() calls use the NDMC modal
  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (message) => {
      showAlert({
        title: 'Notice',
        message: String(message),
        type: 'info'
      })
    }

    return () => {
      window.alert = originalAlert
    }
  }, [showAlert])

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}
      {modalConfig && (
        <CustomModal
          isOpen={true}
          {...modalConfig}
        />
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
