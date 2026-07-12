/* --- GAME LOGIC --- */
const SDGS = [
    {nr: 1, farbe: "#E5243B", titel: "Keine Armut"}, {nr: 2, farbe: "#DDA63A", titel: "Kein Hunger"}, {nr: 3, farbe: "#4C9F38", titel: "Gesundheit und Wohlergehen"}, {nr: 4, farbe: "#C5192D", titel: "Hochwertige Bildung"}, {nr: 5, farbe: "#FF3A21", titel: "Geschlechtergleichstellung"}, {nr: 6, farbe: "#26BDE2", titel: "Sauberes Wasser und Sanitäreinrichtungen"}, {nr: 7, farbe: "#FCC30B", titel: "Bezahlbare und saubere Energie"}, {nr: 8, farbe: "#A21942", titel: "Menschenwürdige Arbeit und Wirtschaftswachstum"}, {nr: 9, farbe: "#FD6925", titel: "Industrie, Innovation und Infrastruktur"}, {nr: 10, farbe: "#DD1367", titel: "Weniger Ungleichheiten"}, {nr: 11, farbe: "#FD9D24", titel: "Nachhaltige Städte und Gemeinden"}, {nr: 12, farbe: "#BF8B2E", titel: "Nachhaltige/r Konsum und Produktion"}, {nr: 13, farbe: "#3F7E44", titel: "Maßnahmen zum Klimaschutz"}, {nr: 14, farbe: "#0A97D9", titel: "Leben unter Wasser"}, {nr: 15, farbe: "#56C02B", titel: "Leben an Land"}, {nr: 16, farbe: "#00689D", titel: "Frieden, Gerechtigkeit und starke Institutionen"}, {nr: 17, farbe: "#19486A", titel: "Partnerschaften zur Erreichung der Ziele"}
];
const TARGETS = { easy: 30, hard: 15, drag: 50 };
let continueCost = 10;
let playerStats = { coins: 0, scores: { quiz_easy: 0, quiz_hard: 0, drag: 0 } };

if(localStorage.getItem("sdgAppData")) {
    let data = JSON.parse(localStorage.getItem("sdgAppData"));
    if(!data.scores) data.scores = { quiz_easy: data.highScore || 0, quiz_hard: 0, drag: 0 };
    playerStats = data;
}
function saveStats() { localStorage.setItem("sdgAppData", JSON.stringify(playerStats)); updateUIStats(); }
function updateUIStats() {
    document.getElementById("menu-coins").innerText = playerStats.coins;
    document.getElementById("ingame-coins-quiz").innerText = playerStats.coins;
    document.getElementById("ingame-coins-drag").innerText = playerStats.coins;
    updateStar("star-quiz-easy", playerStats.scores.quiz_easy, TARGETS.easy);
    updateStar("star-quiz-hard", playerStats.scores.quiz_hard, TARGETS.hard);
    updateStar("star-drag", playerStats.scores.drag, TARGETS.drag);
}
function updateStar(id, score, target) {
    const el = document.getElementById(id);
    if(score >= target) { el.innerText = "★"; el.classList.add("unlocked"); } else { el.innerText = "☆"; el.classList.remove("unlocked"); }
}
updateUIStats();
let masterDeck = []; function resetDeck() { masterDeck = [...SDGS].sort(() => Math.random() - 0.5); } function drawCard() { if(masterDeck.length === 0) resetDeck(); return masterDeck.pop(); }
let score=0, lives=3, currentSdg=null, quizModeN=4, currentModeKey="quiz_easy"; 
function getImgUrl(nr) { const padded = nr.toString().padStart(2, "0"); return `https://commons.wikimedia.org/wiki/Special:Redirect/file/SDG-icon-DE-${padded}.svg`; }
function showMenu(){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); document.getElementById("game-over-screen").classList.remove("active"); document.getElementById("menu-screen").classList.add("active"); updateUIStats(); }
function updateLivesDisplay() { let hearts = ""; for(let i=0; i<lives; i++) hearts += "❤️"; for(let i=lives; i<3; i++) hearts += "🖤"; document.getElementById("lives-label-quiz").innerText = hearts; document.getElementById("lives-label-drag").innerText = hearts; }

// --- GLOBAL LEADERBOARD FUNCTIONS ---
function openGlobalLeaderboard() {
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById("leaderboard-screen").classList.add("active");
    switchLBTab('quiz_easy', document.querySelector('.tab-btn')); 
}

function switchLBTab(mode, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    btn.classList.add('active-tab');
    if(window.loadLeaderboard) window.loadLeaderboard(mode, "global-lb-content");
}

