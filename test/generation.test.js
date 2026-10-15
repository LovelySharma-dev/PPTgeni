import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("project includes a runnable server entrypoint", async () => {
  const packageJson = await import("../package.json", { with: { type: "json" } });
  assert.equal(packageJson.default.scripts.start, "node server.js");
  assert.match(packageJson.default.dependencies.pptxgenjs, /^\^/);
});

test("free model selection uses the live catalog and keeps generated visuals", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const legacyEditor = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(server, /fetchFreeModels/);
  assert.match(server, /normalizeDeck/);
  assert.doesNotMatch(server, /freeModelFallback/);
  assert.doesNotMatch(legacyEditor, /item\.elements = \[\]/);
});

test("Google Slides controls are removed from active UIs", async () => {
  const nextPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const legacyMarkup = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(nextPage, /Google Slides|Open Slides|slides\.google\.com/);
  assert.doesNotMatch(legacyMarkup, /Google Slides|openSlides/);
});
