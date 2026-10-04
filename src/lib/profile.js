const NAME_KEY = 'just-pick-for-me:name'
const LIKED_KEY = 'just-pick-for-me:liked'
const DISLIKED_KEY = 'just-pick-for-me:disliked'

// ---------- name ----------

export function getName() {
    try {
        return localStorage.getItem(NAME_KEY) || ''
    } catch {
        return ''
    }
}

export function saveName(name) {
    try {
        localStorage.setItem(NAME_KEY, name.trim())
    } catch {
        // storage blocked (private window, etc.), app still works without it
    }
}

// ---------- likes & dislikes (stored as [{ id, name }]) ----------

function readList(key) {
    try {
        const saved = localStorage.getItem(key)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

function writeList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list))
    } catch {
        // ignore
    }
}

function addToList(key, place) {
    const list = readList(key).filter((p) => p.id !== place.id)
    list.push({ id: place.id, name: place.name })
    writeList(key, list)
}

function removeFromList(key, place) {
    writeList(key, readList(key).filter((p) => p.id !== place.id))
}

export function getLiked() {
    return readList(LIKED_KEY)
}

export function getDisliked() {
    return readList(DISLIKED_KEY)
}

// Liking a place un-dislikes it, and vice versa
export function addLiked(place) {
    removeFromList(DISLIKED_KEY, place)
    addToList(LIKED_KEY, place)
}

export function addDisliked(place) {
    removeFromList(LIKED_KEY, place)
    addToList(DISLIKED_KEY, place)
}