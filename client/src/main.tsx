import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19';
import { ThemeProvider } from './theme';
import App from './App.tsx'
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider themeMode="light">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
