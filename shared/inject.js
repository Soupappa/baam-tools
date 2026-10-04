// Injecte les blocs partagés (copies identiques) dans chaque BAAM Tool concerné.
// Dans un tool : soit le repère /*@TAG@*/ (première injection), soit un bloc déjà injecté
// entre "/* ═══ TAG v1" et "/* ═══ fin TAG v1 ═══ */" (mise à jour).
// Usage : node shared/inject.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const BLOCKS = [
  { tag: "BAAM-OPTIN", file: "baam-optin.js",
    tools: ["animateur-logo.html", "color-picker.html", "mindmap.html", "convertisseur.html", "fonds-vivants.html", "tools-src/operateur-texte/index.html"] },
  { tag: "BAAM-ENGINE", file: "baam-engine.js",
    tools: ["animateur-logo.html", "fonds-vivants.html", "tools-src/operateur-texte/index.html"] },
  { tag: "BAAM-LINK", file: "baam-link.js",
    tools: ["animateur-logo.html", "color-picker.html", "convertisseur.html", "fonds-vivants.html", "tools-src/operateur-texte/index.html"] }
];

for (const { tag, file, tools } of BLOCKS) {
  const block = fs.readFileSync(path.join(here, file), "utf8").trim();
  const START = `/* ═══ ${tag} v1`, END = `/* ═══ fin ${tag} v1 ═══ */`, MARK = `/*@${tag}@*/`;
  for (const rel of tools) {
    const target = path.join(root, rel);
    if (!fs.existsSync(target)) { console.log(tag.padEnd(12), "absent    ", rel); continue; }
    let src = fs.readFileSync(target, "utf8"), how;
    if (src.includes(MARK)) { src = src.replace(MARK, () => block); how = "injecté"; }
    else {
      const a = src.indexOf(START), b = src.indexOf(END);
      if (a < 0 || b < 0) { console.log(tag.padEnd(12), "sans repère", rel); continue; }
      src = src.slice(0, a) + block + src.slice(b + END.length); how = "mis à jour";
    }
    fs.writeFileSync(target, src);
    console.log(tag.padEnd(12), how.padEnd(10), rel);
  }
}
