import { pipeline } from "@huggingface/transformers";

// Qwen 2.5 0.5B — open-weight model (Apache 2.0), small enough to run on the CPU
export const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

// Shown on the home page so first-time visitors know what to expect
export const MODEL_SIZE_LABEL = "about 500 MB";

// Show the model's prompts, raw replies, and timing in the browser console.
// Set to false before deploying.
const DEBUG = false;

// Print one model step as a collapsible group in the console
function debugLog(label, details) {
    if (!DEBUG) return;
    console.groupCollapsed(`🤖 ${label}`);
    for (const [key, value] of Object.entries(details)) {
        if (Array.isArray(value)) console.table(value);
        else console.log(`${key}:`, value);
    }
    console.groupEnd();
}

// Store the loading promise so the model only downloads once,
// even if React calls this twice (StrictMode does that in dev)
let generatorPromise = null;

// Can this browser run it? (any modern browser with WebAssembly)
export function isSupported() {
    return typeof WebAssembly === "object";
}

// Older name, kept so Home.jsx keeps working without changes
export const supportsWebGPU = isSupported;

// Has this visitor already downloaded the model?
// Transformers.js saves downloads in the browser's "transformers-cache"
export async function isModelCached() {
    try {
        const cache = await caches.open("transformers-cache");
        const keys = await cache.keys();
        return keys.some((req) => req.url.includes(MODEL_ID) && req.url.endsWith(".onnx"));
    } catch {
        return false;
    }
}

// Download (first time) or load from cache (after that)
export function loadEngine(onProgress) {
    if (!generatorPromise) {
        // The model comes in several files; track them all for one progress bar
        const files = {};

        generatorPromise = pipeline("text-generation", MODEL_ID, {
            dtype: "q8", // 8-bit version, which runs well on the CPU
            device: "wasm", // run on the CPU instead of the graphics card
            progress_callback: (p) => {
                if (p.status === "progress" && p.total) {
                    files[p.file] = { loaded: p.loaded, total: p.total };
                    const all = Object.values(files);
                    const loaded = all.reduce((sum, f) => sum + f.loaded, 0);
                    const total = all.reduce((sum, f) => sum + f.total, 0);
                    onProgress?.({ progress: loaded / total, text: `Loading ${p.file}…` });
                } else if (p.status === "ready") {
                    onProgress?.({ progress: 1, text: "Almost ready…" });
                }
            },
        }).catch((err) => {
            generatorPromise = null; // let the next attempt start fresh
            throw err;
        });
    }
    return generatorPromise;
}

// The CPU can't "lose" a graphics card, so this is now always false.
// Kept so Questions.jsx and Result.jsx keep working without changes.
export function isGpuLost() {
    return false;
}

// Let the browser draw the screen (like the spinner) before the CPU gets busy
function waitForPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

// Send one small request to the model and get its reply as text.
// prefix: words we write ourselves as the start of its answer; it continues from there
async function ask(generator, instructions, request, maxTokens, prefix = "") {
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: request },
    ];

    // Build the chat prompt as text, then add the start of the answer
    const prompt =
        generator.tokenizer.apply_chat_template(messages, {
            tokenize: false,
            add_generation_prompt: true,
        }) + prefix;

    const output = await generator(prompt, {
        max_new_tokens: maxTokens,
        // No randomness: small models follow instructions much better
        // when they always take their most confident answer
        do_sample: false,
        return_full_text: false, // only the new words, not the prompt
    });

    return (prefix + output[0].generated_text).trim();
}

// How we describe a place to the model and in fallback sentences
function describePlace(p) {
    const kind = p.type === "fast_food" ? "fast food" : p.type;
    const food = p.cuisine ? `${p.cuisine} ` : "";
    return `${food}${kind}, ${p.miles.toFixed(1)} miles away`;
}

// A friendly sentence built from real data, used if the model's sentence is off
function fallbackReason(place, name) {
    const who = name ? `${name}, ` : "";
    const menu = place.cuisine ? `its ${place.cuisine} menu` : "it";
    return (
        `${who}${place.name} is just ${place.miles.toFixed(1)} miles away, ` +
        `and ${menu} fits what you're in the mood for.`
    );
}

// Figure out which place the model meant, from a number OR a name
function readPick(reply, places) {
    const number = parseInt(reply.match(/\d+/)?.[0], 10);
    if (number >= 1 && number <= places.length) return number - 1;

    const lower = reply.toLowerCase();
    const byName = places.findIndex((p) => lower.includes(p.name.toLowerCase()));
    return byName >= 0 ? byName : 0; // nothing usable: closest place
}

