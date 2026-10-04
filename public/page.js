document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copié ✓";
    } catch {
      button.textContent = "Sélectionner";
      const range = document.createRange();
      range.selectNodeContents(button.previousElementSibling);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setTimeout(() => { button.textContent = original; }, 1400);
  });
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(target.textContent);
      button.textContent = "Copié ✓";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Sélectionné";
    }
    setTimeout(() => { button.textContent = original; }, 1400);
  });
});
