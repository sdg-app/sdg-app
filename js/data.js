export const SDGS = [
    { nr: 1, farbe: "#E5243B", titel: "Keine Armut", info: "Armut in allen Formen beenden und soziale Absicherung stärken." },
    { nr: 2, farbe: "#DDA63A", titel: "Kein Hunger", info: "Ernährung sichern und eine nachhaltige Landwirtschaft fördern." },
    { nr: 3, farbe: "#4C9F38", titel: "Gesundheit und Wohlergehen", info: "Gesundheit und ein gutes Leben für Menschen jeden Alters ermöglichen." },
    { nr: 4, farbe: "#C5192D", titel: "Hochwertige Bildung", info: "Gerechte Bildung und lebenslanges Lernen für alle zugänglich machen." },
    { nr: 5, farbe: "#FF3A21", titel: "Geschlechtergleichstellung", info: "Diskriminierung und Gewalt gegen Frauen und Mädchen beenden." },
    { nr: 6, farbe: "#26BDE2", titel: "Sauberes Wasser und Sanitäreinrichtungen", info: "Sauberes Wasser und sichere Sanitärversorgung für alle sichern." },
    { nr: 7, farbe: "#FCC30B", titel: "Bezahlbare und saubere Energie", info: "Zugang zu bezahlbarer, verlässlicher und sauberer Energie ausbauen." },
    { nr: 8, farbe: "#A21942", titel: "Menschenwürdige Arbeit und Wirtschaftswachstum", info: "Faire Arbeit, sichere Arbeitsplätze und nachhaltiges Wachstum fördern." },
    { nr: 9, farbe: "#FD6925", titel: "Industrie, Innovation und Infrastruktur", info: "Widerstandsfähige Infrastruktur und nachhaltige Innovation voranbringen." },
    { nr: 10, farbe: "#DD1367", titel: "Weniger Ungleichheiten", info: "Ungleichheiten innerhalb und zwischen Ländern verringern." },
    { nr: 11, farbe: "#FD9D24", titel: "Nachhaltige Städte und Gemeinden", info: "Städte sicher, inklusiv, widerstandsfähig und nachhaltig gestalten." },
    { nr: 12, farbe: "#BF8B2E", titel: "Nachhaltige/r Konsum und Produktion", info: "Ressourcen verantwortungsvoll nutzen und Abfall vermeiden." },
    { nr: 13, farbe: "#3F7E44", titel: "Maßnahmen zum Klimaschutz", info: "Schnell und wirksam gegen die Klimakrise handeln." },
    { nr: 14, farbe: "#0A97D9", titel: "Leben unter Wasser", info: "Meere schützen und ihre Ressourcen nachhaltig nutzen." },
    { nr: 15, farbe: "#56C02B", titel: "Leben an Land", info: "Ökosysteme an Land, Wälder und Artenvielfalt schützen." },
    { nr: 16, farbe: "#00689D", titel: "Frieden, Gerechtigkeit und starke Institutionen", info: "Friedliche Gesellschaften und gerechte, verlässliche Institutionen stärken." },
    { nr: 17, farbe: "#19486A", titel: "Partnerschaften zur Erreichung der Ziele", info: "Wissen, Finanzierung und Zusammenarbeit für alle Ziele verbinden." }
];

export const TARGETS = {
    easy: 30,
    hard: 15,
    drag: 50
};

export const VALID_GAME_MODES = new Set(["quiz_easy", "quiz_hard", "drag"]);

export const DAILY_CHALLENGES = [
    { type: "quiz", goal: 8, reward: 6, label: "8 Quizfragen richtig beantworten" },
    { type: "drag", goal: 2, reward: 8, label: "2 Drag-&-Drop-Runden fehlerfrei lösen" },
    { type: "flashcards", goal: 6, reward: 5, label: "6 Karteikarten bewerten" }
];

export const LEVEL_TITLES = ["Starter", "Entdecker", "Navigator", "Kenner", "SDG-Profi", "SDG Master"];
