import { useState } from 'react'
import { summarizeAnswers, choosePlace } from '../lib/questions'
import { isGpuLost } from '../lib/llm'
import { getName, getDisliked, addLiked, addDisliked } from '../lib/profile'
import Spinner from './Spinner'

export default function Result({ result, onStartOver, onHome }) {
    const name = getName()
    const [current, setCurrent] = useState({ place: result.place, reason: result.reason })
    const [excluded, setExcluded] = useState([]) // "not tonight" places, this visit only
    const [status, setStatus] = useState('idle') // idle | thinking | empty | error
    const [note, setNote] = useState('')

    const { place, reason } = current
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`

    async function pickAgain(neverAgain) {
        if (neverAgain) addDisliked(place)
        setNote('')

        const nextExcluded = [...excluded, place.id]
        setExcluded(nextExcluded)

        const disliked = new Set(getDisliked().map((d) => d.id))
        const remaining = result.shortlist.filter(
            (p) => !nextExcluded.includes(p.id) && !disliked.has(p.id)
        )

        if (!remaining.length) {
            setStatus('empty')
            return
        }

        setStatus('thinking')
        try {
            setCurrent(await choosePlace(result.answers, remaining))
            setStatus('idle')
        } catch (err) {
            console.error(err)
            setStatus(isGpuLost(err) ? 'gpu' : 'error')
        }
    }

    function goingHere() {
        addLiked(place)
        setNote(`Saved! I'll remember you liked ${place.name}.`)
    }

    if (status === 'thinking') {
        return <Spinner title={name ? `Okay, ${name}, finding another one…` : 'Finding another one…'} />
    }

    if (status === 'empty') {
        return (
            <section>
                <h2>That's everything that matched</h2>
                <p>Want to try different answers? "Worth a short drive" opens up more places.</p>
                <button onClick={onStartOver}>Answer again</button>
            </section>
        )
    }

    if (status === 'error') {
        return (
            <section>
                <h2>{name ? `Sorry, ${name}, I got stuck` : 'Hmm, I got stuck'}</h2>
                <p>Trying again usually fixes it.</p>
                <button onClick={() => pickAgain(false)}>Try again</button>{' '}
                <button type="button" className="link-button" onClick={onStartOver}>
                    Start over
                </button>
            </section>
        )
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

    return (
        <section>
            <p className="step-count">{name ? `${name}, tonight's pick is…` : "Tonight's pick is…"}</p>
            <h2 className="pick-name">{place.name}</h2>
            <p className="pick-reason">{reason}</p>

            <p className="pick-details">
                {place.cuisine && <span>{place.cuisine} · </span>}
                {place.miles.toFixed(1)} miles away
                <br />
                {place.address || 'Address not listed on the map, but directions will get you there.'}
            </p>

            <div className="result-actions">
                <button onClick={goingHere}>Let's go here!</button>
                <a className="button-link" href={directionsUrl} target="_blank" rel="noreferrer">
                    Directions
                </a>
            </div>
            {note && <p className="note">{note}</p>}

            <div className="result-actions secondary">
                <button type="button" onClick={() => pickAgain(false)}>
                    Not tonight, pick another
                </button>
                <button type="button" onClick={() => pickAgain(true)}>
                    Never suggest this place
                </button>
            </div>

            <div className="answers">
                <p><strong>Because you said:</strong></p>
                <ul>
                    {summarizeAnswers(result.answers).map((a) => (
                        <li key={a.question}>
                            {a.question} <strong>{a.answer}</strong>
                        </li>
                    ))}
                </ul>
            </div>

            <p>
                <button type="button" className="link-button" onClick={onStartOver}>
                    Answer again
                </button>{' '}
                ·{' '}
                <button type="button" className="link-button" onClick={onHome}>
                    Home
                </button>
            </p>
        </section>
    )
}