// Keep only the first sentence, without stray quotes
function firstSentence(text) {
    const clean = text.split("\n")[0].replace(/^["']|["']$/g, "").trim();
    return clean.match(/^[^.!?]*[.!?]/)?.[0].trim() ?? clean;
}

// Is the model's sentence usable as a recommendation?
function isGoodReason(reason, chosen, places) {
    if (reason.length < 15 || reason.length > 200) return false;
    if (/^\d/.test(reason)) return false;

    // First person ("I ordered", "we enjoyed") means it's writing a review, not a recommendation
    if (/\b(I|I'm|I've|we|We|my|My|our|Our|us)\b/.test(reason)) return false;

    const lower = reason.toLowerCase();
    // Must be about the chosen place...
    if (!lower.includes(chosen.name.toLowerCase())) return false;
    // ...and not about any other place
    return !places.some((p) => p.id !== chosen.id && lower.includes(p.name.toLowerCase()));
}

// Choose one place and explain why, in two small steps
// Returns { index, reason }, always a valid index and a usable sentence
// name: optional, so the reason speaks to them directly
// likedIds: ids of places they've enjoyed before
export async function pickRestaurant(answers, places, name = "", likedIds = []) {
    await waitForPaint(); // show the spinner before the model starts working
    const generator = await loadEngine();
    const liked = new Set(likedIds);

    // ---- Step 1: pick a number ----
    const choices = places
        .map((p, i) => {
            const favorite = liked.has(p.id) ? " (one of their favorites)" : "";
            return `${i + 1}. ${p.name}: ${describePlace(p)}${favorite}`;
        })
        .join("\n");

    const pickInstructions =
        "You pick ONE restaurant from a numbered list for someone who finds choosing stressful. " +
        "If they want something familiar, favorites are a good choice. " +
        "Reply with only the number, like: 2";
    const pickRequest = `What they want: ${answers.join(", ")}\n\nChoices:\n${choices}\n\nWhich number?`;

    let start = performance.now();
    const pickReply = await ask(generator, pickInstructions, pickRequest, 3, "The best choice is number ");
    const pickMs = Math.round(performance.now() - start);

    const index = readPick(pickReply, places);
    const place = places[index];

    debugLog(`Step 1: pick (${pickMs} ms)`, {
        shortlist: places.map((p, i) => ({
            "#": i + 1,
            name: p.name,
            details: describePlace(p),
            favorite: liked.has(p.id),
        })),
        instructions: pickInstructions,
        request: pickRequest,
        rawReply: pickReply,
        interpretedAs: `#${index + 1} ${place.name}`,
    });

    // ---- Step 2: one warm sentence about ONLY the chosen place ----
    const greeting = name ? `${name}, ` : "";
    const example = `${greeting}Rosie's Diner is a cozy spot close by with the comfort food you're craving.`;

    const reasonInstructions =
        "You write ONE short, friendly sentence recommending a restaurant to someone. " +
        "Speak directly to them. Mention the restaurant by name. " +
        "Do not describe a visit or pretend you ate there. Under 25 words.\n" +
        `Example: ${example}`;
    const reasonRequest =
        `They wanted: ${answers.join(", ")}.\n` +
        `The restaurant: ${place.name}, ${describePlace(place)}` +
        (liked.has(place.id) ? ", one of their favorites" : "") +
        `\n\nWrite the sentence, starting with "${greeting}${place.name}".`;
        `"\n\nWrite one friendly sentence."`;

    start = performance.now();
    const reasonReply = await ask(
        generator,
        reasonInstructions,
        reasonRequest,
        30,
        `${greeting}${place.name} `
    );
    const reasonMs = Math.round(performance.now() - start);

    const reason = firstSentence(reasonReply);
    const usedModel = isGoodReason(reason, place, places);
    const finalReason = usedModel ? reason : fallbackReason(place, name);

    debugLog(`Step 2: reason (${reasonMs} ms)`, {
        instructions: reasonInstructions,
        request: reasonRequest,
        rawReply: reasonReply,
        firstSentence: reason,
        source: usedModel ? "✅ model's sentence" : "⚠️ fallback (model's sentence rejected)",
        shown: finalReason,
    });

    return { index, reason: finalReason };
}