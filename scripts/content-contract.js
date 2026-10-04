export const contentTypes = Object.freeze({
  "free-webtool": "BAAM Tool",
  "tutorial": "Guide",
  "resource": "Externe"
});

export const relationVocabulary = Object.freeze({
  "uses": "used-by",
  "used-by": "uses",
  "inspired-by": "inspires",
  "inspires": "inspired-by",
  "derived-from": "has-derivative",
  "has-derivative": "derived-from",
  "part-of": "has-part",
  "has-part": "part-of",
  "related-to": "related-to"
});

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateContent(item) {
  const errors = [];
  for (const field of ["schemaVersion", "id", "title", "summary", "type", "status", "themes", "updatedAt", "path", "presentation"]) {
    if (item[field] == null || item[field] === "") errors.push(`champ requis absent : ${field}`);
  }
  if (item.schemaVersion !== 1) errors.push("schemaVersion doit valoir 1");
  if (!idPattern.test(item.id || "")) errors.push("id invalide");
  if (!Object.hasOwn(contentTypes, item.type)) errors.push(`type inconnu : ${item.type}`);
  if (!["draft", "preview", "public", "archived"].includes(item.status)) errors.push(`statut inconnu : ${item.status}`);
  if (!Array.isArray(item.themes) || item.themes.length === 0 || item.themes.some((theme) => typeof theme !== "string" || !theme.trim())) {
    errors.push("themes doit contenir au moins un thème");
  }
  if (!datePattern.test(item.updatedAt || "")) errors.push("updatedAt doit suivre YYYY-MM-DD");
  if (typeof item.path !== "string" || !item.path.startsWith("/") || !item.path.endsWith("/")) errors.push("path doit être un chemin racine terminé par /");
  if (!item.presentation?.accent || !/^#[0-9a-f]{6}$/i.test(item.presentation.accent)) errors.push("presentation.accent doit être une couleur hexadécimale");
  if (!Array.isArray(item.relations)) errors.push("relations doit être un tableau");
  for (const relation of item.relations || []) {
    if (!Object.hasOwn(relationVocabulary, relation.type)) errors.push(`relation inconnue : ${relation.type}`);
    if (!idPattern.test(relation.target || "")) errors.push("cible de relation invalide");
  }

  if (item.type === "free-webtool" && !item.sourceFile) errors.push("un BAAM Tool requiert sourceFile");
  if (item.type === "tutorial") {
    if (!Array.isArray(item.steps) || item.steps.length === 0) errors.push("un guide requiert des étapes");
    if (!Array.isArray(item.copyBlocks)) errors.push("un guide requiert copyBlocks");
  }
  if (item.type === "resource" && !isHttpUrl(item.externalUrl)) errors.push("une ressource externe requiert externalUrl");

  if (errors.length) throw new Error(`${item.id || "contenu"} : ${errors.join(" ; ")}`);
  return item;
}
