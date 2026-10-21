import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { init, AuthType, startAutoMCPFrameRenderer } from '@thoughtspot/visual-embed-sdk'
import App from './App.jsx'
import BcdLogo from './BcdLogo.jsx'

const root = ReactDOM.createRoot(document.getElementById('root'))

function showError(message) {
  root.render(
    <div className="boot-error">
      <div className="logo"><BcdLogo /></div>
      <h1>We couldn't connect to the analytics service</h1>
      <p>{message}</p>
      <button className="primary-btn" onClick={() => window.location.reload()}>Try again</button>
    </div>,
  )
}

async function fetchSession() {
  const response = await fetch('/api/auth/token', { cache: 'no-store' })
  if (!response.ok) throw new Error('Authentication with the analytics service failed.')
  return response.json()
}

async function bootstrap() {
  const session = await fetchSession()

  // Trusted auth: the local API server mints a short-lived token with the
  // secret key; the browser never sees credentials. The SDK calls
  // getAuthToken again whenever it needs a fresh token.
  init({
    thoughtSpotHost: session.host,
    authType: AuthType.TrustedAuthTokenCookieless,
    username: session.username,
    getAuthToken: async () => (await fetchSession()).token,
    customizations: {
      iconSpriteUrl: 'https://cdn.jsdelivr.net/gh/CamTS256/icon-store@main/plane.svg',
      content: { strings: { Spotter: 'BCD AI' } },
      style: {
        customCSS: {
          variables: {
            '--ts-var-root-background': 'transparent',
            '--ts-var-liveboard-layout-background': 'transparent',
            '--ts-var-liveboard-header-background': 'transparent',
            '--ts-var-viz-border-radius': '14px',
            '--ts-var-root-font-family': 'Inter, system-ui, sans-serif',
            '--ts-var-button--primary-background': '#542DFF',
            '--ts-var-button--primary--hover-background': '#0B0052',
            '--ts-var-chip--active-background': '#EEEAFF',
            '--ts-var-chip--active-color': '#542DFF',
            '--ts-var-liveboard-tile-border-radius': '14px',
          },
        },
      },
    },
  })

  // Swap iframes returned by BCD AI answers for fully authenticated embeds.
  startAutoMCPFrameRenderer({ frameParams: { height: '520px' } })

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}

bootstrap().catch((error) => showError(error.message))
