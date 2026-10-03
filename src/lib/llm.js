import { CreateMLCEngine, hasModelInCache } from "@mlc-ai/web-llm";

// Small model (~900 MB) — fast enough for picking restaurants
export const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// Store the loading promise so the model only downloads once,
// even if React calls this twice (StrictMode does that in dev)
let enginePromise = null;

// Can this browser run it at all?
export function supportsWebGPU() {
    return "gpu" in navigator;
}

// Has this visitor already downloaded the model?
export async function isModelCached() {
    return hasModelInCache(MODEL_ID);
}

// Download (first time) or load from cache (after that)
export function loadEngine(onProgress) {
    if (!enginePromise) {
        enginePromise = CreateMLCEngine(MODEL_ID, {
            // report.progress is 0 to 1, report.text is a status message
            initProgressCallback: (report) => onProgress?.(report),
        });
    }
    return enginePromise;
}

// Ask the model to choose one place and explain why
// name is optional — if given, the reason speaks to them directly
export async function pickRestaurant(answers, places, name = "") {
    const eng = await loadEngine();

    const placeList = places
        .map((p, i) => `${i + 1}. ${p.name} (${p.cuisine || "unknown cuisine"}, ${p.type})`)
        .join("\n");

    const nameLine = name
        ? `Their name is ${name}. Speak to them by name in the reason. `
        : "";

    const reply = await eng.chat.completions.create({
        messages: [
            {
                role: "system",
                content:
                    "You help someone who feels overwhelmed by too many choices pick ONE restaurant. " +
                    "Choose only from the list given. Be warm and brief. " +
                    nameLine +
                    'Reply only as JSON: {"pick": "exact restaurant name", "reason": "one friendly sentence"}',
            },
            {
                role: "user",
                content: `What they want: ${answers.join(", ")}\n\nNearby places:\n${placeList}`,
            },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
    });

    return JSON.parse(reply.choices[0].message.content);
}