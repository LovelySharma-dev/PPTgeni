import test from "node:test";
import assert from "node:assert/strict";

test("project includes a runnable server entrypoint", async () => {
  const packageJson = await import("../package.json", { with: { type: "json" } });
  assert.equal(packageJson.default.scripts.start, "node server.js");
  assert.match(packageJson.default.dependencies.pptxgenjs, /^\^/);
});
