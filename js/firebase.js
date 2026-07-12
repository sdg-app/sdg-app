// !!! WICHTIG: updateDoc WIRD HIER IMPORTIERT !!!
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
    import { getFirestore, collection, addDoc, updateDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyCxA2tDZMu57sko9UN_uMc8OHNBErAAwVs",
        authDomain: "sdg-quiz-50315.firebaseapp.com",
        projectId: "sdg-quiz-50315",
        storageBucket: "sdg-quiz-50315.firebasestorage.app",
        messagingSenderId: "948981299829",
        appId: "1:948981299829:web:8eaf1137c05efae5c9963c",
        measurementId: "G-YR00EZ2LR0"
    };

    let db;
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase verbunden!");
    } catch(e) {
        console.error("Firebase Fehler:", e);
    }

    // UPDATE: SMART SUBMIT LOGIC (PRÜFEN VOR SPEICHERN)
    window.submitScoreToDB = async function(name, score, mode) {
        if(!db) return;
        try {
            // 1. Prüfen ob Eintrag existiert
            const q = query(
                collection(db, "leaderboard"), 
                where("name", "==", name), 
                where("mode", "==", mode)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // FALL 1: Spieler existiert noch nicht -> Neu anlegen
                await addDoc(collection(db, "leaderboard"), {
                    name: name,
                    score: score,
                    mode: mode,
                    timestamp: new Date()
                });
                return "new"; // Success
            } else {
                // FALL 2: Spieler existiert -> Score vergleichen
                const existingDoc = snapshot.docs[0];
                const oldScore = existingDoc.data().score;

                if (score > oldScore) {
                    // Neuer Score ist besser -> Update
                    await updateDoc(existingDoc.ref, {
                        score: score,
                        timestamp: new Date()
                    });
                    return "updated"; // Success
                } else {
                    // Alter Score war besser -> Nichts tun
                    return "lower"; // Kein Update nötig
                }
            }
        } catch (e) {
            console.error("Fehler beim Senden: ", e);
            throw e; // Fehler weiterwerfen für UI Handling
        } finally {
             // Egal was passiert ist, Liste neu laden
             window.loadLeaderboard(mode, "leaderboard-content"); 
        }
    };

    window.loadLeaderboard = async function(mode, containerId = "leaderboard-content") {
        const lbContent = document.getElementById(containerId);
        if(!lbContent) return;
        if(!db) { lbContent.innerHTML = "Keine Datenbank-Verbindung."; return; }
        
        lbContent.innerHTML = "Lade...";
        
        try {
            const q = query(collection(db, "leaderboard"), where("mode", "==", mode), orderBy("score", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            
            let html = "";
            let data = [];
            
            querySnapshot.forEach((doc) => { data.push(doc.data()); });
            
            data.forEach((entry, index) => {
                let rank = index + 1;
                html += `<div class="lb-row"><span>#${rank} ${entry.name}</span><span>${entry.score}</span></div>`;
            });

            if(data.length === 0) html = "<div>Noch keine Einträge.</div>";
            lbContent.innerHTML = html;

        } catch(e) {
            console.error("Ladefehler:", e);
            lbContent.innerHTML = "Ladefehler (Index fehlt?).";
        }
    };
