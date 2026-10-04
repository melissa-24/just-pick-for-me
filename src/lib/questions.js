import { pickRestaurant } from "./llm";
import { getName, getLiked, getDisliked } from "./profile";

// Each option has a short "describe" phrase that gets passed to the AI
export const QUESTIONS = [
    {
        id: "style",
        prompt: "Sit down or grab-and-go?",
        options: [
            { label: "Sit down", value: "sit", describe: "a sit-down meal" },
            { label: "Grab-and-go", value: "go", describe: "something quick to grab and go" },
        ],
    },
    {
        id: "feel",
        prompt: "Something light or something hearty?",
        options: [
            { label: "Light", value: "light", describe: "something light" },
            { label: "Hearty", value: "hearty", describe: "something hearty and filling" },
        ],
    },
    {
        id: "mood",
        prompt: "Familiar favorite or something new?",
        options: [
            { label: "Familiar", value: "familiar", describe: "familiar comfort food" },
            { label: "Something new", value: "new", describe: "something a little different" },
        ],
    },
    {
        id: "distance",
        prompt: "Close by, or worth a short drive?",
        options: [
            { label: "Close by", value: 2, describe: "close by" },
            { label: "Worth a short drive", value: 6, describe: "okay with a short drive" },
        ],
    },
];

// The small "doesn't matter" option on every question
export const EITHER = { label: "Either is fine", value: null, describe: null };

// How far to look if she picks "Either is fine" for distance
export const DEFAULT_RADIUS = 4;

// How many places to send the AI (small models choose better from fewer)
const SHORTLIST_SIZE = 8;

// Narrow the real places down using the answers we CAN check from map data,
// and skip anything she's said "never suggest this" to
export function filterPlaces(places, answers) {
    const disliked = new Set(getDisliked().map((d) => d.id));
    const pool = places.filter((p) => !disliked.has(p.id));

    let list = pool;
    const style = answers.style?.value;
    if (style === "sit") {
        list = pool.filter((p) => p.type === "restaurant");
    } else if (style === "go") {
        list = pool.filter((p) => p.type === "fast_food" || p.type === "cafe" || p.takeaway);
    }

    // If filtering left too few, fall back to everything nearby
    if (list.length === 0) list = pool;

    return list.slice(0, SHORTLIST_SIZE); // already sorted nearest first
}

// Turn the answers into phrases for the AI, skipping "Either is fine"
export function describeAnswers(answers) {
    const phrases = Object.values(answers)
        .map((option) => option.describe)
        .filter(Boolean);
    return phrases.length ? phrases : ["anything is fine"];
}

// For the result screen: what she answered to each question
export function summarizeAnswers(answers) {
    return QUESTIONS.map((q) => ({
        question: q.prompt,
        answer: answers[q.id]?.label ?? "Either is fine",
    }));
}

// Ask the AI to choose from a shortlist, used for the first pick and "pick again"
export async function choosePlace(answers, shortlist) {
    const likedIds = getLiked().map((l) => l.id);

    const { index, reason } = await pickRestaurant(
        describeAnswers(answers),
        shortlist,
        getName(),
        likedIds
    );

    // If the model gave a bad number, use the closest place instead
    const usable = index !== null;
    const place = usable ? shortlist[index] : shortlist[0];

    return {
        place,
        // Only use the model's sentence if it picked properly and wrote something real
        reason:
            usable && reason.length > 15
                ? reason
                : "It's close by and fits what you're in the mood for.",
    };
}