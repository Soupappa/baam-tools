const matter = document.querySelector("#matter");
const intensity = document.querySelector("#intensity");
const output = document.querySelector("#output");
const action = document.querySelector("#action");

function render() {
  const value = Number(intensity.value) / 100;
  output.textContent = matter.value || "BAAM";
  output.style.setProperty("--demo-scale", String(.82 + value * .36));
  output.style.setProperty("--demo-blur", `${Math.max(0, value - .75) * 8}px`);
}

matter.addEventListener("input", render);
intensity.addEventListener("input", render);
action.addEventListener("click", () => {
  output.classList.toggle("is-active");
  action.textContent = output.classList.contains("is-active") ? "Relâcher" : "Activer";
});

render();
