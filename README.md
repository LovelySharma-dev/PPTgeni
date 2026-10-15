# PPTgeni

PPTgeni is a local-first AI presentation studio. It turns a natural-language brief into a structured deck, renders an editable browser preview, supports slide-level edits and themes, and exports real PPTX and PDF files.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

Open `http://localhost:3000`. The app works without an AI key using a deterministic local generator. To connect an OpenAI-compatible provider, set `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` in `.env`; keys stay server-side.

## MVP scope

- Prompt understanding with sensible defaults and slide planning
- Trusted slide JSON rendered by reusable browser components (no generated JavaScript execution)
- Theme switching, slide selection, text editing, undo/redo, and natural-language improvement shortcuts
- Editable PowerPoint export via PptxGenJS
- Dedicated PDF export via Puppeteer
- Basic quality checks for slide count and text density

The larger roadmap in the product specification—uploads, research citations, collaboration, reference-template matching, and advanced QA—should be added as separate modules after this end-to-end core is stable.
