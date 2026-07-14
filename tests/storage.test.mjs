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
