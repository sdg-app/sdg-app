import { toNonNegativeInteger } from "./utils.js";

const STORAGE_KEY = "sdgAppData";

function createPlayerId() {
    if (globalThis.crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeUsername(value) {
    return typeof value === "string" ? value.trim().slice(0, 12) : "";
}

export function createDefaultStats() {
    return {
        playerId: createPlayerId(),
        username: "",
        coins: 0,
        scores: {
            quiz_easy: 0,
            quiz_hard: 0,
            drag: 0
        }
    };
}

export function normalizeStats(value) {
    const defaults = createDefaultStats();
    const data = value && typeof value === "object" ? value : {};
    const scores = data.scores && typeof data.scores === "object" ? data.scores : {};

    return {
        playerId: typeof data.playerId === "string" && data.playerId.length >= 8
            ? data.playerId
            : defaults.playerId,
        username: normalizeUsername(data.username),
        coins: toNonNegativeInteger(data.coins),
        scores: {
            quiz_easy: toNonNegativeInteger(scores.quiz_easy, toNonNegativeInteger(data.highScore)),
            quiz_hard: toNonNegativeInteger(scores.quiz_hard),
            drag: toNonNegativeInteger(scores.drag)
        }
    };
}

export function loadStats() {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        return storedValue ? normalizeStats(JSON.parse(storedValue)) : createDefaultStats();
    } catch (error) {
        console.warn("Gespeicherte Spieldaten konnten nicht gelesen werden.", error);
        return createDefaultStats();
    }
}

export function persistStats(stats) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStats(stats)));
        return true;
    } catch (error) {
        console.warn("Spieldaten konnten nicht gespeichert werden.", error);
        return false;
    }
}
