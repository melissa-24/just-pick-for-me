const KEY = 'just-pick-for-me:name'

export function getName() {
    try {
        return localStorage.getItem(KEY) || ''
    } catch {
        return ''
    }
}

export function saveName(name) {
    try {
        localStorage.setItem(KEY, name.trim())
    } catch {
        // storage blocked (private window, etc.), app still works without it
    }
}