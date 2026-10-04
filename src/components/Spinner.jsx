import { useEffect, useState } from 'react'

const MESSAGES = [
    "Looking at what's nearby…",
    'Thinking about what sounds good…',
    'Narrowing it down…',
    'Almost there…',
]

export default function Spinner({ title }) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
        }, 4000)
        return () => clearInterval(timer)
    }, [])

    return (
        <section className="spinner-screen">
            <div className="spinner" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{MESSAGES[index]}</p>
        </section>
    )
}