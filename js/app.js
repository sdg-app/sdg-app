import { DAILY_CHALLENGES, LEVEL_TITLES, SDGS, TARGETS } from "./data.js";
import { loadStats, persistStats } from "./storage.js";
import { shuffle } from "./utils.js";

const CONTINUE_COST = 10;
const pendingTimers = new Set();

let playerStats = loadStats();
let masterDeck = [];
let score = 0;
let lives = 3;
let currentSdg = null;
let quizOptionCount = 4;
let currentModeKey = "quiz_easy";
let currentDragData = [];
let selectedDragNumber = null;
let cardIndex = 0;
let flashcardDeck = [];
let randomFlashcards = false;
let streak = 0;
let currentRunBestStreak = 0;
let runAttempts = 0;
let runCorrect = 0;
let activeQuizPool = SDGS;
let hintUsed = false;
let isFocusMode = false;

function byId(id) {
    return document.getElementById(id);
}

function schedule(callback, delay) {
    const timerId = window.setTimeout(() => {
        pendingTimers.delete(timerId);
        callback();
    }, delay);

    pendingTimers.add(timerId);
}

function cancelScheduledTasks() {
    pendingTimers.forEach(timerId => window.clearTimeout(timerId));
    pendingTimers.clear();
}

function saveStats() {
    persistStats(playerStats);
    updateUIStats();
}

function updateUIStats() {
    byId("menu-coins").innerText = playerStats.coins;
    byId("ingame-coins-quiz").innerText = playerStats.coins;
    byId("ingame-coins-drag").innerText = playerStats.coins;
    updateStar("star-quiz-easy", playerStats.scores.quiz_easy, TARGETS.easy);
    updateStar("star-quiz-hard", playerStats.scores.quiz_hard, TARGETS.hard);
    updateStar("star-drag", playerStats.scores.drag, TARGETS.drag);
    updateProgressPanel();
    updateDailyChallenge();
}

function updateStar(id, currentScore, target) {
    const star = byId(id);
    const unlocked = currentScore >= target;
    star.innerText = unlocked ? "★" : "☆";
    star.classList.toggle("unlocked", unlocked);
}

function resetDeck(cards = SDGS) {
    masterDeck = shuffle(cards);
}

function drawCard() {
    if (masterDeck.length === 0) {
        resetDeck();
    }

    return masterDeck.pop();
}

function getTodayKey() {
    return new Date().toLocaleDateString("en-CA");
}

function ensureDailyChallenge() {
    const date = getTodayKey();
    if (playerStats.daily.date === date && playerStats.daily.goal > 0) return;

    const challengeIndex = [...date].reduce((total, character) => total + (Number(character) || 0), 0) % DAILY_CHALLENGES.length;
    const challenge = DAILY_CHALLENGES[challengeIndex];
    playerStats.daily = {
        date,
        type: challenge.type,
        goal: challenge.goal,
        progress: 0,
        claimed: false
    };
}

function getDailyChallenge() {
    ensureDailyChallenge();
    return DAILY_CHALLENGES.find(challenge => challenge.type === playerStats.daily.type) ?? DAILY_CHALLENGES[0];
}

function updateDailyProgress(type, amount = 1) {
    const challenge = getDailyChallenge();
    if (playerStats.daily.type !== type || playerStats.daily.claimed) return "";

    playerStats.daily.progress = Math.min(playerStats.daily.goal, playerStats.daily.progress + amount);
    if (playerStats.daily.progress < playerStats.daily.goal) return "";

    playerStats.daily.claimed = true;
    playerStats.coins += challenge.reward;
    return `Tagesziel geschafft: +${challenge.reward} 🪙`;
}

function getLevel() {
    return Math.floor(playerStats.xp / 40) + 1;
}

function getMastery(sdgNumber) {
    return playerStats.mastery[sdgNumber] ?? {
        correct: 0,
        incorrect: 0,
        reviews: 0,
        correctStreak: 0,
        seen: 0,
        lastSeen: 0
    };
}

