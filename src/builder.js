const form = document.querySelector("#builder-form");
const typeInput = document.querySelector("#content-type");
const titleInput = document.querySelector("#title");
const summaryInput = document.querySelector("#summary");
const themesInput = document.querySelector("#themes");
const slugInput = document.querySelector("#slug");
const specificHost = document.querySelector("#specific-field");
const previewTypeInput = document.querySelector("#preview-type");
const previewFields = document.querySelector("#preview-fields");
const blocksPanel = document.querySelector("#blocks-panel");
const blocksList = document.querySelector("#blocks-list");
const preview = document.querySelector("#builder-preview");
const jsonPreview = document.querySelector("#json-preview");
const statusHost = document.querySelector("#builder-status");
const saveButton = document.querySelector("#save-local");

const types = {
  "free-webtool": { label: "BAAM Tool", accent: "#00a86b", prefix: "/baam-tools/", glyph: "Aa" },
  "tutorial": { label: "Guide", accent: "#ff8a34", prefix: "/guides/", glyph: "//" },
  "resource": { label: "Externe", accent: "#5b45ff", prefix: "/externes/", glyph: "↗" }
};

const blockLabels = {
  lead: "Introduction",
  section: "Section",
  steps: "Étapes",
  prompt: "Prompt copiable",
  checklist: "Checklist",
  callout: "Encadré BAAM",
  links: "Liens"
};

let blocks = [
  { type: "lead", text: "Ce guide permet de passer d’une intention à une méthode reproductible." },
  { type: "section", title: "Premier principe", body: "Décrire ici le premier enseignement du guide." }
];
let toolSources = [];

const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const cleanThemes = () => themesInput.value.split(",").map((theme) => theme.trim()).filter(Boolean);

function inputField(label, id, value = "", options = {}) {
  if (options.multiline) return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><textarea id="${id}"${options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : ""}>${escapeHtml(value)}</textarea></div>`;
  return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><input id="${id}"${options.type ? ` type="${options.type}"` : ""}${options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : ""} value="${escapeHtml(value)}"></div>`;
}

function setSpecificFields() {
  if (typeInput.value === "free-webtool") {
    specificHost.innerHTML = `<label for="source-dir">Source de l’outil</label><select id="source-dir"><option value="">Chargement des sources…</option></select><div class="source-actions"><button type="button" class="mini-button" id="scaffold-tool">Créer depuis le patron BAAM</button><button type="button" class="mini-button" id="refresh-sources">Rafraîchir</button></div><p class="field-help">HTML autonomes détectés à la racine et dossiers complets dans <code>tools-src/</code>.</p>`;
    renderToolSources();
  } else if (typeInput.value === "resource") {
    specificHost.innerHTML = '<label for="external-url">Lien externe</label><input id="external-url" type="url" placeholder="https://…"><label for="source-url" class="inline-label">Lien source · optionnel</label><input id="source-url" type="url" placeholder="https://…">';
  } else {
    specificHost.innerHTML = '<label>Page guide</label><p class="field-help">Le contenu se construit avec les blocs ci-dessous.</p>';
  }
  specificHost.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", update));
  blocksPanel.hidden = typeInput.value !== "tutorial";
}

function renderToolSources(selected = "") {
  const select = document.querySelector("#source-dir");
  if (!select) return;
  const current = selected || select.value;
  select.innerHTML = `<option value="">Choisir une source…</option>${toolSources.map((source) => `<option value="${escapeHtml(source.value)}">${source.kind === "directory" ? "Dossier" : "HTML autonome"} · ${escapeHtml(source.id)}</option>`).join("")}`;
  if (toolSources.some((source) => source.value === current)) select.value = current;
}

