const library = document.querySelector("#library");
const typeHost = document.querySelector("#type-filters");
const themeHost = document.querySelector("#theme-filters");
const countHost = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const clearButton = document.querySelector("#clear-filters");

const state = {
  type: new URLSearchParams(location.search).get("type") || "all",
  theme: new URLSearchParams(location.search).get("theme") || "all",
  open: null,
  assets: []
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function makeChip(group, value, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-chip";
  button.dataset.group = group;
  button.dataset.value = value;
  button.setAttribute("aria-pressed", String(state[group] === value));
  button.textContent = `${label} ${String(count).padStart(2, "0")}`;
  button.addEventListener("click", () => {
    state[group] = value;
    state.open = null;
    syncUrl();
    syncChips();
    applyFilters(true);
  });
  return button;
}

function renderFilters(meta) {
  const types = Object.entries(meta.contentTypes);
  typeHost.append(makeChip("type", "all", "Tous", state.assets.length));
  for (const [value, label] of types) {
    typeHost.append(makeChip("type", value, label, state.assets.filter((asset) => asset.type === value).length));
  }

  const themes = [...new Set(state.assets.flatMap((asset) => asset.themes))].sort((a, b) => a.localeCompare(b, "fr"));
  themeHost.append(makeChip("theme", "all", "Tous", state.assets.length));
  for (const theme of themes) {
    themeHost.append(makeChip("theme", theme, theme, state.assets.filter((asset) => asset.themes.includes(theme)).length));
  }

  if (state.type !== "all" && !types.some(([type]) => type === state.type)) state.type = "all";
  if (state.theme !== "all" && !themes.includes(state.theme)) state.theme = "all";
  syncChips();
}

function cardTemplate(asset) {
  const external = asset.externalUrl
    ? `<a class="external-link" href="${escapeHtml(asset.externalUrl)}" target="_blank" rel="noreferrer">Lien direct ↗</a>`
    : "";
  return `
    <article class="tool-card" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}" data-themes="${escapeHtml(asset.themes.join("|"))}" style="--accent:${escapeHtml(asset.presentation.accent)}; view-transition-name:card-${escapeHtml(asset.id)}">
      <button class="card-toggle" type="button" aria-expanded="false" aria-controls="details-${escapeHtml(asset.id)}">
        <div class="card-top"><span class="type-mark">${escapeHtml(asset.typeLabel)}</span><span>${escapeHtml(asset.presentation.index)}</span></div>
        <div class="card-glyph" aria-hidden="true">${escapeHtml(asset.presentation.glyph)}</div>
        <div class="card-title-group"><h3>${escapeHtml(asset.title)}</h3><p>${escapeHtml(asset.summary)}</p></div>
        <span class="card-open" aria-hidden="true">+</span>
      </button>
      <div class="card-details" id="details-${escapeHtml(asset.id)}">
        <div class="detail-tags">${asset.meta.map((meta) => `<span>${escapeHtml(meta)}</span>`).join("")}${asset.themes.map((theme) => `<span>#${escapeHtml(theme)}</span>`).join("")}</div>
        <div class="card-actions">${external}<a class="primary-action" href="${escapeHtml(asset.path)}">${escapeHtml(asset.cta || "Ouvrir")} ↗</a></div>
      </div>
    </article>`;
}

function renderCards() {
  library.innerHTML = state.assets.map(cardTemplate).join("");
  library.querySelectorAll(".card-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".tool-card");
      const willOpen = state.open !== card.dataset.id;
      state.open = willOpen ? card.dataset.id : null;
      animateLayout(() => syncOpenCards());
      if (willOpen) setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 230);
    });
  });
}

function syncOpenCards() {
  library.querySelectorAll(".tool-card").forEach((card) => {
    const open = card.dataset.id === state.open;
    card.classList.toggle("is-open", open);
    card.querySelector(".card-toggle").setAttribute("aria-expanded", String(open));
  });
}

function matches(card) {
  const themes = card.dataset.themes.split("|");
  return (state.type === "all" || card.dataset.type === state.type)
    && (state.theme === "all" || themes.includes(state.theme));
}

function animateLayout(mutator) {
  const cards = [...library.querySelectorAll(".tool-card:not([hidden])")];
  const before = new Map(cards.map((card) => [card.dataset.id, card.getBoundingClientRect()]));
  mutator();
  requestAnimationFrame(() => {
    library.querySelectorAll(".tool-card:not([hidden])").forEach((card) => {
      const first = before.get(card.dataset.id);
      if (!first) {
        card.animate([{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" });
        return;
      }
      const last = card.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx || dy) card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  });
}

function applyFilters(animate = false) {
  const update = () => {
    let visible = 0;
    library.querySelectorAll(".tool-card").forEach((card) => {
      const show = matches(card);
      card.hidden = !show;
      if (show) visible += 1;
    });
    countHost.textContent = `${String(visible).padStart(2, "0")} / ${String(state.assets.length).padStart(2, "0")} visibles`;
    emptyState.hidden = visible !== 0;
    library.setAttribute("aria-busy", "false");
    syncOpenCards();
  };
  if (animate) animateLayout(update); else update();
}

function syncChips() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(state[chip.dataset.group] === chip.dataset.value));
  });
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.type !== "all") params.set("type", state.type);
  if (state.theme !== "all") params.set("theme", state.theme);
  history.replaceState(null, "", params.size ? `?${params}` : location.pathname);
}

clearButton.addEventListener("click", () => {
  state.type = "all";
  state.theme = "all";
  syncUrl();
  syncChips();
  applyFilters(true);
});

fetch("/data/registry.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((registry) => {
    state.assets = registry.assets;
    renderFilters(registry.meta);
    renderCards();
    applyFilters();
  })
  .catch((error) => {
    countHost.textContent = "Registre indisponible";
    library.innerHTML = `<p class="source-note">Impossible de charger la bibliothèque : ${escapeHtml(error.message)}</p>`;
  });
