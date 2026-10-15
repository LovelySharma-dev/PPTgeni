import express from "express";
import dotenv from "dotenv";
import next from "next";
import PptxGenJS from "pptxgenjs";
import puppeteer from "puppeteer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const nextApp = next({ dev: process.env.NODE_ENV !== "production" });
const nextHandler = nextApp.getRequestHandler();
const port = Number(process.env.PORT || 3000);
const exportsDir = path.join(__dirname, "exports");
await mkdir(exportsDir, { recursive: true });

app.use(express.json({ limit: "1mb" }));

const themes = {
  midnight: { name: "Premium dark", background: "101827", surface: "172338", text: "F8FAFC", muted: "A8B7CF", accent: "5EEAD4" },
  paper: { name: "Minimal academic", background: "F7F5F0", surface: "FFFFFF", text: "172033", muted: "5E687A", accent: "2457D6" },
  coral: { name: "Editorial", background: "FFF7F3", surface: "FFFFFF", text: "2D1B28", muted: "826675", accent: "E56B5D" },
  cobalt: { name: "Startup pitch", background: "EEF4FF", surface: "FFFFFF", text: "10234F", muted: "58709E", accent: "3B5BDB" },
  hackathon: { name: "Hackathon neon", background: "0B1020", surface: "151D35", text: "F7FAFF", muted: "AAB8D5", accent: "A78BFA" },
  terminal: { name: "Terminal green", background: "07120F", surface: "10231C", text: "E7FFF4", muted: "9AC7B0", accent: "48E39A" },
  sunrise: { name: "Demo day", background: "FFF4E6", surface: "FFFFFF", text: "29180E", muted: "8A6048", accent: "FF6B35" },
  electric: { name: "Electric blue", background: "07152E", surface: "102A54", text: "F1F7FF", muted: "A5C3EA", accent: "38BDF8" }
};

const openRouterModelsUrl = "https://openrouter.ai/api/v1/models";

function parsePrompt(prompt) {
  const text = String(prompt || "").trim();
  const count = Number(text.match(/(\d+)\s*(?:-|\s)?\s*slide/i)?.[1]) || 8;
  const topic = text.replace(/create\s+(?:a\s+)?\d+\s*[-\s]?slide.*?(?:on|about)\s+/i, "").split(/[.!?]/)[0].trim() || "A compelling new idea";
  return { topic, slideCount: Math.min(Math.max(count, 4), 16), audience: /student|academic|university|research/i.test(text) ? "academic audience" : "professional audience" };
}

