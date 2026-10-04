import { copyFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contentTypes, relationVocabulary, validateContent } from "./content-contract.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const config = JSON.parse(await readFile(join(root, "portal.config.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
const publicStatuses = new Set(["preview", "public"]);

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const contentFiles = (await readdir(join(root, "content"))).filter((file) => file.endsWith(".json")).sort();
const items = [];
for (const file of contentFiles) {
  const item = JSON.parse(await readFile(join(root, "content", file), "utf8"));
  validateContent(item);
  items.push(item);
}

const byId = new Map();
const paths = new Set();
for (const item of items) {
  if (byId.has(item.id)) throw new Error(`identifiant répété : ${item.id}`);
  if (paths.has(item.path)) throw new Error(`chemin répété : ${item.path}`);
  byId.set(item.id, item);
  paths.add(item.path);
}

function uniqueRelations(relations) {
  const seen = new Set();
  return relations.filter((relation) => {
    const key = `${relation.type}:${relation.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

for (const item of items) {
  item.relations = uniqueRelations(item.relations || []);
  for (const relation of item.relations) {
    const target = byId.get(relation.target);
    if (!target) throw new Error(`${item.id} pointe vers une cible absente : ${relation.target}`);
    const inverse = { type: relationVocabulary[relation.type], target: item.id, generated: true };
    target.relations = uniqueRelations([...(target.relations || []), inverse]);
  }
}

for (const featuredId of config.featured) {
  if (!byId.has(featuredId)) throw new Error(`contenu mis en avant absent : ${featuredId}`);
}

const canonical = (item) => new URL(item.path.replace(/^\//, ""), config.territory.url).href;
const rank = new Map(config.featured.map((id, index) => [id, index]));
const visible = items
  .filter((item) => publicStatuses.has(item.status))
  .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) || b.updatedAt.localeCompare(a.updatedAt));

const assets = visible.map((item) => ({
  schemaVersion: 1,
  id: item.id,
  title: item.title,
  eyebrow: item.eyebrow,
  summary: item.summary,
  type: item.type,
  typeLabel: contentTypes[item.type],
  status: item.status,
  territories: ["tools"],
  url: canonical(item),
  path: item.path,
  externalUrl: item.externalUrl || null,
  updatedAt: item.updatedAt,
  tags: item.themes,
  themes: item.themes,
  meta: item.meta || [],
  cta: item.cta,
  preview: item.preview || { type: "none" },
  cardPreview: item.cardPreview || { type: "none" },
  presentation: item.presentation,
  relations: item.relations,
  sourceOrigin: "file"
}));

const latestDate = visible.map((item) => item.updatedAt).sort().at(-1) || "1970-01-01";
const sourceHash = createHash("sha256").update(JSON.stringify({ territory: config.territory, assets })).digest("hex");
const registry = {
  meta: {
    schemaVersion: 1,
    territory: "tools",
    sourceHash,
    compiledAt: latestDate,
    count: assets.length,
    contentTypes,
    relationVocabulary: Object.keys(relationVocabulary)
  },
  territory: config.territory,
  assets
};

const portalManifest = {
  schemaVersion: 1,
  id: "baam-tools",
  title: "BAAM.TOOLS",
  summary: config.territory.description,
  type: "territory",
  status: "public",
  territories: ["tools"],
  url: config.territory.url,
  updatedAt: latestDate,
  tags: ["tools", "guides", "resources", "portal"],
  relations: assets.map((asset) => ({ type: "has-part", target: asset.id }))
};

const graph = {
  schemaVersion: 1,
  builtAt: `${latestDate}T00:00:00.000Z`,
  nodes: assets.map(({ id, title, summary, type, status, territories, url, updatedAt, tags, preview, presentation }) => ({
    id, title, summary, type, status, territories, url, updatedAt, tags, preview, presentation
  })),
  edges: assets.flatMap((asset) => asset.relations.map((relation) => ({
    source: asset.id,
    target: relation.target,
    type: relation.type,
    generated: Boolean(relation.generated)
  })))
};

const graphLd = {
  "@context": {
    "@vocab": "https://schema.org/",
    "baam": "https://baam.pro/ns#",
    "relationType": "baam:relationType"
  },
  "@graph": assets.map((asset) => ({
    "@id": asset.url,
    "@type": asset.type === "tutorial" ? "HowTo" : asset.type === "free-webtool" ? "SoftwareApplication" : "WebSite",
    "name": asset.title,
    "description": asset.summary,
    "dateModified": asset.updatedAt,
    "keywords": asset.tags,
    "isPartOf": { "@id": config.territory.url, "name": config.territory.title }
  }))
};

function pageShell(item, body, aside = "") {
  const typeLabel = contentTypes[item.type];
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)} · BAAM.TOOLS</title>
  <meta name="description" content="${escapeHtml(item.summary)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="detail-page" style="--item-accent:${escapeHtml(item.presentation.accent)}">
  <header class="site-header compact">
    <a class="wordmark" href="/" aria-label="Retour à BAAM Tools"><span>BAAM</span><i>·</i>TOOLS</a>
    <a class="header-link" href="/">← Bibliothèque</a>
  </header>
  <main class="detail-main">
    <section class="detail-hero">
      <div class="detail-kicker"><span>${escapeHtml(typeLabel)}</span><span>${escapeHtml(item.eyebrow || "")}</span></div>
      <h1>${escapeHtml(item.title)}</h1>
      <p>${escapeHtml(item.summary)}</p>
      <div class="detail-meta">${(item.meta || []).map((meta) => `<span>${escapeHtml(meta)}</span>`).join("")}</div>
    </section>
    <div class="detail-layout">
      <article class="prose">${body}</article>
      ${aside}
    </div>
  </main>
  <footer class="site-footer"><span>BAAM.TOOLS / ${escapeHtml(typeLabel)}</span><a href="https://baam.pro/">BAAM.pro ↗</a></footer>
  <script src="/page.js" defer></script>
</body>
</html>`;
}

function renderGuideBlock(block, index) {
  const copyId = `copy-block-${index}`;
  if (block.type === "lead") return `<p class="lead">${escapeHtml(block.text)}</p>`;
  if (block.type === "section") return `<section class="guide-section"><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.body)}</p></section>`;
  if (block.type === "callout") return `<aside class="guide-callout"><span>${escapeHtml(block.title)}</span><p>${escapeHtml(block.body)}</p></aside>`;
  if (block.type === "steps") {
    const steps = (block.items || []).map((step, stepIndex) => `
      <section class="guide-step">
        <span class="step-index">${String(stepIndex + 1).padStart(2, "0")}</span>
        <div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p></div>
      </section>`).join("");
    return `<section class="guide-block"><h2>${escapeHtml(block.title)}</h2><div class="guide-steps">${steps}</div></section>`;
  }
  if (block.type === "checklist") {
    return `<section class="guide-block"><h2>${escapeHtml(block.title)}</h2><ul class="guide-checklist">${(block.items || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></section>`;
  }
  if (block.type === "prompt") {
    return `<section class="prompt-block"><div class="prompt-head"><span>${escapeHtml(block.title)}</span><button type="button" data-copy-target="${copyId}">Copier le prompt</button></div><pre><code id="${copyId}">${escapeHtml(block.text)}</code></pre></section>`;
  }
  if (block.type === "links") {
    return `<section class="guide-block"><h2>${escapeHtml(block.title)}</h2><ul class="guide-links">${(block.items || []).map((entry) => `<li><a href="${escapeHtml(entry.url)}"${entry.url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : ""}>${escapeHtml(entry.label)} ↗</a></li>`).join("")}</ul></section>`;
  }
  return "";
}

function tutorialPage(item) {
  const blocks = Array.isArray(item.blocks)
    ? item.blocks.map(renderGuideBlock).join("")
    : [
        { type: "lead", text: item.intro },
        { type: "steps", title: "Étapes", items: item.steps },
        ...(item.copyBlocks || []).map((block) => ({ type: "prompt", title: block.label, text: block.value }))
      ].map(renderGuideBlock).join("");
  const aside = `<aside class="detail-aside"><span>Terrain d’essai</span><strong>Opérateur Texte</strong><p>Un outil simple pour éprouver les notions de matière, tension, continuité et texture.</p><a class="action-link" href="/baam-tools/operateur-texte/">Ouvrir l’outil ↗</a><a class="subtle-link" href="#copy-block-7">Aller au patron MOTION.md</a></aside>`;
  return pageShell(item, blocks, aside);
}

function resourcePage(item) {
  const notes = item.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  const body = `<p class="lead">${escapeHtml(item.summary)}</p><h2>Pourquoi le garder sous la main</h2><ul class="resource-notes">${notes}</ul><p class="source-note">Fiche vérifiée le ${escapeHtml(item.updatedAt)}. L’outil reste hébergé et maintenu par son auteur.</p>`;
  const aside = `<aside class="detail-aside external-aside"><span>Lien externe</span><strong>${escapeHtml(item.title)}</strong><p>Le lien s’ouvre dans un nouvel onglet.</p><a class="action-link" href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noreferrer">Ouvrir ${escapeHtml(item.title)} ↗</a><a class="subtle-link" href="${escapeHtml(item.sourceUrl || item.externalUrl)}" target="_blank" rel="noreferrer">Voir la source</a></aside>`;
  return pageShell(item, body, aside);
}

if (checkOnly) {
  console.log(`OK — ${assets.length} contenus, trois types, ${graph.edges.length} relations.`);
  process.exit(0);
}

await mkdir(join(publicDir, "data"), { recursive: true });
await mkdir(join(publicDir, ".well-known"), { recursive: true });
for (const file of ["index.html", "styles.css", "app.js", "page.js", "favicon.svg"]) {
  await copyFile(join(root, "src", file), join(publicDir, file));
}
await copyFile(join(root, "src", "tool-shell.css"), join(publicDir, "tool-shell.css"));
await mkdir(join(publicDir, "builder"), { recursive: true });
await copyFile(join(root, "src", "builder.html"), join(publicDir, "builder", "index.html"));
await copyFile(join(root, "src", "builder.js"), join(publicDir, "builder", "builder.js"));

for (const item of visible) {
  const destination = join(publicDir, item.path);
  await mkdir(destination, { recursive: true });
  if (item.type === "free-webtool") {
    if (item.sourceDir) await cp(resolve(root, item.sourceDir), destination, { recursive: true, force: true });
    else await copyFile(resolve(root, item.sourceFile), join(destination, "index.html"));
  } else if (item.type === "tutorial") {
    await writeFile(join(destination, "index.html"), tutorialPage(item));
  } else if (item.type === "resource") {
    await writeFile(join(destination, "index.html"), resourcePage(item));
  }
}

await writeFile(join(publicDir, "data", "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
await writeFile(join(publicDir, "data", "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);
await writeFile(join(publicDir, "data", "graph.jsonld"), `${JSON.stringify(graphLd, null, 2)}\n`);
await writeFile(join(publicDir, ".well-known", "baam.json"), `${JSON.stringify(portalManifest, null, 2)}\n`);
await writeFile(join(publicDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.territory.url}sitemap.xml\n`);
await writeFile(join(publicDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[config.territory.url, ...assets.map((asset) => asset.url)].map((url) => `  <url><loc>${url}</loc><lastmod>${latestDate}</lastmod></url>`).join("\n")}\n</urlset>\n`);

console.log(`BAAM.TOOLS compilé — ${assets.length} contenus, trois gabarits, ${graph.edges.length} relations.`);
