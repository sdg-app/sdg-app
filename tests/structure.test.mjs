import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const appScript = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const firebaseScript = await readFile(new URL("../js/firebase.js", import.meta.url), "utf8");

test("all static element IDs referenced by the app exist", () => {
    const referencedIds = [...appScript.matchAll(/byId\("([^"]+)"\)/g)].map(match => match[1]);

    referencedIds.forEach(id => {
        assert.match(html, new RegExp(`id=["']${id}["']`), `Missing HTML element #${id}`);
    });
});

test("HTML uses external scripts without inline event handlers", () => {
    assert.doesNotMatch(html, /\son(?:click|submit|drag|drop|touch)\s*=/i);
    assert.match(html, /src="js\/app\.js"/);
    assert.match(html, /src="js\/firebase\.js"/);
    assert.match(html, /href="css\/styles\.css"/);
});

test("leaderboard rendering does not inject HTML strings", () => {
    assert.doesNotMatch(firebaseScript, /innerHTML/);
});
