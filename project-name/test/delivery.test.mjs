import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vite from "../../vite.config.js";
test("production asset base and title identify this repository", async () => {
  assert.equal(vite.base, "/babylon-lite-danger-room/");
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /<title>Danger Room/);
});