function startQuiz(n){
    quizModeN = n; currentModeKey = (n > 4) ? "quiz_hard" : "quiz_easy"; score = 0; lives = 3; resetDeck();
    document.getElementById("score-label").innerText = score; updateLivesDisplay();
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); document.getElementById("game-over-screen").classList.remove("active"); document.getElementById("quiz-screen").classList.add("active");
    nextQuizQuestion();
}
function nextQuizQuestion(){
    currentSdg = drawCard(); const display = document.getElementById("quiz-display"); const grid = document.getElementById("quiz-options");
    let mode = 0; if (quizModeN > 4) mode = Math.floor(Math.random() * 3) + 1; 
    display.style.background = "var(--card-bg)"; display.style.color = "white"; display.style.fontSize = "80px"; display.innerHTML = "";
    if (mode === 0) { display.style.background = currentSdg.farbe; display.innerHTML = `<span>${currentSdg.nr}</span>`; } 
    else if (mode === 1) { display.style.background = currentSdg.farbe; display.innerHTML = `<span>?</span>`; } 
    else if (mode === 2) { display.style.background = "#555"; display.innerHTML = `<span>${currentSdg.nr}</span>`; } 
    else if (mode === 3) { display.style.background = "#222"; display.style.fontSize = "24px"; display.style.padding = "20px"; display.style.textAlign = "center"; display.innerText = currentSdg.titel; }
    let opts = [currentSdg]; while(opts.length < quizModeN){ let r = SDGS[Math.floor(Math.random()*17)]; if(!opts.find(o => o.nr === r.nr)) opts.push(r); }
    grid.innerHTML = ""; opts.sort(()=>Math.random()-0.5).forEach(o=>{
        let b = document.createElement("button"); b.className="option-btn"; b.dataset.nr = o.nr;
        if (mode === 3) { b.innerText = o.nr; b.style.backgroundColor = o.farbe; b.style.fontSize = "40px"; b.style.fontWeight = "bold"; } else { b.innerText = o.titel; b.style.backgroundColor = "var(--card-bg)"; b.style.fontSize = "13px"; }
        b.onclick = () => {
            const isCorrect = o.nr === currentSdg.nr; const allButtons = grid.querySelectorAll("button");
            if (isCorrect) { allButtons.forEach(btn => btn.disabled = true); if (mode === 3) { b.style.border = "4px solid white"; b.style.opacity = "1"; } else { b.classList.add("correct"); } score++; playerStats.coins += 1; saveStats(); document.getElementById("score-label").innerText = score; setTimeout(nextQuizQuestion, 1500); } 
            else { lives--; updateLivesDisplay(); b.disabled = true; if (mode === 3) { b.style.opacity = "0.2"; b.style.border = "4px solid black"; } else { b.classList.add("wrong"); } if (lives <= 0) { const correctBtn = Array.from(allButtons).find(btn => parseInt(btn.dataset.nr) === currentSdg.nr); if (correctBtn) { if (mode === 3) correctBtn.style.border = "4px solid white"; else correctBtn.classList.add("correct"); } allButtons.forEach(btn => btn.disabled = true); finishGame(); } }
        }; grid.appendChild(b);
    });
}
let currentDragData = [];
function startDragDrop(){
    currentModeKey = "drag"; score = 0; lives = 3; resetDeck(); document.getElementById("score-label-drag").innerText = score; updateLivesDisplay();
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); document.getElementById("game-over-screen").classList.remove("active"); document.getElementById("drag-screen").classList.add("active");
    const pool = document.getElementById("drag-pool"); pool.ondragover = e => e.preventDefault(); pool.ondrop = e => handleDropOnPool(e); loadDrag();
}
function loadDrag(){
    currentDragData = []; for(let i=0; i<4; i++) currentDragData.push(drawCard());
    const zones = document.getElementById("drop-zones"); const pool = document.getElementById("drag-pool"); zones.innerHTML = ""; pool.innerHTML = "";
    document.getElementById("check-drag-btn").style.display = "block"; document.getElementById("check-drag-btn").disabled = false; document.getElementById("next-drag-btn").style.display = "none";
    currentDragData.forEach((s, index) => {
        let z = document.createElement("div"); z.className = "drop-zone"; z.id = "zone-" + index; z.dataset.correctNr = s.nr; z.dataset.occupiedBy = ""; z.innerText = s.titel;
        z.ondragover = e => e.preventDefault(); z.ondrop = e => handleDrop(z, e.dataTransfer.getData("nr"), e.dataTransfer.getData("color")); zones.appendChild(z);
    });
    [...currentDragData].sort(()=>Math.random()-0.5).forEach(s => { createDragItem(s.nr, s.farbe, "pool"); });
}
function createDragItem(nr, color, origin) {
    let container = origin === "pool" ? document.getElementById("drag-pool") : document.getElementById(origin); if(document.getElementById("d"+nr)) return;
    let box = document.createElement("div"); box.id = "d" + nr; box.className = "drag-box"; box.style.backgroundColor = color; box.innerText = nr; box.draggable = true;
    box.ondragstart = e => { e.dataTransfer.setData("nr", nr); e.dataTransfer.setData("color", color); let parentZone = box.closest(".drop-zone"); e.dataTransfer.setData("sourceId", parentZone ? parentZone.id : "pool"); };
    box.addEventListener('touchstart', function(e) { let touch = e.touches[0]; box.dataset.startX = touch.clientX; box.dataset.startY = touch.clientY; let parentZone = box.closest(".drop-zone"); box.dataset.sourceId = parentZone ? parentZone.id : "pool"; box.style.position = 'fixed'; box.style.zIndex = '1000'; updatePosition(box, touch); }, {passive: false});
    box.addEventListener('touchmove', function(e) { e.preventDefault(); updatePosition(box, e.touches[0]); }, {passive: false});
    box.addEventListener('touchend', function(e) { box.style.display = 'none'; let touch = e.changedTouches[0]; let target = document.elementFromPoint(touch.clientX, touch.clientY); box.style.display = 'flex'; box.style.position = 'static'; let zone = target ? target.closest('.drop-zone') : null; let pool = target ? target.closest('#drag-pool') : null; if (zone) handleDrop(zone, nr, color); else if (pool) handleDropOnPool({ preventDefault: ()=>{}, dataTransfer: { getData: (k)=> (k==="nr"?nr:(k==="color"?color:box.dataset.sourceId)) } }, true); else box.style.position = 'static'; });
    if(container) container.appendChild(box);
}
function updatePosition(el, touch) { el.style.left = (touch.clientX - 25) + 'px'; el.style.top = (touch.clientY - 25) + 'px'; }
function handleDropOnPool(e, isTouch=false) {
    e.preventDefault(); let nr = e.dataTransfer.getData("nr"); let color = e.dataTransfer.getData("color"); let sourceId = isTouch ? e.dataTransfer.getData("sourceId") : e.dataTransfer.getData("sourceId"); 
    if(sourceId !== "pool") { let sourceZone = document.getElementById(sourceId); if(sourceZone) { sourceZone.classList.remove("filled"); sourceZone.dataset.occupiedBy = ""; sourceZone.innerText = sourceZone.dataset.originalText || sourceZone.innerText.split('\n')[1] || sourceZone.innerText; } let oldEl = document.getElementById("d" + nr); if(oldEl) oldEl.remove(); createDragItem(nr, color, "pool"); }
}
function handleDrop(zone, nr, color) {
    if(zone.classList.contains("filled")) { let oldNr = zone.dataset.occupiedBy; let oldColor = zone.dataset.color; let oldEl = document.getElementById("d" + oldNr); if(oldEl) oldEl.remove(); createDragItem(oldNr, oldColor, "pool"); }
    let dragItem = document.getElementById("d" + nr); if(dragItem) { let parentZone = dragItem.closest(".drop-zone"); if(parentZone) { parentZone.classList.remove("filled"); parentZone.dataset.occupiedBy = ""; parentZone.innerText = parentZone.dataset.originalText || parentZone.innerText.split('\n')[1] || parentZone.innerText; } dragItem.remove(); }
    if(!zone.dataset.originalText) zone.dataset.originalText = zone.innerText; zone.innerHTML = ""; zone.classList.add("filled"); zone.dataset.occupiedBy = nr; zone.dataset.color = color; createDragItem(nr, color, zone.id);
    let lbl = document.createElement("small"); lbl.style.marginTop = "5px"; lbl.style.pointerEvents = "none"; lbl.innerText = zone.dataset.originalText; zone.appendChild(lbl);
}
function checkDragAssignments() {
    let errors = 0; currentDragData.forEach((s, index) => { const zone = document.getElementById("zone-" + index); const occupied = zone.dataset.occupiedBy; if (occupied == zone.dataset.correctNr) { zone.classList.add("correct"); } else { zone.classList.add("wrong"); zone.classList.add("shake-it"); errors++; } });
    if (errors === 0) { score += 4; playerStats.coins += 2; saveStats(); document.getElementById("score-label-drag").innerText = score; document.getElementById("check-drag-btn").style.display = "none"; document.getElementById("next-drag-btn").style.display = "block"; } else { lives--; updateLivesDisplay(); document.getElementById("check-drag-btn").disabled = true; setTimeout(() => { currentDragData.forEach((s, index) => { document.getElementById("zone-" + index).classList.remove("shake-it"); }); if(lives <= 0) finishGame(); else loadDrag(); }, 1200); }
}

