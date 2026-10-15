const $ = (selector) => document.querySelector(selector);
let deck = null;
let selected = 0;
let history = [];
let future = [];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const slide = () => deck.slides[selected];
const saveState = () => { history.push(JSON.stringify(deck)); future = []; };
const elementMarkup = (element) => {
  const style = `left:${element.x || 8}%;top:${element.y || 30}%;width:${element.w || 42}%;height:${element.h || 18}%;color:${element.color || "#ffffff"};font-size:${element.size || 18}px;font-family:${element.font || deck.font || "Aptos"};`;
  if (element.kind === "shape") return `<div class="canvas-element shape-element ${element.shape || "rounded"}" style="${style}background:${element.color || "#5eead4"}"></div>`;
  if (element.kind === "divider") return `<div class="canvas-element divider-element" style="${style}background:${element.color || "#5eead4"}"></div>`;
  if (element.kind === "image") return `<img class="canvas-element media-element" style="${style}" src="${escapeHtml(element.src)}" alt="Slide image">`;
  if (element.kind === "video") return `<div class="canvas-element video-element" style="${style}"><span>▶</span><small>${escapeHtml(element.src)}</small></div>`;
  if (element.kind === "chart") return `<div class="canvas-element chart-element" style="${style}"><div class="bars">${(element.values || [40, 65, 52, 82]).map((value) => `<i style="height:${value}%"></i>`).join("")}</div><small>${escapeHtml(element.label || "Chart")}</small></div>`;
  return `<div class="canvas-element text-element" style="${style}">${escapeHtml(element.text || "Double-click to edit")}</div>`;
};

const render = () => {
  if (!deck) return;
  const current = slide();
  const theme = deck.themeConfig;
  document.documentElement.style.setProperty("--accent", `#${theme.accent}`);
  $("#deckTitle").textContent = deck.title || "Untitled presentation";
  $("#theme").value = deck.theme;
  $("#fontFamily").value = deck.font || "Aptos";
  $("#slideTitle").value = current.title || "";
  $("#slideTakeaway").value = current.takeaway || current.subtitle || "";
  $("#slideBody").value = current.body || current.quote || current.steps?.join("\n") || "";
  $("#slideLayout").value = current.layout || current.type || "statement";
  $("#accentColor").value = `#${current.accent || theme.accent}`;
  $("#canvas").style.background = `#${theme.background}`;
  $("#canvas").style.fontFamily = deck.font || "Aptos";
  $("#canvas").innerHTML = `<div class="slide-title">${escapeHtml(current.title || "")}</div>${current.metrics ? `<div class="metric-row">${current.metrics.map((m) => `<div class="metric"><strong>${escapeHtml(m.value)}</strong><span>${escapeHtml(m.label)}</span></div>`).join("")}</div>` : `<div class="${current.type === "quote" ? "quote" : "slide-copy"}">${escapeHtml(current.quote || current.body || current.takeaway || current.subtitle || current.steps?.join(" · ") || "")}</div>`}${(current.elements || []).map(elementMarkup).join("")}<div class="slide-number">${String(selected + 1).padStart(2, "0")} / ${String(deck.slides.length).padStart(2, "0")}</div>`;
  $("#thumbnails").innerHTML = deck.slides.map((item, index) => `<button class="thumb ${index === selected ? "active" : ""}" data-index="${index}"><strong>${String(index + 1).padStart(2, "0")} ${escapeHtml(item.title || "Untitled")}</strong>${escapeHtml(item.takeaway || item.subtitle || "")}</button>`).join("");
  document.querySelectorAll(".thumb").forEach((button) => button.addEventListener("click", () => { selected = Number(button.dataset.index); render(); }));
  $("#elementList").innerHTML = (current.elements || []).map((item, index) => `<button class="element-chip" data-element="${index}">${item.kind} <span>×</span></button>`).join("");
  document.querySelectorAll(".element-chip").forEach((button) => button.addEventListener("click", () => { saveState(); current.elements.splice(Number(button.dataset.element), 1); render(); }));
  $("#qualityText").textContent = `${deck.slides.length} slides · ${(current.elements || []).length} visual elements · ${(current.body || "").length > 260 ? "Review dense text" : "Readable density"}`;
  $("#exportPptx").disabled = $("#exportPdf").disabled = false;
  $("#undo").disabled = !history.length; $("#redo").disabled = !future.length;
};

