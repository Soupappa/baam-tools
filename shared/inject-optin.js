// Injecte la copie identique de shared/baam-optin.js dans chaque BAAM Tool.
// Dans un tool : soit le repère /*@BAAM-OPTIN@*/ (première injection), soit un bloc
// déjà injecté entre "/* ═══ BAAM-OPTIN v1" et "/* ═══ fin BAAM-OPTIN v1 ═══ */" (mise à jour).
// Usage : node shared/inject-optin.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const block = fs.readFileSync(path.join(here, "baam-optin.js"), "utf8").trim();
const TOOLS = ["animateur-logo.html", "color-picker.html", "mindmap.html", "convertisseur.html", "tools-src/operateur-texte/index.html"];
const START = "/* ═══ BAAM-OPTIN v1", END = "/* ═══ fin BAAM-OPTIN v1 ═══ */", MARK = "/*@BAAM-OPTIN@*/";

for (const rel of TOOLS) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log("absent    ", rel); continue; }
  let src = fs.readFileSync(file, "utf8"), how;
  if (src.includes(MARK)) { src = src.replace(MARK, () => block); how = "injecté"; }
  else {
    const a = src.indexOf(START), b = src.indexOf(END);
    if (a < 0 || b < 0) { console.log("sans repère", rel); continue; }
    src = src.slice(0, a) + block + src.slice(b + END.length); how = "mis à jour";
  }
  fs.writeFileSync(file, src);
  console.log(how.padEnd(10), rel);
}
