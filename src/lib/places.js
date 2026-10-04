// Public Overpass servers — if one is busy or rate-limits us, try the next
const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
];

// Ask the browser for the user's location (they'll see a permission prompt)
export function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Location isn't available in this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => reject(new Error("I need your location to find places nearby.")),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 }
        );
    });
}

// Straight-line distance in miles between two points
function milesBetween(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Remember results for this browser session so repeat lookups
// don't hit the shared server again (rounded so tiny GPS drift still matches)
function cacheKey(location, radiusMiles) {
    return `places:${location.lat.toFixed(3)},${location.lon.toFixed(3)}:${radiusMiles}`;
}

function readCache(key) {
    try {
        const saved = sessionStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function writeCache(key, places) {
    try {
        sessionStorage.setItem(key, JSON.stringify(places));
    } catch {
        // storage blocked or full, fine to skip
    }
}

// Send the query to each server in turn until one answers
async function queryOverpass(query) {
    let lastError;
    for (const url of OVERPASS_SERVERS) {
        try {
            const res = await fetch(url, {
                method: "POST",
                body: "data=" + encodeURIComponent(query),
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
            if (res.ok) return await res.json();
            lastError = new Error(`${url} responded ${res.status}`);
        } catch (err) {
            lastError = err;
        }
        console.warn("Overpass server failed, trying next:", lastError.message);
    }
    console.error(lastError);
    throw new Error("Couldn't reach the restaurant map right now.");
}

// Find restaurants, fast food, and cafes near a location using OpenStreetMap
// radiusMiles: how far to look (e.g. 3 for "close by", 8 for "worth a drive")
export async function findNearbyPlaces(location, radiusMiles = 3) {
    const key = cacheKey(location, radiusMiles);
    const cached = readCache(key);
    if (cached) return cached;

    const radiusMeters = Math.round(radiusMiles * 1609.34);

    const query = `
    [out:json][timeout:25];
    nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["name"]
      (around:${radiusMeters},${location.lat},${location.lon});
    out center tags;
  `;

    const data = await queryOverpass(query);

    const places = data.elements
        .map((el) => {
            // Points have lat/lon directly; buildings ("ways") have a center
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            const t = el.tags || {};
            return {
                id: `${el.type}/${el.id}`,
                name: t.name,
                type: t.amenity, // restaurant | fast_food | cafe
                cuisine: t.cuisine ? t.cuisine.replace(/_/g, " ").replace(/;/g, ", ") : "",
                takeaway: t.takeaway === "yes" || t.takeaway === "only",
                address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
                lat,
                lon,
                miles: lat && lon ? milesBetween(location, { lat, lon }) : null,
            };
        })
        .filter((p) => p.name && p.lat && p.lon)
        .sort((a, b) => a.miles - b.miles);

    writeCache(key, places);
    return places;
}