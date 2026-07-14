import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStats } from "../js/storage.js";

test("normalizeStats migrates legacy and malformed values safely", () => {
    const stats = normalizeStats({
        coins: -10,
        highScore: 7,
        username: "  Test Person  ",
        scores: null
    });

    assert.equal(stats.coins, 0);
    assert.equal(stats.scores.quiz_easy, 7);
    assert.equal(stats.scores.quiz_hard, 0);
    assert.equal(stats.username, "Test Person");
    assert.ok(stats.playerId.length >= 8);
});

test("normalizeStats keeps progression and per-goal mastery data", () => {
    const stats = normalizeStats({
        xp: 82,
        bestStreak: 7,
        mastery: {
            6: { correct: 5, incorrect: 2, reviews: 1 },
            99: { correct: 99 }
        },
        daily: { date: "2026-07-14", type: "quiz", goal: 8, progress: 3, claimed: false }
    });

    assert.equal(stats.xp, 82);
    assert.equal(stats.bestStreak, 7);
    assert.deepEqual(stats.mastery[6], {
        correct: 5,
        incorrect: 2,
        reviews: 1,
        correctStreak: 0,
        seen: 0,
        lastSeen: 0
    });
    assert.equal(stats.mastery[99], undefined);
    assert.equal(stats.daily.progress, 3);
});