function localDeck(prompt, theme = "midnight") {
  const spec = parsePrompt(prompt);
  const t = themes[theme] || themes.midnight;
  if (/campus safety|hackathon|privacy-first/i.test(prompt)) {
    const slides = [
      { type: "title", title: "Safety support that respects privacy", subtitle: "A campus safety assistant for faster, calmer decisions", body: "Built for a university hackathon jury: help students find the right support without turning sensitive moments into a data trail.", elements: [{ kind: "shape", shape: "circle", label: "Privacy by design", x: 70, y: 54, w: 20, h: 20 }] },
      { type: "statement", title: "Students need help before a situation becomes an incident", takeaway: "The gap is not awareness; it is the friction between uncertainty and the next safe action.", body: "Students may not know whether to contact campus security, health services, a resident advisor, or a trusted person. In a stressful moment, searching across disconnected channels delays action and can expose more personal information than necessary.", bullets: ["Unclear first step", "Fragmented campus resources", "Fear of creating a permanent record"], elements: [{ kind: "diagram", label: "Uncertainty → friction → delayed support", items: ["Uncertainty", "Friction", "Delayed support"], x: 52, y: 28, w: 40, h: 30 }] },
      { type: "comparison", title: "One calm path for students and responders", takeaway: "The assistant turns a vague concern into a user-controlled next step.", body: "Students describe what they need in plain language. The system suggests the smallest useful action, shows why it fits, and keeps escalation in the student's hands.", left: { label: "Without a guide", items: ["Search many pages", "Repeat the story", "Guess who to contact"] }, right: { label: "With the assistant", items: ["Describe the need once", "See safe options", "Choose what to share"] }, elements: [{ kind: "diagram", label: "Need → options → chosen support", items: ["Need", "Options", "Chosen support"], x: 52, y: 30, w: 40, h: 30 }] },
      { type: "process", title: "The experience is designed around consent", takeaway: "Every step makes the next action visible without forcing disclosure.", body: "The assistant helps with navigation, not surveillance. It can answer questions, explain campus resources, and offer escalation paths while the student controls what happens next.", steps: ["Describe the situation", "Clarify urgency and preferences", "Show relevant campus options", "Confirm the student's next action"], elements: [{ kind: "timeline", label: "Describe → clarify → choose → act", items: ["Describe", "Clarify", "Choose", "Act"], x: 48, y: 30, w: 44, h: 28 }] },
      { type: "statement", title: "A small system can stay trustworthy by keeping boundaries explicit", takeaway: "The assistant routes people to approved support; it does not diagnose, investigate, or silently report.", body: "The product separates conversation from campus systems. It minimizes retained data, makes escalation explicit, and keeps human services responsible for decisions that require judgment.", bullets: ["Minimal data by default", "Visible escalation choices", "Human ownership of high-risk decisions"], elements: [{ kind: "diagram", label: "Student → assistant → approved service", items: ["Student", "Assistant", "Approved service"], x: 52, y: 28, w: 40, h: 30 }] },
      { type: "process", title: "From message to support in a focused demo", takeaway: "The demo proves usefulness in under a minute without pretending the model replaces people.", body: "A student asks for help finding a safe route after an uncomfortable encounter. The assistant asks one clarifying question, presents two campus options, and lets the student choose whether to contact a human.", steps: ["Ask for help", "Clarify the immediate need", "Compare two options", "Hand off with consent"], elements: [{ kind: "timeline", label: "Ask → clarify → compare → hand off", items: ["Ask", "Clarify", "Compare", "Hand off"], x: 48, y: 30, w: 44, h: 28 }] },
      { type: "comparison", title: "Differentiation is a product boundary, not a bigger model", takeaway: "Trust comes from constrained actions, explainable routing, and privacy-preserving defaults.", body: "The concept competes by making the safe path easier to understand. It does not claim to predict incidents or produce unsupported risk scores.", left: { label: "Common assistant pattern", items: ["Broad data collection", "Opaque recommendations", "Automation first"] }, right: { label: "PPTgeni concept", items: ["Data minimization", "Explainable options", "Consent before handoff"] }, elements: [{ kind: "shape", shape: "rounded", label: "Trust is the differentiator", x: 61, y: 34, w: 28, h: 22 }] },
      { type: "closing", title: "Make the next safe action easier to take", subtitle: "Start with a focused campus pilot, measure clarity and successful handoffs, then expand carefully.", body: "Next step: validate the resource map with students and campus services before adding more automation.", bullets: ["Pilot with approved resources", "Measure time-to-right-support", "Review privacy and safety with stakeholders"], elements: [{ kind: "diagram", label: "Pilot → learn → improve", items: ["Pilot", "Learn", "Improve"], x: 54, y: 30, w: 38, h: 26 }] }
    ];
    return { title: "Privacy-first campus safety assistant", theme, themeConfig: t, spec, slides };
  }
  const slides = [
    { type: "title", title: spec.topic, subtitle: `A clear, visual story for a ${spec.audience}`, notes: "Open with the audience problem and why it matters now.", elements: [{ kind: "shape", shape: "circle", label: "Opportunity", x: 70, y: 58, w: 20, h: 20 }] },
    { type: "statement", title: "Why this matters now", takeaway: "The status quo creates a visible opportunity for change.", body: `Most teams understand the need to improve ${spec.topic.toLowerCase()}, but fragmented information and unclear next steps slow progress.`, elements: [{ kind: "chart", label: "Current friction", values: [42, 68, 55, 84], x: 58, y: 27, w: 32, h: 38 }] },
    { type: "comparison", title: "From friction to flow", takeaway: "A focused approach turns complexity into a repeatable process.", left: { label: "Today", items: ["Scattered inputs", "Manual decisions", "Hard-to-measure outcomes"] }, right: { label: "With a clear system", items: ["Structured inputs", "Guided decisions", "Visible progress"] }, elements: [{ kind: "diagram", label: "Before → after", x: 53, y: 28, w: 37, h: 30 }] },
    { type: "process", title: "A practical path forward", takeaway: "Small, validated steps compound into a stronger result.", steps: ["Understand the goal", "Shape the narrative", "Make the evidence visual", "Review and improve"], elements: [{ kind: "timeline", label: "4-step process", x: 48, y: 28, w: 43, h: 28 }] },
    { type: "metrics", title: "What good looks like", takeaway: "Quality is measurable before the final export.", metrics: [{ value: "01", label: "Message per slide" }, { value: "16:9", label: "Consistent canvas" }, { value: "100%", label: "Editable structure" }], elements: [{ kind: "chart", label: "Quality signals", values: [35, 60, 82, 95], x: 55, y: 45, w: 35, h: 30 }] },
    { type: "statement", title: "Design for understanding", takeaway: "Every visual should carry meaning, not decoration.", body: "Use contrast to establish hierarchy, whitespace to reduce cognitive load, and diagrams when relationships matter more than prose.", elements: [{ kind: "shape", shape: "rounded", label: "Meaningful visual", x: 61, y: 30, w: 28, h: 24 }] },
    { type: "quote", title: "The audience should remember the idea", quote: "A presentation earns attention by making the next thought easier to understand.", attribution: "PPTgeni design principle", elements: [{ kind: "shape", shape: "rounded", label: "Remember this", x: 62, y: 31, w: 27, h: 22 }] },
    { type: "closing", title: "Make the next version clearer", subtitle: "Start with the message. Let the system handle the structure.", notes: "Close by restating the single action the audience should take.", elements: [{ kind: "diagram", label: "Idea → action", x: 57, y: 30, w: 34, h: 25 }] }
  ];
  while (slides.length < spec.slideCount) slides.splice(-1, 0, { type: "statement", title: `${spec.topic}: one clear idea`, takeaway: "Clarity is a design decision.", body: "Replace dense paragraphs with a focused claim, supporting evidence, and one visual that helps the audience see the connection.", elements: [{ kind: "shape", shape: "rounded", label: "Key idea", x: 64, y: 32, w: 25, h: 20 }] });
  return { title: spec.topic, theme, themeConfig: t, spec, slides: slides.slice(0, spec.slideCount) };
}

