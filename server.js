import { createReadStream, existsSync, statSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateContent } from "./scripts/content-contract.js";

const root = join(process.cwd(), "public");
const projectRoot = process.cwd();
const port = 8091;
const execFileAsync = promisify(execFile);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(`${JSON.stringify(payload)}\n`);
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Fiche trop volumineuse");
  }
  return JSON.parse(body);
}

async function saveBuilderContent(request, response) {
  const host = request.headers.host || "";
  const origin = request.headers.origin || "";
  if (!/^(127\.0\.0\.1|localhost):8091$/.test(host) || (origin && !/^http:\/\/(127\.0\.0\.1|localhost):8091$/.test(origin))) {
    sendJson(response, 403, { error: "L’enregistrement direct est limité au serveur local BAAM.Tools." });
    return;
  }
  let target = "";
  let created = false;
  try {
    const item = await readJson(request);
    validateContent(item);
    target = join(projectRoot, "content", `${item.id}.json`);
    await writeFile(target, `${JSON.stringify(item, null, 2)}\n`, { flag: "wx" });
    created = true;
    await execFileAsync(process.execPath, [join(projectRoot, "scripts", "build-portal.js")], { cwd: projectRoot });
    sendJson(response, 201, { ok: true, id: item.id });
  } catch (error) {
    if (created && target) await unlink(target).catch(() => {});
    const exists = error?.code === "EEXIST";
    sendJson(response, exists ? 409 : 400, { error: exists ? "Cette fiche existe déjà. Change son identifiant ou édite son JSON source." : error.message });
  }
}

createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/builder/save") {
    await saveBuilderContent(request, response);
    return;
  }
  const rawPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const requested = rawPath === "/" ? "/index.html" : rawPath;
  const clean = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, clean);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(root) || !existsSync(file)) file = join(root, "index.html");
  response.writeHead(200, {
    "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=60"
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`BAAM.Tools : http://127.0.0.1:${port}/`);
});
