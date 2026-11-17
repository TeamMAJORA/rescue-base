import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installFormValidation } from './utils/formValidation'

// Field errors in our style instead of browser pop-ups, for every form (see utils/formValidation.js)
installFormValidation()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
