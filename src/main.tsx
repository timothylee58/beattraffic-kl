import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { BlinkProvider } from '@blinkdotnew/react'
import App from './App'
import './index.css'

function getProjectId(): string {
  const envId = import.meta.env.VITE_BLINK_PROJECT_ID
  if (envId) return envId
  const hostname = window.location.hostname
  const match = hostname.match(/^([^.]+)\.sites\.blink\.new$/)
  if (match) return match[1]
  return 'demo-project'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BlinkProvider
        projectId={getProjectId()}
        publishableKey={import.meta.env.VITE_BLINK_PUBLISHABLE_KEY}
      >
        <Toaster
          position="top-center"
          containerStyle={{ top: 84 }}
          toastOptions={{ style: { maxWidth: '90vw' } }}
        />
        <App />
      </BlinkProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
