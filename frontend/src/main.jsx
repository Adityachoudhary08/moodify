import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import { AuthProvider } from './features/Auth/auth.context.jsx'
import { SongContextProvider } from './features/Home/Song.context.jsx'
import { MoodProvider } from './features/shared/MoodContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MoodProvider>
        <SongContextProvider>
          <App />
        </SongContextProvider>
      </MoodProvider>
    </AuthProvider>
  </StrictMode>
)
