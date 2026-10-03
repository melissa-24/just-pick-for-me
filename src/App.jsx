import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import './assets/styles.css'

import Home from './components/Home'

function App() {
  // 'home' → 'loading' → 'questions' → 'result'
  const [screen, setScreen] = useState('home')
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)

  return (
    <main>
      {screen === 'home' && <Home onStart={() => setScreen('loading')} />}
      {screen === 'loading' && <p>Loading goes here</p>}
      {screen === 'questions' && <p>Questions go here</p>}
      {screen === 'result' && <p>Result goes here</p>}
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)