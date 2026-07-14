import { SDGS, TARGETS } from "./data.js";
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
}

function updateStar(id, currentScore, target) {
    const star = byId(id);
    const unlocked = currentScore >= target;
    star.innerText = unlocked ? "★" : "☆";
    star.classList.toggle("unlocked", unlocked);
}

function resetDeck() {
    masterDeck = shuffle(SDGS);
}

function drawCard() {
    if (masterDeck.length === 0) {
        resetDeck();
    }

    return masterDeck.pop();
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

function startQuiz(optionCount) {
    quizOptionCount = optionCount;
    currentModeKey = optionCount > 4 ? "quiz_hard" : "quiz_easy";
    score = 0;
    lives = 3;
    resetDeck();
    byId("score-label").innerText = score;
    updateLivesDisplay();
    showScreen("quiz-screen");
    nextQuizQuestion();
}

function nextQuizQuestion() {
    currentSdg = drawCard();
    const display = byId("quiz-display");
    const grid = byId("quiz-options");
    const questionMode = quizOptionCount > 4 ? Math.floor(Math.random() * 3) + 1 : 0;

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
    } else {
        display.style.background = "#222";
        display.style.fontSize = "24px";
        display.style.padding = "20px";
        display.style.textAlign = "center";
        display.innerText = currentSdg.titel;
    }

    const options = [currentSdg];
    while (options.length < quizOptionCount) {
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
        saveStats();
        byId("score-label").innerText = score;
        schedule(nextQuizQuestion, 900);
        return;
    }

    lives -= 1;
    updateLivesDisplay();
    button.disabled = true;
    button.classList.add("wrong");

    if (lives <= 0) {
        const correctButton = allButtons.find(optionButton => Number(optionButton.dataset.nr) === currentSdg.nr);
        correctButton?.classList.add("correct");
        allButtons.forEach(optionButton => { optionButton.disabled = true; });
        finishGame();
    }
}

function startDragDrop() {
    currentModeKey = "drag";
    score = 0;
    lives = 3;
    resetDeck();
    byId("score-label-drag").innerText = score;
    updateLivesDisplay();
    showScreen("drag-screen");
    loadDragRound();
}

function loadDragRound() {
    selectedDragNumber = null;
    currentDragData = Array.from({ length: 4 }, () => drawCard());
    const zones = byId("drop-zones");
    const pool = byId("drag-pool");
    zones.replaceChildren();
    pool.replaceChildren();

    byId("check-drag-btn").style.display = "block";
    byId("check-drag-btn").disabled = false;
    byId("next-drag-btn").style.display = "none";

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
        if (!correct) {
            zone.classList.add("shake-it");
            errors += 1;
        }
    });

    if (errors === 0) {
        score += 4;
        playerStats.coins += 2;
        saveStats();
        byId("score-label-drag").innerText = score;
        byId("check-drag-btn").style.display = "none";
        byId("next-drag-btn").style.display = "block";
        return;
    }

    lives -= 1;
    updateLivesDisplay();
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
updateUIStats();