function recordMastery(sdgNumber, result) {
    const mastery = getMastery(sdgNumber);
    if (result === "correct") {
        mastery.correct += 1;
        mastery.correctStreak += 1;
    }
    if (result === "incorrect") {
        mastery.incorrect += 1;
        mastery.correctStreak = 0;
    }
    if (result === "review") mastery.reviews += 1;
    playerStats.mastery[sdgNumber] = mastery;
}

function markSdgSeen(sdgNumber) {
    const mastery = getMastery(sdgNumber);
    playerStats.questionCounter += 1;
    mastery.seen += 1;
    mastery.lastSeen = playerStats.questionCounter;
    playerStats.mastery[sdgNumber] = mastery;
}

function getMasteredGoalsCount() {
    return SDGS.filter(sdg => {
        const mastery = getMastery(sdg.nr);
        const attempts = mastery.correct + mastery.incorrect;
        return mastery.correct >= 5
            && attempts > 0
            && mastery.correct / attempts >= 0.8
            && mastery.correctStreak >= 2;
    }).length;
}

function getAccuracy() {
    const totals = SDGS.reduce((result, sdg) => {
        const mastery = getMastery(sdg.nr);
        return { correct: result.correct + mastery.correct, attempts: result.attempts + mastery.correct + mastery.incorrect };
    }, { correct: 0, attempts: 0 });
    return totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : null;
}

function getFocusCards() {
    const ranked = [...SDGS].sort((first, second) => {
        const firstMastery = getMastery(first.nr);
        const secondMastery = getMastery(second.nr);
        const firstStaleness = Math.max(0, playerStats.questionCounter - firstMastery.lastSeen);
        const secondStaleness = Math.max(0, playerStats.questionCounter - secondMastery.lastSeen);
        const firstPriority = firstMastery.incorrect * 4 + firstMastery.reviews * 3 - firstMastery.correct + Math.min(firstStaleness, 24) * 0.35 + (firstMastery.seen === 0 ? 3 : 0);
        const secondPriority = secondMastery.incorrect * 4 + secondMastery.reviews * 3 - secondMastery.correct + Math.min(secondStaleness, 24) * 0.35 + (secondMastery.seen === 0 ? 3 : 0);
        return secondPriority - firstPriority;
    });

    return ranked.slice(0, 8);
}

function updateProgressPanel() {
    const level = getLevel();
    const xpForCurrentLevel = playerStats.xp % 40;
    const accuracy = getAccuracy();
    byId("level-title").innerText = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
    byId("level-label").innerText = `Level ${level}`;
    byId("xp-progress").style.width = `${(xpForCurrentLevel / 40) * 100}%`;
    byId("best-streak-value").innerText = playerStats.bestStreak;
    byId("accuracy-value").innerText = accuracy === null ? "–" : `${accuracy}%`;
    byId("mastered-goals-value").innerText = getMasteredGoalsCount();
}

function updateDailyChallenge() {
    const challenge = getDailyChallenge();
    byId("daily-challenge-text").innerText = challenge.label;
    byId("daily-progress-value").innerText = `${playerStats.daily.progress} / ${playerStats.daily.goal}`;
    byId("daily-reward").innerText = playerStats.daily.claimed ? "Erledigt ✓" : `+${challenge.reward} 🪙`;
}

function resetRun() {
    score = 0;
    lives = 3;
    streak = 0;
    currentRunBestStreak = 0;
    runAttempts = 0;
    runCorrect = 0;
    updateStreakDisplay();
}

function increaseStreak() {
    streak += 1;
    currentRunBestStreak = Math.max(currentRunBestStreak, streak);
    playerStats.bestStreak = Math.max(playerStats.bestStreak, streak);
    updateStreakDisplay();

    const rewards = [];
    if (streak > 0 && streak % 5 === 0) {
        playerStats.coins += 2;
        rewards.push(`Serie ${streak}: +2 🪙`);
    }
    if (streak > 0 && streak % 10 === 0 && playerStats.streakShields < 2) {
        playerStats.streakShields += 1;
        updateStreakDisplay();
        rewards.push("Serien-Schild erhalten");
    }

    if (rewards.length) return rewards.join(" · ");

    return streak >= 3 ? `Serie ${streak}` : "";
}

