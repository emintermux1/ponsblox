import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { WalletProvider } from './lib/wallet.tsx'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>,
)
