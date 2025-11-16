import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19';
import { ThemeProvider } from './theme';
import App from './App.tsx'
import './index.css';

// Service worker registration helper provided by vite-plugin-pwa
// 'virtual:pwa-register' is injected by the plugin at build time
import { registerSW } from 'virtual:pwa-register'
import PWAInstallButton from './components/PWAInstallButton'

registerSW({
  onRegistered(r: any) {
    // r is equivalent to ServiceWorkerRegistration (or undefined in dev)
    console.log('[PWA] Service worker registered:', r)
  },
  onRegisterError(err: any) {
    console.error('[PWA] Service worker registration error:', err)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider themeMode="light">
      <PWAInstallButton />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
