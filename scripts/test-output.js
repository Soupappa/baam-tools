import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = join(root, "public");
const registry = JSON.parse(await readFile(join(publicDir, "data", "registry.json"), "utf8"));
const portal = JSON.parse(await readFile(join(publicDir, ".well-known", "baam.json"), "utf8"));

assert.equal(registry.meta.territory, "tools");
assert.equal(registry.meta.count, 4);
assert.deepEqual(new Set(registry.assets.map((asset) => asset.type)), new Set(["free-webtool", "tutorial", "resource"]));
assert.equal(portal.id, "baam-tools");
assert.equal(portal.relations.length, 4);
assert.ok(registry.assets.every((asset) => asset.cardPreview));

for (const asset of registry.assets) {
  await access(join(publicDir, asset.path, "index.html"));
  assert.ok(asset.url.startsWith("https://tools.baam.pro/"));
}

const home = await readFile(join(publicDir, "index.html"), "utf8");
assert.match(home, /id="type-filters"/);
assert.match(home, /id="theme-filters"/);
await access(join(publicDir, "builder", "index.html"));
const guide = await readFile(join(publicDir, "guides", "motion-par-claude", "index.html"), "utf8");
assert.equal((guide.match(/Copier le prompt/g) || []).length, 5);
assert.match(guide, /Le pipeline en neuf passages/);

console.log("Tests réussis : sorties publiques, routes et manifest territorial cohérents.");