const loadThemes = async () => {
  const themes = await fetch("/api/themes").then((response) => response.json());
  $("#theme").innerHTML = themes.map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join("");
};

const createDeck = async () => {
  const prompt = $("#prompt").value.trim();
  if (!prompt) return $("#prompt").focus();
  $("#generate").disabled = true; $("#generate").innerHTML = "Building your story…";
  try {
    deck = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, theme: "midnight" }) }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; });
    deck.font = "Aptos"; deck.slides.forEach((item) => { item.elements = []; });
    selected = 0; history = []; future = []; $("#welcome").classList.add("hidden"); $("#studio").classList.remove("hidden"); render();
  } catch (error) { alert(error.message); } finally { $("#generate").disabled = false; $("#generate").innerHTML = "Generate outline <span>→</span>"; }
};

const addElement = (kind) => {
  if (!deck) return;
  saveState();
  const element = { kind, x: 52, y: kind === "chart" ? 30 : 58, w: kind === "image" || kind === "video" ? 38 : 30, h: kind === "chart" ? 35 : 18, color: `#${deck.themeConfig.accent}` };
  if (kind === "text") element.text = "New text block";
  if (kind === "shape") element.shape = "rounded";
  if (kind === "chart") { element.label = "Key data"; element.values = [42, 68, 55, 84]; }
  if (kind === "image") element.src = prompt("Paste an image URL");
  if (kind === "video") element.src = prompt("Paste a video URL");
  if (!element.src && (kind === "image" || kind === "video")) { history.pop(); return; }
  slide().elements = [...(slide().elements || []), element]; render();
};

$("#generate").addEventListener("click", createDeck);
$("#prompt").addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") createDeck(); });
document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => { $("#prompt").value = button.dataset.example; $("#prompt").focus(); }));
document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => addElement(button.dataset.add)));
$("#addSlide").addEventListener("click", () => { saveState(); deck.slides.splice(selected + 1, 0, { type: "statement", title: "New slide", takeaway: "Add the one idea your audience should remember.", body: "", elements: [] }); selected += 1; render(); });
$("#theme").addEventListener("change", async (event) => { saveState(); deck.theme = event.target.value; deck.themeConfig = await fetch("/api/themes").then((r) => r.json()).then((all) => all.find((item) => item.id === deck.theme)); render(); });
$("#fontFamily").addEventListener("change", (event) => { saveState(); deck.font = event.target.value; render(); });
$("#saveSlide").addEventListener("click", () => { saveState(); const current = slide(); current.title = $("#slideTitle").value; current.takeaway = $("#slideTakeaway").value; current.body = $("#slideBody").value; current.type = $("#slideLayout").value; current.accent = $("#accentColor").value.slice(1); render(); });
$("#newDeck").addEventListener("click", () => { deck = null; $("#studio").classList.add("hidden"); $("#welcome").classList.remove("hidden"); });
$("#applyEdit").addEventListener("click", () => { const command = $("#editPrompt").value.trim(); if (!command || !deck) return; saveState(); if (/simpler|less text|shorter/i.test(command)) slide().body = (slide().body || "").split(/[.!?]/).slice(0, 2).join("."); if (/visual|diagram|chart/i.test(command)) addElement("chart"); $("#editPrompt").value = ""; render(); });
$("#undo").addEventListener("click", () => { if (!history.length) return; future.push(JSON.stringify(deck)); deck = JSON.parse(history.pop()); render(); });
$("#redo").addEventListener("click", () => { if (!future.length) return; history.push(JSON.stringify(deck)); deck = JSON.parse(future.pop()); render(); });
const download = async (format) => { const response = await fetch(`/api/export/${format}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(deck) }); if (!response.ok) return alert((await response.json()).error); const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `pptgeni-presentation.${format}`; link.click(); URL.revokeObjectURL(link.href); };
$("#exportPptx").addEventListener("click", () => download("pptx"));
$("#exportPdf").addEventListener("click", () => download("pdf"));
loadThemes();
