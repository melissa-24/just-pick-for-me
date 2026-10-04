import { useEffect, useState } from 'react'
import { loadEngine } from '../lib/llm'

export default function Loading({ onReady }) {
    const [progress, setProgress] = useState(0)
    const [detail, setDetail] = useState('')
    const [error, setError] = useState(null)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let cancelled = false

        loadEngine((report) => {
            setProgress(report.progress)
            setDetail(report.text)
        })
            .then(() => {
                if (!cancelled) onReady()
            })
            .catch((err) => {
                console.error(err)
                if (!cancelled) setError('Something went wrong while getting things ready.')
            })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt])

    if (error) {
        return (
            <section>
                <h2>Hmm, that didn't work</h2>
                <p>{error}</p>
                <p>Check your internet connection and try again.</p>
                <button
                    onClick={() => {
                        setError(null)
                        setProgress(0)
                        setAttempt((a) => a + 1)
                    }}
                >
                    Try again
                </button>
            </section>
        )
    }

    const percent = Math.round(progress * 100)

    return (
        <section>
            <h2>Getting things ready…</h2>
            <p>
                Your AI helper wakes up each time you visit.
            </p>
            <p>
                The first time takes a few minutes while your browser sets things up. After that,
                this only takes a few seconds.
            </p>

            <div
                className="progress"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <p>{percent}%</p>

            <p className="progress-detail">{detail}</p>
        </section>
    )
}