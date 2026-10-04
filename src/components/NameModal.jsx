import { useState } from 'react'

export default function NameModal({ initialName = '', onSave, onSkip }) {
    const [name, setName] = useState(initialName)

    function handleSubmit(e) {
        e.preventDefault()
        if (name.trim()) onSave(name.trim())
    }

    return (
        <div className="modal-backdrop">
            <form className="modal" onSubmit={handleSubmit}>
                <h2>Let's make this yours</h2>
                <label htmlFor="name">What should I call you?</label>
                <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                />
                <div className="modal-actions">
                    <button type="submit" disabled={!name.trim()}>Save & continue</button>
                    <button type="button" onClick={onSkip}>Skip</button>
                </div>
            </form>
        </div>
    )
}