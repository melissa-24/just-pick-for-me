import { useEffect, useRef, useState } from 'react'
import { QUESTIONS, EITHER, DEFAULT_RADIUS, filterPlaces, choosePlace } from '../lib/questions'
import { getLocation, findNearbyPlaces } from '../lib/places'
import { isGpuLost } from '../lib/llm'
import { getName } from '../lib/profile'

import Spinner from './Spinner'

export default function Questions({ onDone }) {
    const name = getName()
    const [step, setStep] = useState(0)
    const [answers, setAnswers] = useState({})
    const [status, setStatus] = useState('asking') // asking | thinking | error | gpu
    const [error, setError] = useState(null)
    const locationRef = useRef(null)

    // Ask for location right away, while she answers the questions
    useEffect(() => {
        if (!locationRef.current) {
            locationRef.current = getLocation()
            locationRef.current.catch(() => { }) // handled when we need it
        }
    }, [])

    function choose(option) {
        const question = QUESTIONS[step]
        const next = { ...answers, [question.id]: option }
        setAnswers(next)

        if (step < QUESTIONS.length - 1) {
            setStep(step + 1)
        } else {
            finish(next)
        }
    }

    async function finish(finalAnswers) {
        setStatus('thinking')
        setError(null)

        try {
            const location = await locationRef.current
            const radius = finalAnswers.distance?.value ?? DEFAULT_RADIUS
            const nearby = await findNearbyPlaces(location, radius)
            const shortlist = filterPlaces(nearby, finalAnswers)

            if (!shortlist.length) {
                throw new Error("I couldn't find any places nearby. Try picking \"Worth a short drive.\"")
            }

            const { place, reason } = await choosePlace(finalAnswers, shortlist)
            onDone({ place, reason, answers: finalAnswers, shortlist })
        } catch (err) {
            console.error(err)
            if (isGpuLost(err)) {
                setStatus('gpu')
            } else {
                setError(err.message || 'Something went wrong.')
                setStatus('error')
            }
        }
    }

    function retry() {
        locationRef.current = getLocation() // try location again in case it was blocked
        locationRef.current.catch(() => { })
        finish(answers)
    }

    function startOver() {
        setAnswers({})
        setStep(0)
        setError(null)
        setStatus('asking')
    }

    if (status === 'thinking') {
        return <Spinner title={name ? `Hang tight, ${name}…` : 'Thinking…'} />
    }

    if (status === 'gpu') {
        return (
            <section>
                <h2>{name ? `Sorry, ${name}, my helper got overwhelmed` : 'My helper got overwhelmed'}</h2>
                <p>Your computer paused it to keep things running smoothly. A quick reload fixes it.</p>
                <button onClick={() => window.location.reload()}>Reload and try again</button>
            </section>
        )
    }

    if (status === 'error') {
        return (
            <section>
                <h2>{name ? `Sorry, ${name}, I got stuck` : 'Hmm, I got stuck'}</h2>
                <p>{error}</p>
                <p className="hint">
                    If you blocked location, click the icon at the left of the address bar to allow it.
                </p>
                <button onClick={retry}>Try again</button>{' '}
                <button type="button" className="link-button" onClick={startOver}>
                    Start over
                </button>
            </section>
        )
    }

    const question = QUESTIONS[step]

    return (
        <section>
            {step === 0 && name && <p>Okay, {name}, let's narrow it down.</p>}
            <p className="step-count">
                Question {step + 1} of {QUESTIONS.length}
            </p>
            <h2>{question.prompt}</h2>

            <div className="options">
                {question.options.map((option) => (
                    <button key={option.label} className="option" onClick={() => choose(option)}>
                        {option.label}
                    </button>
                ))}
            </div>

            <button type="button" className="link-button" onClick={() => choose(EITHER)}>
                {EITHER.label}
            </button>

            {step > 0 && (
                <p>
                    <button type="button" className="link-button" onClick={() => setStep(step - 1)}>
                        ← Back
                    </button>
                </p>
            )}
        </section>
    )
}