/* --- GAME OVER HANDLING --- */
function finishGame() {
    if(score > playerStats.scores[currentModeKey]) { playerStats.scores[currentModeKey] = score; saveStats(); }
    document.getElementById("go-score").innerText = score;
    document.getElementById("go-best").innerText = playerStats.scores[currentModeKey];
    
    // Reset Inputs
    document.getElementById("player-name").value = playerStats.username || "";
    document.getElementById("submit-container").style.display = "flex";
    document.getElementById("submit-message").style.display = "none";
    document.querySelector(".submit-btn").disabled = false;
    document.querySelector(".submit-btn").innerText = "SENDEN";

    // Continue Logic
    const btnCont = document.getElementById("btn-continue");
    if(playerStats.coins >= continueCost) { btnCont.disabled = false; btnCont.innerHTML = `Weiterspielen (-${continueCost} 🪙)`; btnCont.style.opacity = "1"; } else { btnCont.disabled = true; btnCont.innerHTML = `Zu wenig Coins (${playerStats.coins}/${continueCost})`; btnCont.style.opacity = "0.5"; }
    
    document.getElementById("game-over-screen").classList.add("active");
    
    if(window.loadLeaderboard) window.loadLeaderboard(currentModeKey, "leaderboard-content");
}

function submitScore() {
    const name = document.getElementById("player-name").value;
    if(!name) { alert("Bitte Namen eingeben!"); return; }
    
    playerStats.username = name; saveStats(); // Name merken
    
    if(window.submitScoreToDB) {
        document.querySelector(".submit-btn").disabled = true;
        document.querySelector(".submit-btn").innerText = "...";
        
        window.submitScoreToDB(name, score, currentModeKey)
        .then((result) => {
            document.getElementById("submit-container").style.display = "none";
            const msg = document.getElementById("submit-message");
            msg.style.display = "block";
            
            // User Feedback
            if(result === "new") msg.innerText = "Neuer Eintrag erstellt!";
            else if(result === "updated") msg.innerText = "Highscore verbessert! 🎉";
            else if(result === "lower") msg.innerText = "Dein alter Highscore war besser.";
            else msg.innerText = "Gesendet.";
        })
        .catch(() => {
             document.querySelector(".submit-btn").disabled = false;
             document.querySelector(".submit-btn").innerText = "Retry";
        });
    } else {
        alert("Datenbank noch nicht verbunden!");
    }
}