async function loadToolSources(selected = "") {
  try {
    const response = await fetch("/api/builder/sources", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    toolSources = result.sources || [];
    renderToolSources(selected);
  } catch {
    toolSources = [];
    renderToolSources();
    statusHost.textContent = "Inventaire local indisponible : utilise le serveur BAAM.Tools lancé par lancer-site.bat.";
  }
}

function setPreviewFields() {
  const type = previewTypeInput.value;
  if (type === "none") previewFields.innerHTML = "";
  else if (type === "text") previewFields.innerHTML = `${inputField("Texte fort", "preview-headline", "IDÉE → FORME → USAGE")}${inputField("Légende", "preview-caption", "Une phrase pour situer le mouvement.")}`;
  else previewFields.innerHTML = `${inputField("URL ou chemin du média", "preview-url", "", { placeholder: type === "video" ? "/media/mon-film.mp4" : "/media/mon-apercu.svg" })}${inputField("Texte alternatif", "preview-alt", "")}${type === "video" ? inputField("Poster · optionnel", "preview-poster", "") : ""}`;
  previewFields.querySelectorAll("input, textarea").forEach((input) => input.addEventListener("input", update));
}

function newBlock(type) {
  if (type === "lead") return { type, text: "Introduction du guide." };
  if (type === "section") return { type, title: "Nouvelle section", body: "Contenu de la section." };
  if (type === "steps") return { type, title: "Étapes", items: [{ title: "Première étape", body: "Ce qu’il faut faire." }] };
  if (type === "prompt") return { type, title: "Prompt", text: "Écris le prompt à copier ici." };
  if (type === "checklist") return { type, title: "À vérifier", items: ["Premier point", "Deuxième point"] };
  if (type === "callout") return { type, title: "Principe BAAM", body: "Une idée importante à isoler." };
  return { type: "links", title: "Sources", items: [{ label: "Nom de la ressource", url: "https://example.com/" }] };
}

function renderBlockEditor(block, index) {
  let fields = "";
  if (block.type === "lead") fields = `<textarea data-key="text">${escapeHtml(block.text)}</textarea>`;
  if (["section", "callout"].includes(block.type)) fields = `<input data-key="title" value="${escapeHtml(block.title)}"><textarea data-key="body">${escapeHtml(block.body)}</textarea>`;
  if (block.type === "prompt") fields = `<input data-key="title" value="${escapeHtml(block.title)}"><textarea data-key="text">${escapeHtml(block.text)}</textarea>`;
  if (block.type === "steps") fields = `<input data-key="title" value="${escapeHtml(block.title)}"><textarea data-key="items" data-mode="steps">${escapeHtml(block.items.map((item) => `${item.title} :: ${item.body}`).join("\n"))}</textarea><small>Une ligne par étape : titre :: explication</small>`;
  if (block.type === "checklist") fields = `<input data-key="title" value="${escapeHtml(block.title)}"><textarea data-key="items" data-mode="list">${escapeHtml(block.items.join("\n"))}</textarea><small>Une ligne par point</small>`;
  if (block.type === "links") fields = `<input data-key="title" value="${escapeHtml(block.title)}"><textarea data-key="items" data-mode="links">${escapeHtml(block.items.map((item) => `${item.label} :: ${item.url}`).join("\n"))}</textarea><small>Une ligne par lien : libellé :: URL</small>`;
  return `<article class="block-editor" data-index="${index}"><div class="block-head"><strong>${String(index + 1).padStart(2, "0")} · ${blockLabels[block.type]}</strong><div><button type="button" data-action="up" aria-label="Monter">↑</button><button type="button" data-action="down" aria-label="Descendre">↓</button><button type="button" data-action="remove" aria-label="Supprimer">×</button></div></div><div class="block-fields">${fields}</div></article>`;
}

function renderBlocks() {
  blocksList.innerHTML = blocks.map(renderBlockEditor).join("");
}

function readBlocksFromDom() {
  blocksList.querySelectorAll(".block-editor").forEach((editor) => {
    const index = Number(editor.dataset.index);
    editor.querySelectorAll("[data-key]").forEach((field) => {
      const key = field.dataset.key;
      if (key !== "items") blocks[index][key] = field.value;
      else {
        const lines = field.value.split("\n").map((line) => line.trim()).filter(Boolean);
        if (field.dataset.mode === "steps") blocks[index].items = lines.map((line) => {
          const [title, ...body] = line.split("::");
          return { title: title.trim(), body: body.join("::").trim() || "À compléter." };
        });
        if (field.dataset.mode === "list") blocks[index].items = lines;
        if (field.dataset.mode === "links") blocks[index].items = lines.map((line) => {
          const [label, ...url] = line.split("::");
          return { label: label.trim(), url: url.join("::").trim() || "https://example.com/" };
        });
      }
    });
  });
}

function buildCardPreview() {
  const type = previewTypeInput.value;
  if (type === "none") return { type };
  if (type === "text") return { type, headline: document.querySelector("#preview-headline")?.value.trim() || "APERÇU", caption: document.querySelector("#preview-caption")?.value.trim() || "" };
  const fallbackUrl = type === "video" ? "/media/apercu.mp4" : type === "iframe" ? "/baam-tools/mon-outil/" : "/media/apercu.svg";
  const result = { type, url: document.querySelector("#preview-url")?.value.trim() || fallbackUrl, alt: document.querySelector("#preview-alt")?.value.trim() || "Aperçu du contenu" };
  const poster = document.querySelector("#preview-poster")?.value.trim();
  if (poster) result.poster = poster;
  return result;
}

function buildItem() {
  readBlocksFromDom();
  const type = typeInput.value;
  const spec = types[type];
  const id = slugify(slugInput.value || titleInput.value) || "nouveau-contenu";
  const item = {
    schemaVersion: 1,
    id,
    title: titleInput.value.trim() || "Sans titre",
    eyebrow: spec.label,
    summary: summaryInput.value.trim(),
    type,
    status: "preview",
    themes: cleanThemes(),
    updatedAt: new Date().toISOString().slice(0, 10),
    path: `${spec.prefix}${id}/`,
    cta: type === "free-webtool" ? "Ouvrir l’outil" : type === "tutorial" ? "Lire le guide" : "Voir la fiche",
    meta: [spec.label],
    cardPreview: buildCardPreview(),
    presentation: { accent: spec.accent, index: "00", glyph: spec.glyph },
    relations: []
  };
  if (type === "free-webtool") {
    const selectedSource = toolSources.find((source) => source.value === document.querySelector("#source-dir")?.value);
    if (selectedSource?.kind === "directory") item.sourceDir = selectedSource.sourceDir;
    else if (selectedSource?.kind === "file") item.sourceFile = selectedSource.sourceFile;
  }
  if (type === "tutorial") item.blocks = structuredClone(blocks);
  if (type === "resource") {
    item.externalUrl = document.querySelector("#external-url")?.value.trim() || "https://example.com/";
    const sourceUrl = document.querySelector("#source-url")?.value.trim();
    if (sourceUrl) item.sourceUrl = sourceUrl;
    item.notes = [];
  }
  return item;
}

function update() {
  const item = buildItem();
  const spec = types[item.type];
  preview.style.setProperty("--preview-accent", spec.accent);
  preview.innerHTML = `<small>${escapeHtml(spec.label)} · ${item.themes.map((theme) => `#${escapeHtml(theme)}`).join(" ")}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p>`;
  jsonPreview.textContent = JSON.stringify(item, null, 2);
}

typeInput.addEventListener("change", () => { setSpecificFields(); update(); });
previewTypeInput.addEventListener("change", () => { setPreviewFields(); update(); });
titleInput.addEventListener("input", () => { if (!slugInput.dataset.touched) slugInput.value = slugify(titleInput.value); update(); });
slugInput.addEventListener("input", () => { slugInput.dataset.touched = "true"; update(); });
form.addEventListener("input", (event) => { if (!event.target.closest("#blocks-list")) update(); });
blocksList.addEventListener("input", update);

specificHost.addEventListener("click", async (event) => {
  if (event.target.id === "refresh-sources") {
    statusHost.textContent = "Actualisation des dossiers source…";
    await loadToolSources(document.querySelector("#source-dir")?.value || "");
    statusHost.textContent = `${toolSources.length} source${toolSources.length > 1 ? "s" : ""} détectée${toolSources.length > 1 ? "s" : ""}.`;
    update();
  }
  if (event.target.id === "scaffold-tool") {
    const item = buildItem();
    statusHost.textContent = "Création du dossier depuis le patron BAAM…";
    event.target.disabled = true;
    try {
      const response = await fetch("/api/builder/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, title: item.title, summary: item.summary, accent: item.presentation.accent })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      await loadToolSources(result.sourceValue);
      statusHost.textContent = `Dossier ${result.sourceDir} créé et sélectionné. Édite maintenant index.html, style.css et app.js.`;
      update();
    } catch (error) {
      statusHost.textContent = error.message.includes("Failed to fetch") ? "Création locale indisponible ici." : error.message;
    } finally {
      event.target.disabled = false;
    }
  }
});

document.querySelector("#add-block").addEventListener("click", () => {
  readBlocksFromDom();
  blocks.push(newBlock(document.querySelector("#new-block-type").value));
  renderBlocks();
  update();
});

blocksList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  readBlocksFromDom();
  const index = Number(button.closest(".block-editor").dataset.index);
  if (button.dataset.action === "remove") blocks.splice(index, 1);
  if (button.dataset.action === "up" && index > 0) [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
  if (button.dataset.action === "down" && index < blocks.length - 1) [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
  renderBlocks();
  update();
});

document.querySelector("#copy-json").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(jsonPreview.textContent);
  const button = event.currentTarget;
  button.textContent = "Copié ✓";
  setTimeout(() => { button.textContent = "Copier"; }, 1200);
});

document.querySelector("#download-json").addEventListener("click", () => {
  const item = buildItem();
  const blob = new Blob([`${JSON.stringify(item, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${item.id}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

saveButton.addEventListener("click", async () => {
  if (typeInput.value === "free-webtool" && !document.querySelector("#source-dir")?.value) {
    statusHost.textContent = "Choisis un dossier source ou crée-le depuis le patron BAAM.";
    return;
  }
  statusHost.textContent = "Validation et reconstruction…";
  saveButton.disabled = true;
  try {
    const response = await fetch("/api/builder/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildItem()) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    statusHost.textContent = `Fiche ${result.id}.json enregistrée. Le portail est reconstruit.`;
  } catch (error) {
    statusHost.textContent = error.message.includes("Failed to fetch") ? "Enregistrement direct indisponible ici : utilise Télécharger JSON." : error.message;
  } finally {
    saveButton.disabled = false;
  }
});

setSpecificFields();
setPreviewFields();
renderBlocks();
update();
loadToolSources();
