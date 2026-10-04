import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import './assets/styles.css'

import Home from './components/Home'
import Loading from './components/Loading'
import Questions from './components/Questions'
import Result from './components/Result'

// import { getLocation, findNearbyPlaces } from './lib/places'
// getLocation().then(findNearbyPlaces).then((p) => console.table(p.slice(0, 15)))
// getLocation().then(findNearbyPlaces).then((p) => console.log(p.length, 'places'))

function App() {
  // 'home' → 'loading' → 'questions' → 'result'
  const [screen, setScreen] = useState('home')
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)

  return (
    <main>
      {screen === 'home' && <Home onStart={() => setScreen('loading')} />}
      {screen === 'loading' && <Loading onReady={() => setScreen('questions')} />}
      {screen === 'questions' && (
        <Questions
          onDone={(r) => {
            setResult(r)
            setScreen('result')
          }}
        />
      )}
      {screen === 'result' && result && (
        <Result
          result={result}
          onStartOver={() => setScreen('questions')}
          onHome={() => setScreen('home')}
        />
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// import { prebuiltAppConfig } from '@mlc-ai/web-llm'
// console.table(
//   prebuiltAppConfig.model_list
//     .filter((m) => m.model_id.toLowerCase().includes('gemma'))
//     .map((m) => ({ id: m.model_id, vramMB: m.vram_required_MB }))
// )