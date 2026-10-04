import { createReadStream, existsSync, statSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateContent } from "./scripts/content-contract.js";

const root = join(process.cwd(), "public");
const projectRoot = process.cwd();
const toolSourcesRoot = join(projectRoot, "tools-src");
const toolTemplateRoot = join(toolSourcesRoot, "_template");
const port = 8091;
const execFileAsync = promisify(execFile);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(`${JSON.stringify(payload)}\n`);
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function isLocalRequest(request) {
  const host = request.headers.host || "";
  const origin = request.headers.origin || "";
  return /^(127\.0\.0\.1|localhost):8091$/.test(host) && (!origin || /^http:\/\/(127\.0\.0\.1|localhost):8091$/.test(origin));
}

async function listToolSources() {
  await mkdir(toolSourcesRoot, { recursive: true });
  const entries = await readdir(toolSourcesRoot, { withFileTypes: true });
  const sources = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const entryFile = join(toolSourcesRoot, entry.name, "index.html");
    if (existsSync(entryFile)) sources.push({ id: entry.name, kind: "directory", value: `dir:tools-src/${entry.name}`, sourceDir: `tools-src/${entry.name}` });
  }
  const rootEntries = await readdir(projectRoot, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) continue;
    const id = entry.name.replace(/\.html$/i, "");
    sources.push({ id, kind: "file", value: `file:${entry.name}`, sourceFile: entry.name });
  }
  return sources.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id, "fr"));
}

async function replaceTemplateTokens(file, values) {
  let source = await readFile(file, "utf8");
  for (const [token, value] of Object.entries(values)) source = source.replaceAll(`{{${token}}}`, value);
  await writeFile(file, source);
}

async function scaffoldTool(request, response) {
  if (!isLocalRequest(request)) {
    sendJson(response, 403, { error: "La création d’un outil est limitée au serveur local BAAM.Tools." });
    return;
  }
  let target = "";
  let created = false;
  try {
    const input = await readJson(request);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id || "")) throw new Error("Identifiant d’outil invalide.");
    if (!input.title?.trim()) throw new Error("Le titre de l’outil est requis.");
    if (!/^#[0-9a-f]{6}$/i.test(input.accent || "")) throw new Error("La couleur d’accent doit être hexadécimale.");
    if (!existsSync(join(toolTemplateRoot, "index.html"))) throw new Error("Le patron BAAM Tool est introuvable.");
    target = join(toolSourcesRoot, input.id);
    await cp(toolTemplateRoot, target, { recursive: true, force: false, errorOnExist: true });
    created = true;
    const values = {
      ID: input.id,
      TITLE: escapeHtml(input.title.trim()),
      SUMMARY: escapeHtml(input.summary?.trim() || "Un outil BAAM simple, utile et autonome."),
      ACCENT: input.accent
    };
    await replaceTemplateTokens(join(target, "index.html"), values);
    await replaceTemplateTokens(join(target, "style.css"), values);
    sendJson(response, 201, { ok: true, sourceDir: `tools-src/${input.id}`, sourceValue: `dir:tools-src/${input.id}` });
  } catch (error) {
    if (created && target) await rm(target, { recursive: true, force: true }).catch(() => {});
    const exists = error?.code === "ERR_FS_CP_EEXIST" || error?.code === "EEXIST";
    sendJson(response, exists ? 409 : 400, { error: exists ? "Ce dossier d’outil existe déjà." : error.message });
  }
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
  if (!isLocalRequest(request)) {
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
  if (request.method === "GET" && request.url === "/api/builder/sources") {
    if (!isLocalRequest(request)) sendJson(response, 403, { error: "Inventaire local indisponible." });
    else sendJson(response, 200, { sources: await listToolSources() });
    return;
  }
  if (request.method === "POST" && request.url === "/api/builder/scaffold") {
    await scaffoldTool(request, response);
    return;
  }
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