function breakStreak() {
    if (streak > 0 && playerStats.streakShields > 0) {
        playerStats.streakShields -= 1;
        updateStreakDisplay();
        return "Serien-Schild hat deine Serie geschützt.";
    }

    streak = 0;
    updateStreakDisplay();
    return "";
}

function updateStreakDisplay() {
    ["streak-label-quiz", "streak-label-drag"].forEach(id => {
        byId(id).innerText = streak ? `Serie ${streak}` : "Serie 0";
    });
    ["shield-label-quiz", "shield-label-drag"].forEach(id => {
        byId(id).innerText = `🛡 ${playerStats.streakShields}`;
        byId(id).setAttribute("aria-label", `${playerStats.streakShields} Serien-Schilde`);
    });
}

function getImgUrl(number) {
    const paddedNumber = number.toString().padStart(2, "0");
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/SDG-icon-DE-${paddedNumber}.svg`;
}

function showScreen(screenId) {
    cancelScheduledTasks();
    selectedDragNumber = null;
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    byId("game-over-screen").classList.remove("active");
    byId(screenId).classList.add("active");
}

function showMenu() {
    showScreen("menu-screen");
    updateUIStats();
}

function updateLivesDisplay() {
    const hearts = `${"❤️".repeat(lives)}${"🖤".repeat(3 - lives)}`;
    const label = lives === 1 ? "Ein Leben" : `${lives} Leben`;

    ["lives-label-quiz", "lives-label-drag"].forEach(id => {
        byId(id).innerText = hearts;
        byId(id).setAttribute("aria-label", label);
    });
}

function openGlobalLeaderboard() {
    showScreen("leaderboard-screen");
    switchLeaderboardTab("quiz_easy", document.querySelector("[data-leaderboard-mode='quiz_easy']"));
}

function switchLeaderboardTab(mode, button) {
    document.querySelectorAll(".tab-btn").forEach(tab => tab.classList.remove("active-tab"));
    button.classList.add("active-tab");

    if (window.loadLeaderboard) {
        window.loadLeaderboard(mode, "global-lb-content");
    }
}

function startQuiz(optionCount, mode = "normal") {
    quizOptionCount = optionCount;
    currentModeKey = optionCount > 4 ? "quiz_hard" : "quiz_easy";
    isFocusMode = mode === "focus";
    activeQuizPool = isFocusMode ? getFocusCards() : SDGS;
    resetRun();
    resetDeck(activeQuizPool);
    hintUsed = false;
    byId("score-label").innerText = score;
    updateLivesDisplay();
    showScreen("quiz-screen");
    nextQuizQuestion();
}

function getDynamicOptionCount() {
    if (isFocusMode) return Math.min(5, 4 + Math.floor(streak / 6));
    if (quizOptionCount > 4) return 6;
    return Math.min(6, 4 + Math.floor(streak / 4));
}

function getQuestionMode() {
    if (isFocusMode) {
        const focusModes = streak >= 4 ? [0, 2, 4] : [0, 2];
        return focusModes[Math.floor(Math.random() * focusModes.length)];
    }

    if (quizOptionCount === 4) {
        const normalModes = streak >= 6 ? [0, 2, 4] : streak >= 3 ? [0, 2] : [0];
        return normalModes[Math.floor(Math.random() * normalModes.length)];
    }

    const challengeModes = streak >= 5 ? [1, 2, 3, 4, 5] : [1, 2, 3];
    return challengeModes[Math.floor(Math.random() * challengeModes.length)];
}

function showSdgContext(sdg, isCorrect) {
    const context = byId("sdg-context");
    context.classList.remove("is-hidden");
    context.innerText = `${isCorrect ? "Richtig" : "Die richtige Antwort"}: SDG ${sdg.nr} – ${sdg.titel}. ${sdg.info}`;
}

function hideSdgContext() {
    const context = byId("sdg-context");
    context.classList.add("is-hidden");
    context.innerText = "";
}

function nextQuizQuestion() {
    currentSdg = drawCard();
    const display = byId("quiz-display");
    const grid = byId("quiz-options");
    const questionMode = getQuestionMode();
    const optionCount = getDynamicOptionCount();
    hintUsed = false;
    byId("hint-quiz-btn").disabled = false;
    byId("quiz-feedback").innerText = "";
    hideSdgContext();
    markSdgSeen(currentSdg.nr);

    display.style.background = "var(--card-bg)";
    display.style.color = "white";
    display.style.fontSize = "80px";
    display.style.padding = "0";
    display.style.textAlign = "initial";
    display.replaceChildren();

    if (questionMode === 0) {
        display.style.background = currentSdg.farbe;
        display.innerText = currentSdg.nr;
    } else if (questionMode === 1) {
        display.style.background = currentSdg.farbe;
        display.innerText = "?";
    } else if (questionMode === 2) {
        display.style.background = "#555";
        display.innerText = currentSdg.nr;
    } else if (questionMode === 3) {
        display.style.background = "#222";
        display.style.fontSize = "24px";
        display.style.padding = "20px";
        display.style.textAlign = "center";
        display.innerText = currentSdg.titel;
    } else if (questionMode === 4) {
        display.style.background = "white";
        const image = document.createElement("img");
        image.src = getImgUrl(currentSdg.nr);
        image.alt = `Symbol für SDG ${currentSdg.nr}`;
        display.appendChild(image);
    } else {
        display.style.background = "#222";
        display.style.fontSize = "24px";
        display.style.padding = "20px";
        display.style.textAlign = "center";
        display.innerText = currentSdg.titel;
    }

    const options = [currentSdg];
    while (options.length < optionCount) {
        const candidate = SDGS[Math.floor(Math.random() * SDGS.length)];
        if (!options.some(option => option.nr === candidate.nr)) {
            options.push(candidate);
        }
    }

    grid.replaceChildren();
    shuffle(options).forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-btn";
        button.dataset.nr = option.nr;

        if (questionMode === 3) {
            button.innerText = option.nr;
            button.style.backgroundColor = option.farbe;
            button.classList.add("number-option");
        } else if (questionMode === 5) {
            button.innerText = "Farbe";
            button.style.backgroundColor = option.farbe;
            button.classList.add("color-option");
        } else {
            button.innerText = option.titel;
        }

        button.addEventListener("click", () => handleQuizAnswer(option, button, questionMode, grid));
        grid.appendChild(button);
    });
}

function handleQuizAnswer(option, button, questionMode, grid) {
    const allButtons = [...grid.querySelectorAll("button")];
    const isCorrect = option.nr === currentSdg.nr;

    if (isCorrect) {
        allButtons.forEach(optionButton => { optionButton.disabled = true; });
        button.classList.add("correct");
        score += 1;
        playerStats.coins += 1;
        playerStats.xp += 10;
        runAttempts += 1;
        runCorrect += 1;
        recordMastery(currentSdg.nr, "correct");
        const streakMessage = increaseStreak();
        const dailyMessage = updateDailyProgress("quiz");
        saveStats();
        byId("score-label").innerText = score;
        byId("quiz-feedback").innerText = [streakMessage, dailyMessage].filter(Boolean).join(" · ");
        showSdgContext(currentSdg, true);
        schedule(nextQuizQuestion, 1500);
        return;
    }

    runAttempts += 1;
    recordMastery(currentSdg.nr, "incorrect");
    const shieldMessage = breakStreak();
    saveStats();
    if (!shieldMessage) lives -= 1;
    updateLivesDisplay();
    button.disabled = true;
    button.classList.add("wrong");
    byId("quiz-feedback").innerText = shieldMessage;
    showSdgContext(currentSdg, false);

    if (lives <= 0) {
        const correctButton = allButtons.find(optionButton => Number(optionButton.dataset.nr) === currentSdg.nr);
        correctButton?.classList.add("correct");
        allButtons.forEach(optionButton => { optionButton.disabled = true; });
        finishGame();
    }
}

function useQuizHint() {
    if (hintUsed || !currentSdg) return;
    if (playerStats.coins < 3) {
        byId("quiz-feedback").innerText = "Du brauchst 3 Coins für einen Hinweis.";
        return;
    }

    const wrongOptions = [...byId("quiz-options").querySelectorAll("button")]
        .filter(button => Number(button.dataset.nr) !== currentSdg.nr && !button.disabled);
    if (!wrongOptions.length) return;

    const option = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    option.disabled = true;
    option.classList.add("hint-eliminated");
    playerStats.coins -= 3;
    hintUsed = true;
    byId("hint-quiz-btn").disabled = true;
    byId("quiz-feedback").innerText = "Ein falscher Begriff wurde entfernt.";
    saveStats();
}

function startDragDrop() {
    currentModeKey = "drag";
    resetRun();
    resetDeck();
    byId("score-label-drag").innerText = score;
    updateLivesDisplay();
    showScreen("drag-screen");
    loadDragRound();
}

function loadDragRound() {
    selectedDragNumber = null;
    currentDragData = Array.from({ length: 4 }, () => drawCard());
    currentDragData.forEach(sdg => markSdgSeen(sdg.nr));
    const zones = byId("drop-zones");
    const pool = byId("drag-pool");
    zones.replaceChildren();
    pool.replaceChildren();

    byId("check-drag-btn").style.display = "block";
    byId("check-drag-btn").disabled = false;
    byId("next-drag-btn").style.display = "none";
    byId("drag-instructions").innerText = "Wähle eine Zahl aus und anschließend das passende Ziel.";

    currentDragData.forEach((sdg, index) => {
        const zone = document.createElement("div");
        zone.className = "drop-zone";
        zone.id = `zone-${index}`;
        zone.dataset.correctNr = sdg.nr;
        zone.dataset.occupiedBy = "";
        zone.dataset.originalText = sdg.titel;
        zone.innerText = sdg.titel;
        zone.tabIndex = 0;
        zone.setAttribute("role", "button");
        zone.setAttribute("aria-label", `${sdg.titel}: Ablageziel`);
        zone.addEventListener("dragover", event => event.preventDefault());
        zone.addEventListener("drop", event => {
            event.preventDefault();
            handleDrop(zone, event.dataTransfer.getData("nr"), event.dataTransfer.getData("color"));
        });
        zone.addEventListener("click", () => {
            if (selectedDragNumber === null) return;
            const item = byId(`d${selectedDragNumber}`);
            handleDrop(zone, String(selectedDragNumber), item?.dataset.color ?? "#555");
        });
        zone.addEventListener("keydown", event => {
            if ((event.key === "Enter" || event.key === " ") && selectedDragNumber !== null) {
                event.preventDefault();
                const item = byId(`d${selectedDragNumber}`);
                handleDrop(zone, String(selectedDragNumber), item?.dataset.color ?? "#555");
            }
        });
        zones.appendChild(zone);
    });

    shuffle(currentDragData).forEach(sdg => createDragItem(sdg.nr, sdg.farbe, pool));
}

function createDragItem(number, color, container) {
    if (byId(`d${number}`)) return;

    const box = document.createElement("button");
    box.type = "button";
    box.id = `d${number}`;
    box.className = "drag-box";
    box.style.backgroundColor = color;
    box.innerText = number;
    box.dataset.color = color;
    box.draggable = true;
    box.setAttribute("aria-label", `SDG ${number} auswählen`);
    box.addEventListener("click", event => {
        event.stopPropagation();
        selectDragItem(number);
    });
    box.addEventListener("dragstart", event => {
        event.dataTransfer.setData("nr", number);
        event.dataTransfer.setData("color", color);
    });
    container.appendChild(box);
}

function selectDragItem(number) {
    selectedDragNumber = selectedDragNumber === number ? null : number;
    document.querySelectorAll(".drag-box").forEach(box => {
        const selected = Number(box.innerText) === selectedDragNumber;
        box.classList.toggle("selected", selected);
        box.setAttribute("aria-pressed", String(selected));
    });
}

function resetZone(zone) {
    zone.classList.remove("filled", "correct", "wrong", "shake-it");
    zone.dataset.occupiedBy = "";
    zone.innerText = zone.dataset.originalText;
}

function moveDragItemToPool(number, color) {
    if (!number) return;
    const item = byId(`d${number}`);
    const sourceZone = item?.closest(".drop-zone");
    if (sourceZone) resetZone(sourceZone);
    item?.remove();
    createDragItem(number, color, byId("drag-pool"));
    selectedDragNumber = null;
}

function handleDrop(zone, number, color) {
    if (!number) return;

    if (zone.dataset.occupiedBy && zone.dataset.occupiedBy !== number) {
        const previousNumber = zone.dataset.occupiedBy;
        const previousItem = byId(`d${previousNumber}`);
        moveDragItemToPool(previousNumber, previousItem?.dataset.color ?? "#555");
    }

    const dragItem = byId(`d${number}`);
    const sourceZone = dragItem?.closest(".drop-zone");
    if (sourceZone && sourceZone !== zone) resetZone(sourceZone);
    dragItem?.remove();

    zone.replaceChildren();
    zone.classList.add("filled");
    zone.dataset.occupiedBy = number;
    createDragItem(number, color, zone);

    const label = document.createElement("small");
    label.className = "drop-zone-label";
    label.innerText = zone.dataset.originalText;
    zone.appendChild(label);
    selectedDragNumber = null;
}

function checkDragAssignments() {
    let errors = 0;

    currentDragData.forEach((sdg, index) => {
        const zone = byId(`zone-${index}`);
        const correct = zone.dataset.occupiedBy === zone.dataset.correctNr;
        zone.classList.add(correct ? "correct" : "wrong");
        runAttempts += 1;
        if (correct) {
            runCorrect += 1;
            recordMastery(sdg.nr, "correct");
        } else {
            recordMastery(sdg.nr, "incorrect");
        }
        if (!correct) {
            zone.classList.add("shake-it");
            errors += 1;
        }
    });

    if (errors === 0) {
        score += 5;
        playerStats.coins += 3;
        playerStats.xp += 35;
        const streakMessage = increaseStreak();
        const dailyMessage = updateDailyProgress("drag");
        saveStats();
        byId("score-label-drag").innerText = score;
        byId("drag-instructions").innerText = ["Perfekte Runde: +5 Punkte", streakMessage, dailyMessage].filter(Boolean).join(" · ");
        byId("check-drag-btn").style.display = "none";
        byId("next-drag-btn").style.display = "block";
        return;
    }

    const shieldMessage = breakStreak();
    if (!shieldMessage) lives -= 1;
    saveStats();
    updateLivesDisplay();
    byId("drag-instructions").innerText = shieldMessage || "Nicht ganz – die Runde wird neu gemischt.";
    byId("check-drag-btn").disabled = true;
    schedule(() => {
        if (lives <= 0) finishGame();
        else loadDragRound();
    }, 900);
}

function finishGame() {
    cancelScheduledTasks();
    if (score > playerStats.scores[currentModeKey]) {
        playerStats.scores[currentModeKey] = score;
        saveStats();
    }

    byId("go-score").innerText = score;
    byId("go-best").innerText = playerStats.scores[currentModeKey];
    const runAccuracy = runAttempts ? Math.round((runCorrect / runAttempts) * 100) : 0;
    byId("game-over-insight").innerText = `Trefferquote: ${runAccuracy}% · Beste Serie: ${currentRunBestStreak} · ${getMasteredGoalsCount()} Ziele sicher`;
    byId("player-name").value = playerStats.username;
    byId("submit-container").style.display = "flex";
    byId("submit-message").style.display = "none";

    const submitButton = document.querySelector(".submit-btn");
    submitButton.disabled = false;
    submitButton.innerText = "Score senden";

    const continueButton = byId("btn-continue");
    const canContinue = playerStats.coins >= CONTINUE_COST;
    continueButton.disabled = !canContinue;
    continueButton.innerText = canContinue
        ? `Weiterspielen (-${CONTINUE_COST} 🪙)`
        : `Zu wenig Coins (${playerStats.coins}/${CONTINUE_COST})`;

    byId("game-over-screen").classList.add("active");
    window.loadLeaderboard?.(currentModeKey, "leaderboard-content");
}

function validatePlayerName(value) {
    const name = value.trim();
    const valid = /^[\p{L}\p{N} _-]{1,12}$/u.test(name);
    return { name, valid };
}

async function submitScore(event) {
    event.preventDefault();
    const input = byId("player-name");
    const { name, valid } = validatePlayerName(input.value);

    input.setCustomValidity(valid ? "" : "Bitte 1–12 Buchstaben, Zahlen, Leerzeichen, _ oder - verwenden.");
    if (!valid) {
        input.reportValidity();
        return;
    }

    if (!window.submitScoreToDB) {
        showSubmitMessage("Die Datenbank ist momentan nicht erreichbar.");
        return;
    }

    playerStats.username = name;
    saveStats();
    const submitButton = document.querySelector(".submit-btn");
    submitButton.disabled = true;
    submitButton.innerText = "Wird gesendet…";

    try {
        const result = await window.submitScoreToDB(name, score, currentModeKey, playerStats.playerId);
        byId("submit-container").style.display = "none";
        const messages = {
            new: "Neuer Eintrag erstellt!",
            updated: "Highscore verbessert! 🎉",
            lower: "Dein alter Highscore war besser."
        };
        showSubmitMessage(messages[result] ?? "Gesendet.");
    } catch {
        submitButton.disabled = false;
        submitButton.innerText = "Erneut senden";
        showSubmitMessage("Senden fehlgeschlagen. Bitte versuche es erneut.");
    }
}

function showSubmitMessage(message) {
    const element = byId("submit-message");
    element.innerText = message;
    element.style.display = "block";
}

function buyContinue() {
    if (playerStats.coins < CONTINUE_COST) return;
    playerStats.coins -= CONTINUE_COST;
    saveStats();
    lives = 3;
    updateLivesDisplay();
    byId("game-over-screen").classList.remove("active");
    if (currentModeKey.startsWith("quiz")) nextQuizQuestion();
    else loadDragRound();
}

function restartGame() {
    if (currentModeKey === "quiz_easy") startQuiz(4);
    else if (currentModeKey === "quiz_hard") startQuiz(6);
    else startDragDrop();
}

function startFlashcards(random) {
    randomFlashcards = random;
    flashcardDeck = random ? shuffle(SDGS) : [...SDGS];
    cardIndex = 0;
    showScreen("flashcard-screen");
    renderCardFront();
}

function renderCardFront() {
    const sdg = flashcardDeck[cardIndex];
    markSdgSeen(sdg.nr);
    const card = byId("main-card");
    card.style.background = sdg.farbe;
    card.replaceChildren();
    const number = document.createElement("span");
    number.className = "flashcard-number";
    number.innerText = sdg.nr;
    card.appendChild(number);
    card.dataset.side = "front";
    byId("card-progress").innerText = `${cardIndex + 1} / ${flashcardDeck.length}`;
}

function renderCardBack() {
    const sdg = flashcardDeck[cardIndex];
    const card = byId("main-card");
    card.style.background = "white";
    card.replaceChildren();
    const image = document.createElement("img");
    image.src = getImgUrl(sdg.nr);
    image.alt = `Symbol für SDG ${sdg.nr}: ${sdg.titel}`;
    card.appendChild(image);
    card.dataset.side = "back";
}

function flipCard() {
    if (byId("main-card").dataset.side === "front") renderCardBack();
    else renderCardFront();
}

function rateFlashcard(rating) {
    const sdg = flashcardDeck[cardIndex];
    if (!sdg) return;

    if (rating === "know") {
        recordMastery(sdg.nr, "correct");
        playerStats.xp += 4;
    } else {
        recordMastery(sdg.nr, "review");
        if (rating === "unsure") recordMastery(sdg.nr, "incorrect");
        if (rating === "review") {
            const reviewIndex = Math.min(cardIndex + 3, flashcardDeck.length);
            flashcardDeck.splice(reviewIndex, 0, sdg);
        }
    }

    updateDailyProgress("flashcards");
    saveStats();
    nextCard();
}

function nextCard() {
    cardIndex = (cardIndex + 1) % flashcardDeck.length;
    if (cardIndex === 0 && randomFlashcards) flashcardDeck = shuffle(SDGS);
    renderCardFront();
}

function previousCard() {
    cardIndex = (cardIndex - 1 + flashcardDeck.length) % flashcardDeck.length;
    renderCardFront();
}

function showTable() {
    showScreen("table-screen");
    const tableContent = byId("table-content");
    tableContent.replaceChildren();

    SDGS.forEach(sdg => {
        const row = document.createElement("div");
        row.className = "list-row";
        const number = document.createElement("div");
        number.className = "row-nr";
        number.style.backgroundColor = sdg.farbe;
        number.innerText = sdg.nr;
        const image = document.createElement("img");
        image.className = "row-img";
        image.src = getImgUrl(sdg.nr);
        image.alt = `Symbol für SDG ${sdg.nr}`;
        const title = document.createElement("div");
        title.className = "row-text";
        title.innerText = sdg.titel;
        row.append(number, image, title);
        tableContent.appendChild(row);
    });
}

function registerEventListeners() {
    byId("open-leaderboard-btn").addEventListener("click", openGlobalLeaderboard);
    byId("start-quiz-easy-btn").addEventListener("click", () => startQuiz(4));
    byId("start-quiz-hard-btn").addEventListener("click", () => startQuiz(6));
    byId("start-focus-btn").addEventListener("click", () => startQuiz(4, "focus"));
    byId("start-drag-btn").addEventListener("click", startDragDrop);
    byId("start-flashcards-btn").addEventListener("click", () => startFlashcards(false));
    byId("start-random-flashcards-btn").addEventListener("click", () => startFlashcards(true));
    byId("show-table-btn").addEventListener("click", showTable);
    document.querySelectorAll("[data-action='show-menu']").forEach(button => button.addEventListener("click", showMenu));
    document.querySelectorAll("[data-leaderboard-mode]").forEach(button => {
        button.addEventListener("click", () => switchLeaderboardTab(button.dataset.leaderboardMode, button));
    });
    byId("check-drag-btn").addEventListener("click", checkDragAssignments);
    byId("next-drag-btn").addEventListener("click", loadDragRound);
    byId("hint-quiz-btn").addEventListener("click", useQuizHint);
    byId("drag-pool").addEventListener("dragover", event => event.preventDefault());
    byId("drag-pool").addEventListener("drop", event => {
        event.preventDefault();
        moveDragItemToPool(event.dataTransfer.getData("nr"), event.dataTransfer.getData("color"));
    });
    byId("drag-pool").addEventListener("click", event => {
        if (event.target !== event.currentTarget || selectedDragNumber === null) return;
        const item = byId(`d${selectedDragNumber}`);
        moveDragItemToPool(String(selectedDragNumber), item?.dataset.color ?? "#555");
    });
    byId("main-card").addEventListener("click", flipCard);
    byId("flashcard-know-btn").addEventListener("click", () => rateFlashcard("know"));
    byId("flashcard-unsure-btn").addEventListener("click", () => rateFlashcard("unsure"));
    byId("flashcard-review-btn").addEventListener("click", () => rateFlashcard("review"));
    byId("previous-card-btn").addEventListener("click", previousCard);
    byId("next-card-btn").addEventListener("click", nextCard);
    byId("submit-container").addEventListener("submit", submitScore);
    byId("btn-continue").addEventListener("click", buyContinue);
    byId("restart-game-btn").addEventListener("click", restartGame);
    byId("game-over-menu-btn").addEventListener("click", showMenu);
    window.addEventListener("firebase-ready", () => {
        const activeMode = document.querySelector(".tab-btn.active-tab")?.dataset.leaderboardMode;
        if (byId("leaderboard-screen").classList.contains("active") && activeMode) {
            window.loadLeaderboard?.(activeMode, "global-lb-content");
        }
    });
}

registerEventListeners();
ensureDailyChallenge();
persistStats(playerStats);
updateUIStats();
