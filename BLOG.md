# Building PPTgeni: A Hackathon-Ready AI Presentation Studio

> Cross-post draft for DEV and Hashnode. Keep the repository link as the canonical URL after publishing.

## The problem

In a hackathon, the last hour often goes into formatting slides instead of explaining the product. A prompt-to-slides tool sounds like the answer, but a deck is not just text on rectangles. It needs a narrative, visual hierarchy, editable output, and a reliable export path.

That is the problem I set out to solve with **PPTgeni**: turn a rough brief into a structured presentation that can still be edited before demo day.

## The design decision that mattered

The most important choice was to make structured slide data the source of truth:

```json
{
  "type": "statement",
  "title": "Why this matters now",
  "takeaway": "The status quo creates a visible opportunity for change.",
  "body": "A concise explanation lives here.",
  "elements": [
    { "kind": "chart", "values": [42, 68, 55, 84] }
  ]
}
```

The model returns data, not executable browser code. Trusted UI components render the data in the editor, and separate exporters turn the same structure into PPTX and PDF. This avoids the fragile approach of asking an LLM to invent arbitrary HTML or JavaScript for every slide.

## The provider chain

PPTgeni tries:

1. An OpenRouter model selected by the user.
2. An optional Hugging Face-compatible fallback.
3. A deterministic local generator.

The free-model selector loads OpenRouter's current zero-price catalog and keeps DeepSeek free variants visible when available. The API request uses JSON mode because malformed slide data is much harder to debug than a normal prose response.

No API key is sent to the browser. Provider error messages are shortened and sanitized before they reach the terminal.

## The editor is intentionally small

The first useful version focuses on actions needed during a hackathon:

- add or edit slides
- switch between presentation themes
- change fonts and accent colors
- insert text, shapes, dividers, charts, image URLs, and video placeholders
- undo and redo edits
- export editable PPTX
- export a PDF for quick sharing

The UI uses vanilla JavaScript and CSS rather than a framework. That keeps the deployment simple and makes the slide rendering model easy to inspect.

## Two export pipelines

PPTX and PDF are not the same output format, so they use different paths:

- **PPTX:** PptxGenJS creates editable text, shapes, and charts.
- **PDF:** Puppeteer renders a controlled 16:9 HTML slide document.

The application does not rename a PDF as a PPTX. That distinction matters if the file needs to be edited in PowerPoint after a hackathon judging session.

## A better README is part of the product

The repository README now includes an animated SVG banner, architecture diagram, setup commands, deployment notes, and a roadmap. The banner is stored in the repository instead of depending on an external screenshot host, so it remains available when someone views the project offline or from a fork.

## Run it

```powershell
git clone https://github.com/LovelySharma-dev/PPTgeni.git
cd PPTgeni
npm install
copy .env.example .env
npm start
```

Then open `http://localhost:3000`.

## What I would build next

The next high-value improvements are drag-and-drop positioning, uploaded research documents, editable chart data, speaker notes, and Google Drive OAuth for a true “open in Google Slides” workflow. The current Google Slides button opens a new Slides creation tab; it does not pretend to have Drive permissions it has not been granted.

## Try it

Repository: [LovelySharma-dev/PPTgeni](https://github.com/LovelySharma-dev/PPTgeni)

If you are building a hackathon project, start with the message your judges must remember. Let the presentation system take care of the repetitive parts.

<!-- Suggested tags: ai, javascript, webdev, productivity -->
