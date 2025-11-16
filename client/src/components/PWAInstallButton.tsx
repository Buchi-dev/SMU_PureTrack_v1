import { useEffect, useState } from 'react'

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    function onAppInstalled() {
      setDeferredPrompt(null)
      setIsVisible(false)
      console.log('PWA installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    // Show browser install prompt
    try {
      // The event has a prompt() method
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      console.log('User choice', choiceResult)
      // Reset the deferred prompt variable since it can't be used again
      setDeferredPrompt(null)
      setIsVisible(false)
    } catch (err) {
      console.error('Install prompt error', err)
    }
  }

  if (!isVisible) return null

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
      <button
        onClick={handleInstallClick}
        style={{
          padding: '8px 12px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Install App
      </button>
    </div>
  )
}
