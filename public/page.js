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
