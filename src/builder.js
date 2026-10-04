const form = document.querySelector("#builder-form");
const typeInput = document.querySelector("#content-type");
const titleInput = document.querySelector("#title");
const summaryInput = document.querySelector("#summary");
const themesInput = document.querySelector("#themes");
const slugInput = document.querySelector("#slug");
const specificHost = document.querySelector("#specific-field");
const preview = document.querySelector("#builder-preview");
const jsonPreview = document.querySelector("#json-preview");

const types = {
  "free-webtool": { label: "BAAM Tool", accent: "#00a86b", prefix: "/baam-tools/", glyph: "Aa", field: "Fichier HTML source", placeholder: "mon-outil.html" },
  "tutorial": { label: "Guide", accent: "#ff8a34", prefix: "/guides/", glyph: "//", field: "Étapes · une par ligne", placeholder: "Préparer\nTester\nPublier" },
  "resource": { label: "Externe", accent: "#5b45ff", prefix: "/externes/", glyph: "↗", field: "URL externe", placeholder: "https://example.com/" }
};

const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const cleanThemes = () => themesInput.value.split(",").map((theme) => theme.trim()).filter(Boolean);

function setSpecificField() {
  const type = types[typeInput.value];
  const multiline = typeInput.value === "tutorial";
  specificHost.innerHTML = `<label for="specific">${type.field}</label>${multiline ? `<textarea id="specific" placeholder="${type.placeholder}"></textarea>` : `<input id="specific" placeholder="${type.placeholder}">`}`;
  document.querySelector("#specific").addEventListener("input", update);
}

function buildItem() {
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
    presentation: { accent: spec.accent, index: "00", glyph: spec.glyph },
    relations: []
  };
  const specific = document.querySelector("#specific")?.value.trim() || "";
  if (type === "free-webtool") item.sourceFile = specific || `${id}.html`;
  if (type === "tutorial") {
    item.intro = item.summary;
    item.steps = specific.split("\n").filter(Boolean).map((title) => ({ title, body: "À compléter." }));
    item.copyBlocks = [];
  }
  if (type === "resource") item.externalUrl = specific || "https://example.com/";
  return item;
}

function update() {
  const item = buildItem();
  const spec = types[item.type];
  preview.style.setProperty("--preview-accent", spec.accent);
  preview.innerHTML = `<small>${escapeHtml(spec.label)} · ${item.themes.map((theme) => `#${escapeHtml(theme)}`).join(" ")}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p>`;
  jsonPreview.textContent = JSON.stringify(item, null, 2);
}

typeInput.addEventListener("change", () => { setSpecificField(); update(); });
titleInput.addEventListener("input", () => { if (!slugInput.dataset.touched) slugInput.value = slugify(titleInput.value); update(); });
slugInput.addEventListener("input", () => { slugInput.dataset.touched = "true"; update(); });
form.addEventListener("input", update);

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

setSpecificField();
update();
