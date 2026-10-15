const $ = (selector) => document.querySelector(selector);
let deck = null;
let selected = 0;
let history = [];
let future = [];

const render = () => {
  if (!deck) return;
  const slide = deck.slides[selected];
  const t = deck.themeConfig;
  document.documentElement.style.setProperty("--accent", `#${t.accent}`);
  $("#deckTitle").textContent = deck.title || "Untitled presentation";
  $("#theme").value = deck.theme;
  $("#slideTitle").value = slide.title || "";
  $("#slideTakeaway").value = slide.takeaway || slide.subtitle || "";
  $("#slideBody").value = slide.body || slide.quote || slide.steps?.join("\n") || "";
  $("#canvas").style.background = `#${t.background}`;
  $("#canvas").innerHTML = `<div class="slide-title">${escapeHtml(slide.title || "")}</div>${slide.metrics ? `<div class="metric-row">${slide.metrics.map((m) => `<div class="metric"><strong>${escapeHtml(m.value)}</strong><span>${escapeHtml(m.label)}</span></div>`).join("")}</div>` : `<div class="${slide.type === "quote" ? "quote" : "slide-copy"}">${escapeHtml(slide.quote || slide.body || slide.takeaway || slide.subtitle || slide.steps?.join(" · ") || "")}</div>${slide.attribution ? `<div class="attribution">${escapeHtml(slide.attribution)}</div>` : ""}`}<div class="slide-number">${String(selected + 1).padStart(2, "0")} / ${String(deck.slides.length).padStart(2, "0")}</div>`;
  $("#thumbnails").innerHTML = deck.slides.map((s, i) => `<button class="thumb ${i === selected ? "active" : ""}" data-index="${i}"><strong>${String(i + 1).padStart(2, "0")} ${escapeHtml(s.title || "Untitled")}</strong>${escapeHtml(s.takeaway || s.subtitle || "")}</button>`).join("");
  document.querySelectorAll(".thumb").forEach((button) => button.addEventListener("click", () => { selected = Number(button.dataset.index); render(); }));
  $("#qualityText").textContent = `${deck.slides.length} slides · No overflow detected · ${deck.slides.filter((s) => (s.body || "").length > 260).length ? "Review dense text" : "Readable density"}`;
  $("#exportPptx").disabled = $("#exportPdf").disabled = false;
  $("#undo").disabled = !history.length; $("#redo").disabled = !future.length;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const loadThemes = async () => {
  const themes = await fetch("/api/themes").then((response) => response.json());
  $("#theme").innerHTML = themes.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
};
const createDeck = async () => {
  const prompt = $("#prompt").value.trim();
  if (!prompt) return $("#prompt").focus();
  $("#generate").disabled = true; $("#generate").innerHTML = "Building your story…";
  try {
    deck = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, theme: $("#theme").value || "midnight" }) }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; });
    selected = 0; history = []; future = []; $("#welcome").classList.add("hidden"); $("#studio").classList.remove("hidden"); render();
  } catch (error) { alert(error.message); } finally { $("#generate").disabled = false; $("#generate").innerHTML = "Generate outline <span>→</span>"; }
};
const snapshot = () => JSON.stringify(deck);
$("#generate").addEventListener("click", createDeck);
$("#prompt").addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") createDeck(); });
document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => { $("#prompt").value = button.dataset.example; $("#prompt").focus(); }));
$("#theme").addEventListener("change", async (event) => { history.push(snapshot()); future = []; deck.theme = event.target.value; deck.themeConfig = await fetch("/api/themes").then((r) => r.json()).then((all) => all.find((t) => t.id === deck.theme)); render(); });
$("#saveSlide").addEventListener("click", () => { history.push(snapshot()); future = []; const slide = deck.slides[selected]; slide.title = $("#slideTitle").value; slide.takeaway = $("#slideTakeaway").value; slide.body = $("#slideBody").value; render(); });
$("#newDeck").addEventListener("click", () => { deck = null; $("#studio").classList.add("hidden"); $("#welcome").classList.remove("hidden"); });
$("#applyEdit").addEventListener("click", () => { const command = $("#editPrompt").value.trim(); if (!command || !deck) return; history.push(snapshot()); future = []; if (/simpler|less text|shorter/i.test(command)) deck.slides[selected].body = (deck.slides[selected].body || "").split(/[.!?]/).slice(0, 2).join("."); if (/visual|diagram/i.test(command)) deck.slides[selected].takeaway = "A visual explanation makes the relationship immediately clear."; $("#editPrompt").value = ""; render(); });
$("#undo").addEventListener("click", () => { if (!history.length) return; future.push(snapshot()); deck = JSON.parse(history.pop()); render(); });
$("#redo").addEventListener("click", () => { if (!future.length) return; history.push(snapshot()); deck = JSON.parse(future.pop()); render(); });
const download = async (format) => { const response = await fetch(`/api/export/${format}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(deck) }); if (!response.ok) return alert((await response.json()).error); const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `pptgeni-presentation.${format}`; link.click(); URL.revokeObjectURL(link.href); };
$("#exportPptx").addEventListener("click", () => download("pptx"));
$("#exportPdf").addEventListener("click", () => download("pdf"));
loadThemes();
