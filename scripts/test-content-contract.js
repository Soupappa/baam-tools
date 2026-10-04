import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validateContent } from "./content-contract.js";

const root = resolve(import.meta.dirname, "..");
const files = (await readdir(join(root, "content"))).filter((file) => file.endsWith(".json"));
const items = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(root, "content", file), "utf8"))));

items.forEach((item) => assert.doesNotThrow(() => validateContent(item)));
assert.equal(new Set(items.map((item) => item.id)).size, items.length, "les identifiants doivent être uniques");
assert.equal(new Set(items.map((item) => item.path)).size, items.length, "les chemins doivent être uniques");
assert.deepEqual(new Set(items.map((item) => item.type)), new Set(["free-webtool", "tutorial", "resource"]));

const targets = new Set(items.map((item) => item.id));
for (const item of items) {
  for (const relation of item.relations) assert.ok(targets.has(relation.target), `${item.id} cible un contenu absent`);
}

assert.throws(
  () => validateContent({ ...items[0], id: "ID invalide" }),
  /id invalide/
);
assert.throws(
  () => validateContent({ ...items.find((item) => item.type === "resource"), externalUrl: "javascript:alert(1)" }),
  /externalUrl/
);

console.log(`Tests réussis : ${items.length} contenus valides, trois gabarits couverts.`);
