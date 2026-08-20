import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/baloo-2'
import '@fontsource-variable/nunito'
import './styles/tokens.css'
import './styles/base.css'
import App from './app/App'
import { initSettingsSideEffects } from './lib/settings'
import { useBuiltinStore } from './lib/library'

initSettingsSideEffects()
void useBuiltinStore.getState().load()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
