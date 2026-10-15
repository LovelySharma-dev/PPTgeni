import express from "express";
import dotenv from "dotenv";
import PptxGenJS from "pptxgenjs";
import puppeteer from "puppeteer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const exportsDir = path.join(__dirname, "exports");
await mkdir(exportsDir, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const themes = {
  midnight: { name: "Premium dark", background: "101827", surface: "172338", text: "F8FAFC", muted: "A8B7CF", accent: "5EEAD4" },
  paper: { name: "Minimal academic", background: "F7F5F0", surface: "FFFFFF", text: "172033", muted: "5E687A", accent: "2457D6" },
  coral: { name: "Editorial", background: "FFF7F3", surface: "FFFFFF", text: "2D1B28", muted: "826675", accent: "E56B5D" },
  cobalt: { name: "Startup pitch", background: "EEF4FF", surface: "FFFFFF", text: "10234F", muted: "58709E", accent: "3B5BDB" }
};

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
    { type: "title", title: spec.topic, subtitle: `A clear, visual story for a ${spec.audience}`, notes: "Open with the audience problem and why it matters now." },
    { type: "statement", title: "Why this matters now", takeaway: "The status quo creates a visible opportunity for change.", body: `Most teams understand the need to improve ${spec.topic.toLowerCase()}, but fragmented information and unclear next steps slow progress.` },
    { type: "comparison", title: "From friction to flow", takeaway: "A focused approach turns complexity into a repeatable process.", left: { label: "Today", items: ["Scattered inputs", "Manual decisions", "Hard-to-measure outcomes"] }, right: { label: "With a clear system", items: ["Structured inputs", "Guided decisions", "Visible progress"] } },
    { type: "process", title: "A practical path forward", takeaway: "Small, validated steps compound into a stronger result.", steps: ["Understand the goal", "Shape the narrative", "Make the evidence visual", "Review and improve"] },
    { type: "metrics", title: "What good looks like", takeaway: "Quality is measurable before the final export.", metrics: [{ value: "01", label: "Message per slide" }, { value: "16:9", label: "Consistent canvas" }, { value: "100%", label: "Editable structure" }] },
    { type: "statement", title: "Design for understanding", takeaway: "Every visual should carry meaning, not decoration.", body: "Use contrast to establish hierarchy, whitespace to reduce cognitive load, and diagrams when relationships matter more than prose." },
    { type: "quote", title: "The audience should remember the idea", quote: "A presentation earns attention by making the next thought easier to understand.", attribution: "PPTgeni design principle" },
    { type: "closing", title: "Make the next version clearer", subtitle: "Start with the message. Let the system handle the structure.", notes: "Close by restating the single action the audience should take." }
  ];
  while (slides.length < spec.slideCount) slides.splice(-1, 0, { type: "statement", title: "One idea, made visible", takeaway: "Clarity is a design decision.", body: "Replace dense paragraphs with a focused claim, supporting evidence, and one visual that helps the audience see the connection." });
  return { title: spec.topic, theme, themeConfig: t, spec, slides: slides.slice(0, spec.slideCount) };
}

async function generateDeck(prompt, theme) {
  const providers = [
    { name: "primary AI provider", url: process.env.AI_API_URL, key: process.env.AI_API_KEY, model: process.env.AI_MODEL },
    { name: "Hugging Face fallback", url: process.env.AI_FALLBACK_API_URL, key: process.env.AI_FALLBACK_API_KEY, model: process.env.AI_FALLBACK_MODEL }
  ].filter((provider) => provider.url && provider.key && provider.model);
  if (!providers.length) return localDeck(prompt, theme);
  const failures = [];
  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({ model: provider.model, temperature: 0.4, messages: [
      { role: "system", content: "Return only valid JSON matching {title,slides}. Each slide has type,title and concise presentation-ready fields. Use types title,statement,comparison,process,metrics,quote,closing." },
      { role: "user", content: prompt }
        ] })
      });
      if (!response.ok) throw new Error(`returned ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("returned no content");
      const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
      return { ...parsed, theme, themeConfig: themes[theme] || themes.midnight, spec: parsePrompt(prompt) };
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`);
    }
  }
  console.warn(`AI providers failed; using local generator. ${failures.join("; ")}`);
  return localDeck(prompt, theme);
}

app.get("/api/themes", (_req, res) => res.json(Object.entries(themes).map(([id, value]) => ({ id, ...value }))));
app.post("/api/generate", async (req, res) => {
  try {
    if (!req.body?.prompt?.trim()) return res.status(400).json({ error: "A presentation prompt is required." });
    res.json(await generateDeck(req.body.prompt, req.body.theme));
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

app.listen(port, () => console.log(`PPTgeni running at http://localhost:${port}`));