function normalizeVisual(element, theme) {
  if (!element || typeof element !== "object") return null;
  const kind = ["chart", "diagram", "timeline", "shape", "image", "text", "divider"].includes(element.kind) ? element.kind : "shape";
  const visual = {
    ...element,
    kind,
    label: String(element.label || (kind === "chart" ? "Supporting data" : "Key idea")).slice(0, 120),
    x: Math.min(Math.max(Number(element.x) || 56, 4), 88),
    y: Math.min(Math.max(Number(element.y) || 28, 8), 78),
    w: Math.min(Math.max(Number(element.w) || 34, 10), 48),
    h: Math.min(Math.max(Number(element.h) || 24, 10), 48),
    color: typeof element.color === "string" ? element.color : `#${theme.accent}`
  };
  if (kind === "chart") visual.values = Array.isArray(element.values) && element.values.length ? element.values.slice(0, 8).map((value) => Math.max(0, Number(value) || 0)) : [42, 68, 55, 84];
  if (kind === "shape") visual.shape = element.shape === "circle" ? "circle" : "rounded";
  if (kind === "text") visual.text = String(element.text || visual.label).slice(0, 240);
  if (kind === "image" && !/^https?:\/\//i.test(element.src || "")) return null;
  return visual;
}

function normalizeDeck(deck, prompt, theme) {
  const themeConfig = themes[theme] || themes.midnight;
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  if (!slides.length) return { ...localDeck(prompt, theme), generationSource: "local fallback" };
  return {
    ...deck,
    title: String(deck.title || parsePrompt(prompt).topic).slice(0, 160),
    theme,
    themeConfig,
    spec: parsePrompt(prompt),
    slides: slides.map((slide, index) => {
      const elements = (Array.isArray(slide.elements) ? slide.elements : []).map((element) => normalizeVisual(element, themeConfig)).filter(Boolean);
      if (!elements.length) elements.push(normalizeVisual({ kind: index % 2 ? "chart" : "shape", label: "System-enriched visual" }, themeConfig));
      return { ...slide, title: String(slide.title || `Slide ${index + 1}`).slice(0, 160), elements };
    })
  };
}

async function fetchFreeModels() {
  const response = await fetch(openRouterModelsUrl);
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  const data = await response.json();
  return (data.data || [])
    .filter((model) => model.id === "openrouter/free" || model.id.endsWith(":free"))
    .map((model) => ({ id: model.id, name: model.name || model.id, provider: model.id.split("/")[0] }))
    .sort((a, b) => a.id === "openrouter/free" ? -1 : b.id === "openrouter/free" ? 1 : a.name.localeCompare(b.name));
}

async function generateDeck(prompt, theme, requestedModel) {
  if (!process.env.AI_API_URL || !process.env.AI_API_KEY) return { ...localDeck(prompt, theme), generationSource: "local fallback" };
  let availableModels = [];
  let catalogFailed = false;
  try { availableModels = await fetchFreeModels(); } catch (error) { catalogFailed = true; console.warn(`Could not refresh OpenRouter free models: ${error.message}`); }
  const selected = availableModels.some((model) => model.id === requestedModel) ? requestedModel : availableModels[0]?.id;
  const candidates = availableModels
    .sort((a, b) => Number(b.id === selected) - Number(a.id === selected))
    .map((model) => ({ name: `${model.provider} free model`, model: model.id }));
  if (!candidates.length && catalogFailed) candidates.push({ name: "OpenRouter free router", model: "openrouter/free" });
  const failures = [];
  for (const provider of candidates) {
    try {
      const headers = {
        "content-type": "application/json",
        authorization: `Bearer ${provider.key}`
      };
      if (provider.url.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost:3000";
        headers["X-Title"] = "PPTgeni";
      }
      const requestBody = (useJsonMode) => ({ model: provider.model, temperature: 0.4, ...(useJsonMode ? { response_format: { type: "json_object" } } : {}), messages: [
      { role: "system", content: "Return only valid JSON matching {title,slides}. Create concise, specific content for every slide. Every slide must include at least one visual element in an elements array. Visual elements must be trusted data only: {kind:'chart',label,values:[number,number,number,number],x,y,w,h}, {kind:'diagram',label,x,y,w,h}, {kind:'timeline',label,x,y,w,h}, {kind:'shape',shape:'circle'|'rounded',label,x,y,w,h}, or {kind:'image',src,label,x,y,w,h} using a relevant stable https image URL only when appropriate. Use varied slide types title,statement,comparison,process,metrics,quote,closing. Never return JavaScript, HTML, markdown, or invented citations." },
      { role: "user", content: prompt }
        ] });
      let response = await fetch(provider.url, { method: "POST", headers, body: JSON.stringify(requestBody(true)) });
      if (!response.ok && [400, 404, 422].includes(response.status)) {
        response = await fetch(provider.url, { method: "POST", headers, body: JSON.stringify(requestBody(false)) });
      }
      if (!response.ok) {
        const providerMessage = (await response.text()).replace(/\b(sk|hf|or-v1)_[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 240);
        throw new Error(`returned ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`);
      }
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      const content = Array.isArray(rawContent) ? rawContent.map((part) => part.text || "").join("") : rawContent;
      if (!content) throw new Error("returned no content");
      const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
      if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length < 1 || parsed.slides.some((item) => !item.title)) throw new Error("returned invalid slide structure");
      return { ...normalizeDeck(parsed, prompt, theme), model: provider.model, generationSource: provider.name };
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`);
    }
  }
  console.warn(`AI providers failed; using local generator. ${failures.join("; ")}`);
  return { ...localDeck(prompt, theme), generationSource: "local fallback" };
}

app.get("/api/themes", (_req, res) => res.json(Object.entries(themes).map(([id, value]) => ({ id, ...value }))));
app.get("/api/models", async (_req, res) => {
  try {
    res.json(await fetchFreeModels());
  } catch (error) {
    console.warn(`Could not load OpenRouter free models: ${error.message}`);
    res.json([{ id: "openrouter/free", name: "OpenRouter Free Router", provider: "OpenRouter" }]);
  }
});
app.post("/api/generate", async (req, res) => {
  try {
    if (!req.body?.prompt?.trim()) return res.status(400).json({ error: "A presentation prompt is required." });
    res.json(await generateDeck(req.body.prompt, req.body.theme, req.body.model));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/export/pptx", async (req, res) => {
  try {
    const deck = req.body;
    const theme = deck.themeConfig || themes.midnight;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "PPTgeni";
    pptx.subject = deck.title || "Presentation";
    for (const slide of deck.slides || []) {
      const page = pptx.addSlide();
      page.background = { color: theme.background };
      page.addText(slide.title || "", { x: 0.6, y: 0.45, w: 12.1, h: 0.55, fontFace: "Aptos Display", fontSize: 26, bold: true, color: theme.text, margin: 0 });
      if (slide.subtitle || slide.takeaway) page.addText(slide.subtitle || slide.takeaway, { x: 0.65, y: 1.2, w: 11.8, h: 0.7, fontSize: 15, color: theme.muted, margin: 0, breakLine: false });
      const body = slide.body || slide.quote || slide.steps?.join("\n") || slide.left?.items?.map((x) => `• ${x}`).join("\n") || "";
      if (body) page.addText(body, { x: 0.8, y: 2.2, w: 11.4, h: 3, fontSize: 21, color: theme.text, breakLine: false, valign: "mid", margin: 0.1, bullet: body.includes("•") ? { type: "ul" } : undefined });
      if (Array.isArray(slide.bullets) && slide.bullets.length) page.addText(slide.bullets.map((item) => `• ${item}`).join("\n"), { x: 0.8, y: 4.75, w: 5.7, h: 1.35, fontSize: 15, color: theme.muted, breakLine: false, margin: 0.06, bullet: { type: "ul" } });
      if (slide.metrics) slide.metrics.forEach((m, i) => page.addText([{ text: m.value, options: { bold: true, breakLine: true } }, { text: m.label }], { x: 0.8 + i * 3.9, y: 3.2, w: 3.3, h: 1.2, fontSize: 22, color: theme.accent, margin: 0.1 }));
      for (const element of slide.elements || []) {
        const x = (Number(element.x || 8) / 100) * 13.333;
        const y = (Number(element.y || 30) / 100) * 7.5;
        const w = (Number(element.w || 30) / 100) * 13.333;
        const h = (Number(element.h || 18) / 100) * 7.5;
        if (element.kind === "text") page.addText(element.text || "", { x, y, w, h, fontFace: element.font || "Aptos", fontSize: Number(element.size || 18), color: (element.color || theme.text).replace("#", ""), margin: 0.08, breakLine: false });
        if (element.kind === "shape") page.addShape("roundRect", { x, y, w, h, fill: { color: (element.color || theme.accent).replace("#", ""), transparency: 18 }, line: { color: (element.color || theme.accent).replace("#", ""), transparency: 100 } });
        if (element.kind === "divider") page.addShape("line", { x, y, w, h: 0, line: { color: (element.color || theme.accent).replace("#", ""), width: 2 } });
        if (element.kind === "image" && /^https?:\/\//i.test(element.src || "")) page.addImage({ path: element.src, x, y, w, h });
        if (element.kind === "chart") page.addChart(PptxGenJS.ChartType.bar, [{ name: element.label || "Data", labels: ["A", "B", "C", "D"], values: element.values || [42, 68, 55, 84] }], { x, y, w, h, catAxisLabelFontFace: "Aptos", showLegend: false, chartColors: [theme.accent.replace("#", "")] });
        if (element.kind === "diagram" || element.kind === "timeline") {
          page.addText(element.label || element.kind, { x, y, w, h: 0.35, color: theme.accent.replace("#", ""), bold: true, align: "center", margin: 0.02, fit: "shrink" });
          (element.items || []).forEach((item, index) => page.addText(String(item), { x: x + (w / Math.max(element.items.length, 1)) * index, y: y + 0.5, w: w / Math.max(element.items.length, 1) - 0.08, h: Math.max(h - 0.6, 0.35), color: theme.text.replace("#", ""), align: "center", valign: "mid", margin: 0.06, fill: { color: theme.surface.replace("#", "") }, line: { color: theme.accent.replace("#", ""), width: 1 }, fit: "shrink" }));
        }
      }
      page.addText(`${String(deck.slides.indexOf(slide) + 1).padStart(2, "0")}`, { x: 11.9, y: 6.8, w: 0.5, h: 0.2, fontSize: 9, color: theme.muted, align: "right", margin: 0 });
    }
    const filename = `${randomUUID()}.pptx`;
    const output = path.join(exportsDir, filename);
    await pptx.writeFile({ fileName: output });
    res.download(output, "pptgeni-presentation.pptx");
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/export/pdf", async (req, res) => {
  try {
    const filename = `${randomUUID()}.pdf`;
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const theme = req.body.themeConfig || themes.midnight;
    const slides = req.body.slides || [];
    const elementHtml = (element) => {
      const x = Number(element.x || 56);
      const y = Number(element.y || 28);
      const w = Number(element.w || 34);
      const h = Number(element.h || 24);
      const style = `left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;
      if (element.kind === "chart") return `<div class="visual chart" style="${style}"><div class="bars">${(element.values || [42, 68, 55, 84]).map((value) => `<i style="height:${Math.min(Math.max(Number(value) || 0, 4), 100)}%"></i>`).join("")}</div><small>${escapeHtml(element.label || "Chart")}</small></div>`;
      if (element.kind === "diagram" || element.kind === "timeline") return `<div class="visual flow" style="${style}"><strong>${escapeHtml(element.label || element.kind)}</strong><div class="nodes">${(element.items || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>`;
      if (element.kind === "text") return `<div class="visual text-visual" style="${style}">${escapeHtml(element.text || element.label || "")}</div>`;
      if (element.kind === "image" && /^https?:\/\//i.test(element.src || "")) return `<img class="visual" style="${style}" src="${escapeHtml(element.src)}" alt="${escapeHtml(element.label || "Slide image")}">`;
      return `<div class="visual shape" style="${style}"><strong>${escapeHtml(element.label || "Key idea")}</strong></div>`;
    };
    const slideHtml = (slide, index) => {
      const body = slide.body || slide.quote || slide.steps?.join(" · ") || slide.left?.items?.map((item) => `• ${item}`).join("\n") || "";
      const bullets = Array.isArray(slide.bullets) ? `<ul>${slide.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
      return `<section class="slide"><div class="kicker">${escapeHtml(slide.type || "PRESENTATION")}</div><div class="title">${escapeHtml(slide.title || "")}</div><div class="copy">${escapeHtml(slide.subtitle || slide.takeaway || "")}</div><div class="body">${escapeHtml(body).replace(/\n/g, "<br>")}${bullets}</div><div class="visuals">${(slide.elements || []).map(elementHtml).join("")}</div><div class="num">${String(index + 1).padStart(2, "0")}</div></section>`;
    };
    await page.setContent(`<!doctype html><style>@page{size:13.333in 7.5in;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#${theme.background};color:#${theme.text}}.slide{width:13.333in;height:7.5in;padding:.62in .72in;page-break-after:always;position:relative;overflow:hidden}.kicker{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#${theme.accent};font-weight:bold}.title{margin-top:12px;max-width:68%;font-size:31px;line-height:1.08;font-weight:bold}.copy{margin-top:16px;max-width:62%;font-size:17px;line-height:1.35;color:#${theme.muted}}.body{margin-top:20px;max-width:57%;font-size:16px;line-height:1.38}.body ul{padding-left:20px}.body li{margin:7px 0}.visuals{position:absolute;inset:0}.visual{position:absolute;border-radius:14px;border:1px solid #${theme.accent}55;background:#${theme.surface}dd;color:#${theme.text};padding:14px;z-index:1}.visual small{display:block;margin-top:8px;color:#${theme.muted}}.shape{display:flex;align-items:center;justify-content:center;text-align:center}.flow strong{display:block;color:#${theme.accent};font-size:13px}.nodes{display:flex;gap:7px;align-items:center;justify-content:center;margin-top:14px;flex-wrap:wrap}.nodes span{border:1px solid #${theme.accent}99;border-radius:8px;padding:7px 9px;font-size:11px}.chart{display:flex;flex-direction:column;justify-content:flex-end}.bars{height:80%;display:flex;gap:10px;align-items:flex-end}.bars i{display:block;flex:1;background:#${theme.accent};border-radius:5px 5px 0 0}.text-visual{font-size:16px}.num{position:absolute;right:.7in;bottom:.35in;color:#${theme.muted};font-size:10px}</style>${slides.map(slideHtml).join("")}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);
    await page.pdf({ path: path.join(exportsDir, filename), printBackground: true, width: "13.333in", height: "7.5in", pageRanges: "1-" });
    await browser.close();
    res.download(path.join(exportsDir, filename), "pptgeni-presentation.pdf");
  } catch (error) { res.status(500).json({ error: error.message }); }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

await nextApp.prepare();
app.all("*", (req, res) => nextHandler(req, res));
app.listen(port, () => console.log(`PPTgeni running at http://localhost:${port}`));
