import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { hydrateFromApi } from './data/hydrate'
import { startSync } from './store'
import './index.css'

// Load data from the API first; fall back to the built-in demo data if it's unreachable.
hydrateFromApi().then((online) => {
  if (online) startSync()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  )
})
