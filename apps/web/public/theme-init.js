try {
  const raw = localStorage.getItem("money-flow:ui");
  const selected = raw ? JSON.parse(raw)?.state?.theme : "system";
  const dark =
    selected === "dark" ||
    (selected !== "light" &&
      matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch (_) {
  // The client ThemeProvider applies the fallback after hydration.
}
