import { Analytics } from '@vercel/analytics/react';
import { redactAnalyticsUrl } from './analytics';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {import.meta.env.PROD && <Analytics beforeSend={redactAnalyticsUrl} />}
    </BrowserRouter>
  </React.StrictMode>
)
