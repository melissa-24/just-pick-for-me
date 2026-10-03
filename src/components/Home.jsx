import { useEffect, useState } from 'react'
import { supportsWebGPU, isModelCached } from '../lib/llm'
import { getName, saveName } from '../lib/profile'
import NameModal from './NameModal'

export default function Home({ onStart }) {
    const supported = supportsWebGPU()
    const [cached, setCached] = useState(null) // null = still checking
    const [name, setName] = useState(getName())
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (supported) isModelCached().then(setCached)
    }, [supported])

    function handleStart() {
        if (name) onStart()
        else setShowModal(true)
    }

    function handleSave(newName) {
        saveName(newName)
        setName(newName)
        setShowModal(false)
        onStart()
    }

    function handleSkip() {
        setShowModal(false)
        onStart()
    }

    if (!supported) {
        return (
            <section>
                <h1>Just Pick For Me</h1>
                <p>Sorry, this browser can't run the helper yet.</p>
                <p>Try Chrome or Edge on a laptop or desktop computer.</p>
            </section>
        )
    }

    return (
        <section>
            <h1>Just Pick For Me</h1>

            {name ? (
                <p>Welcome back, {name}! Ready to figure out where to eat?</p>
            ) : (
                <p>Can't decide where to eat? Answer a few quick questions and I'll pick for you.</p>
            )}

            {cached === false && (
                <p>
                    <strong>{name ? 'Quick heads-up:' : 'First time here?'}</strong> Your browser will
                    download a small AI helper (about 900 MB). It only happens once, then it's saved
                    for next time. Wi-Fi is best.
                </p>
            )}

            {!name && <p>I'll also ask for your location so I can find places nearby.</p>}
            <p>Everything runs on your computer. Your name, location, and answers never leave it.</p>

            <button onClick={handleStart} disabled={cached === null}>
                {cached ? "Let's pick!" : "Let's start"}
            </button>

            {name && (
                <p>
                    <button type="button" className="link-button" onClick={() => setShowModal(true)}>
                        Not {name}? Change name
                    </button>
                </p>
            )}

            {showModal && (
                <NameModal initialName={name} onSave={handleSave} onSkip={handleSkip} />
            )}
        </section>
    )
}