import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxA2tDZMu57sko9UN_uMc8OHNBErAAwVs",
    authDomain: "sdg-quiz-50315.firebaseapp.com",
    projectId: "sdg-quiz-50315",
    storageBucket: "sdg-quiz-50315.firebasestorage.app",
    messagingSenderId: "948981299829",
    appId: "1:948981299829:web:8eaf1137c05efae5c9963c",
    measurementId: "G-YR00EZ2LR0"
};

const VALID_MODES = new Set(["quiz_easy", "quiz_hard", "drag"]);
const MAX_SCORE = 10000;
let db = null;

function validateScoreEntry(name, score, mode, playerId) {
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const validName = /^[\p{L}\p{N} _-]{1,12}$/u.test(normalizedName);
    const validScore = Number.isInteger(score) && score >= 0 && score <= MAX_SCORE;
    const validPlayerId = typeof playerId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(playerId);

    if (!validName || !validScore || !VALID_MODES.has(mode) || !validPlayerId) {
        throw new Error("Ungültiger Leaderboard-Eintrag.");
    }

    return normalizedName;
}

function renderLeaderboard(container, entries) {
    container.replaceChildren();

    if (entries.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.innerText = "Noch keine Einträge.";
        container.appendChild(emptyState);
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = "lb-row";
        const player = document.createElement("span");
        player.innerText = `#${index + 1} ${String(entry.name ?? "Unbekannt").slice(0, 12)}`;
        const points = document.createElement("span");
        points.innerText = String(Number.isFinite(entry.score) ? entry.score : 0);
        row.append(player, points);
        container.appendChild(row);
    });
}

try {
    db = getFirestore(initializeApp(firebaseConfig));
} catch (error) {
    console.error("Firebase konnte nicht initialisiert werden.", error);
}

window.submitScoreToDB = async function submitScoreToDB(name, score, mode, playerId) {
    if (!db) throw new Error("Keine Datenbank-Verbindung.");
    const normalizedName = validateScoreEntry(name, score, mode, playerId);
    const entryReference = doc(db, "leaderboard", `${mode}_${playerId}`);
    let result = "lower";

    await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(entryReference);

        if (!snapshot.exists()) {
            transaction.set(entryReference, {
                name: normalizedName,
                score,
                mode,
                playerId,
                timestamp: serverTimestamp()
            });
            result = "new";
            return;
        }

        const previousScore = Number(snapshot.data().score) || 0;
        if (score > previousScore) {
            transaction.update(entryReference, {
                name: normalizedName,
                score,
                timestamp: serverTimestamp()
            });
            result = "updated";
        }
    });

    await window.loadLeaderboard(mode, "leaderboard-content");
    return result;
};

window.loadLeaderboard = async function loadLeaderboard(mode, containerId = "leaderboard-content") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!db || !VALID_MODES.has(mode)) {
        container.innerText = "Keine Datenbank-Verbindung.";
        return;
    }

    container.innerText = "Lade...";

    try {
        const leaderboardQuery = query(
            collection(db, "leaderboard"),
            where("mode", "==", mode),
            orderBy("score", "desc"),
            limit(20)
        );
        const snapshot = await getDocs(leaderboardQuery);
        renderLeaderboard(container, snapshot.docs.map(entry => entry.data()));
    } catch (error) {
        console.error("Leaderboard konnte nicht geladen werden.", error);
        container.innerText = "Leaderboard konnte nicht geladen werden.";
    }
};

window.dispatchEvent(new CustomEvent("firebase-ready", { detail: { connected: Boolean(db) } }));
