import assert from "node:assert/strict";
import test from "node:test";

import { shuffle, toNonNegativeInteger } from "../js/utils.js";

test("shuffle returns a new array containing every item", () => {
    const input = [1, 2, 3, 4];
    const output = shuffle(input, () => 0);

    assert.notStrictEqual(output, input);
    assert.deepEqual([...output].sort(), input);
});

test("toNonNegativeInteger rejects invalid values", () => {
    assert.equal(toNonNegativeInteger(4.9), 4);
    assert.equal(toNonNegativeInteger(-1), 0);
    assert.equal(toNonNegativeInteger("invalid", 3), 3);
});