function buyContinue() {
    if(playerStats.coins >= continueCost) {
        playerStats.coins -= continueCost; saveStats();
        lives = 3; updateLivesDisplay(); updateUIStats();
        document.getElementById("game-over-screen").classList.remove("active");
        if(currentModeKey.includes("quiz")) nextQuizQuestion(); else loadDrag();
    }
}
function restartGame() { if(currentModeKey === "quiz_easy") startQuiz(4); else if(currentModeKey === "quiz_hard") startQuiz(6); else startDragDrop(); }

/* --- FLASHCARDS & TABLE --- */
let cardIdx=0; let flashcardDeck = []; let isRandomFlash = false;
function startFlashcards(random){ isRandomFlash = random; document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); document.getElementById("flashcard-screen").classList.add("active"); if(random) flashcardDeck = [...SDGS].sort(() => Math.random() - 0.5); else flashcardDeck = [...SDGS]; cardIdx=0; renderCardFront(); }
function renderCardFront() { let s = flashcardDeck[cardIdx]; const c=document.getElementById("main-card"); c.style.background=s.farbe; c.innerHTML=`<span class="flashcard-number">${s.nr}</span>`; c.dataset.side = "front"; document.getElementById("card-progress").innerText=`${cardIdx+1} / 17`; }
function renderCardBack() { let s = flashcardDeck[cardIdx]; const c=document.getElementById("main-card"); c.style.background="white"; c.innerHTML=`<img src="${getImgUrl(s.nr)}">`; c.dataset.side = "back"; }
function flipCard(){ const c=document.getElementById("main-card"); if (c.dataset.side === "front") renderCardBack(); else renderCardFront(); }
function nextCard(){ cardIdx++; if(cardIdx >= 17) { if(isRandomFlash) flashcardDeck = [...SDGS].sort(() => Math.random() - 0.5); cardIdx = 0; } renderCardFront(); }
function prevCard(){ cardIdx--; if(cardIdx < 0) cardIdx = 16; renderCardFront(); }
function showTable() {
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    document.getElementById("table-screen").classList.add("active");

    const tableContent = document.getElementById("table-content");
    tableContent.innerHTML = "";

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
