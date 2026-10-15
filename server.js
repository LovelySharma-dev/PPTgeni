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

const freeModelFallback = [
  { id: "openrouter/free", name: "OpenRouter Free Router", provider: "OpenRouter" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (free)", provider: "DeepSeek" },
  { id: "deepseek/deepseek-chat:free", name: "DeepSeek Chat (free)", provider: "DeepSeek" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Experimental (free)", provider: "Google" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (free)", provider: "Meta" },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (free)", provider: "Qwen" }
];

function parsePrompt(prompt) {
  const text = String(prompt || "").trim();
  const count = Number(text.match(/(\d+)\s*(?:-|\s)?\s*slide/i)?.[1]) || 8;
  const topic = text.replace(/create\s+(?:a\s+)?\d+\s*[-\s]?slide.*?(?:on|about)\s+/i, "").split(/[.!?]/)[0].trim() || "A compelling new idea";
  return { topic, slideCount: Math.min(Math.max(count, 4), 16), audience: /student|academic|university|research/i.test(text) ? "academic audience" : "professional audience" };
}

function localDeck(prompt, theme = "midnight") {
  const spec = parsePrompt(prompt);
  const t = themes[theme] || themes.midnight;
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

async function generateDeck(prompt, theme, requestedModel) {
  const providers = [
    { name: "OpenRouter free provider", url: process.env.AI_API_URL, key: process.env.AI_API_KEY, model: requestedModel === "openrouter/free" || requestedModel?.endsWith(":free") ? requestedModel : "openrouter/free" }
  ].filter((provider) => provider.url && provider.key && provider.model);
  if (!providers.length) return { ...localDeck(prompt, theme), generationSource: "local fallback" };
  const failures = [];
  for (const provider of providers) {
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
      if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length < 1 || parsed.slides.some((item) => !item.title || !Array.isArray(item.elements) || item.elements.length < 1)) throw new Error("returned invalid slide structure or missing visuals");
      return { ...parsed, theme, themeConfig: themes[theme] || themes.midnight, spec: parsePrompt(prompt), generationSource: provider.name };
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
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
    const data = await response.json();
    const models = (data.data || [])
      .filter((model) => model.id === "openrouter/free" || model.id.endsWith(":free"))
      .map((model) => ({ id: model.id, name: model.name || model.id, provider: model.id.split("/")[0] }))
      .sort((a, b) => `${b.id.toLowerCase().includes("deepseek")}${a.name}`.localeCompare(`${a.id.toLowerCase().includes("deepseek")}${b.name}`));
    const known = new Set(models.map((model) => model.id));
    res.json([...models, ...freeModelFallback.filter((model) => !known.has(model.id))]);
  } catch (error) {
    console.warn(`Could not load OpenRouter free models: ${error.message}`);
    res.json(freeModelFallback);
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
      if (slide.metrics) slide.metrics.forEach((m, i) => page.addText([{ text: m.value, options: { bold: true, breakLine: true } }, { text: m.label }], { x: 0.8 + i * 3.9, y: 3.2, w: 3.3, h: 1.2, fontSize: 22, color: theme.accent, margin: 0.1 }));
      for (const element of slide.elements || []) {
        const x = (Number(element.x || 8) / 100) * 13.333;
        const y = (Number(element.y || 30) / 100) * 7.5;
        const w = (Number(element.w || 30) / 100) * 13.333;
        const h = (Number(element.h || 18) / 100) * 7.5;
        if (element.kind === "text") page.addText(element.text || "", { x, y, w, h, fontFace: element.font || "Aptos", fontSize: Number(element.size || 18), color: (element.color || theme.text).replace("#", ""), margin: 0.08, breakLine: false });
        if (element.kind === "shape") page.addShape(PptxGenJS.ShapeType.roundRect, { x, y, w, h, fill: { color: (element.color || theme.accent).replace("#", ""), transparency: 18 }, line: { color: (element.color || theme.accent).replace("#", ""), transparency: 100 } });
        if (element.kind === "divider") page.addShape(PptxGenJS.ShapeType.line, { x, y, w, h: 0, line: { color: (element.color || theme.accent).replace("#", ""), width: 2 } });
        if (element.kind === "image" && /^https?:\/\//i.test(element.src || "")) page.addImage({ path: element.src, x, y, w, h });
        if (element.kind === "chart") page.addChart(PptxGenJS.ChartType.bar, [{ name: element.label || "Data", labels: ["A", "B", "C", "D"], values: element.values || [42, 68, 55, 84] }], { x, y, w, h, catAxisLabelFontFace: "Aptos", showLegend: false, chartColors: [theme.accent.replace("#", "")] });
        if (element.kind === "diagram" || element.kind === "timeline") page.addText(element.label || element.kind, { x, y, w, h, color: theme.accent.replace("#", ""), bold: true, align: "center", valign: "mid", margin: 0.08, fit: "shrink" });
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
    await page.setContent(`<!doctype html><style>@page{size:13.333in 7.5in;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#${req.body.themeConfig?.background || "101827"};color:#${req.body.themeConfig?.text || "F8FAFC"}}.slide{width:13.333in;height:7.5in;padding:.7in;page-break-after:always;position:relative}.title{font-size:34px;font-weight:bold}.copy{margin-top:28px;font-size:22px;line-height:1.45;color:#${req.body.themeConfig?.muted || "A8B7CF"}}.num{position:absolute;right:.7in;bottom:.35in}</style>${(req.body.slides || []).map((s, i) => `<section class="slide"><div class="title">${escapeHtml(s.title || "")}</div><div class="copy">${escapeHtml(s.subtitle || s.takeaway || s.body || s.quote || s.steps?.join(" · ") || "")}</div><div class="num">${String(i + 1).padStart(2, "0")}</div></section>`).join("")}`, { waitUntil: "load" });
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
