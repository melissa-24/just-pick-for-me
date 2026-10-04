import { useEffect, useState } from 'react'
import { supportsWebGPU, isModelCached, loadEngine, MODEL_SIZE_LABEL } from '../lib/llm'
import { getName, saveName } from '../lib/profile'
import NameModal from './NameModal'

export default function Home({ onStart }) {
    const supported = supportsWebGPU()
    const [cached, setCached] = useState(null) // null = still checking
    const [name, setName] = useState(getName())
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (!supported) return
        isModelCached().then((isCached) => {
            setCached(isCached)
            // Already set up? Start warming it up in the background
            if (isCached) loadEngine().catch(() => { }) // errors get handled on the loading screen
        })
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
                <p>Try Chrome, Edge, or Firefox on a laptop or desktop computer.</p>
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
                <div className="first-time">
                    <p>
                        <strong>{name ? 'Quick heads-up:' : 'First time here?'}</strong> The first visit
                        takes a few minutes to get set up, so grab a cup of coffee. After that, it starts
                        in seconds.
                    </p>
                    <p>Nothing gets installed on your computer. Everything stays inside your web browser.</p>

                    <details>
                        <summary>Is this safe?</summary>
                        <p>
                            Yes. Your browser saves the AI helper the same way it saves pictures from
                            websites you visit. It uses {MODEL_SIZE_LABEL} of space, so Wi-Fi is best the
                            first time. Nothing is installed, and you can remove it anytime by clearing
                            your browser's history and site data.
                        </p>
                    </details>
                </div>
            )}

            {!name && <p>I'll also ask for your location so I can find places nearby.</p>}
            <p>Everything runs on your computer. Your name, and answers never leave it.</p>
            <p>Your location is only used to look up nearby restaurants.</p>

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