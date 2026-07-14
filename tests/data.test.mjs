import assert from "node:assert/strict";
import test from "node:test";

import { SDGS } from "../js/data.js";

test("each SDG has unique learning data and contextual feedback", () => {
    assert.equal(SDGS.length, 17);
    assert.equal(new Set(SDGS.map(sdg => sdg.nr)).size, 17);

    SDGS.forEach(sdg => {
        assert.match(sdg.farbe, /^#[0-9A-F]{6}$/i);
        assert.ok(sdg.titel.length > 0);
        assert.ok(sdg.info.length > 20);
    });
});
