# PPTgeni

PPTgeni is a local-first AI presentation studio. It turns a natural-language brief into a structured deck, renders an editable browser preview, supports slide-level edits and themes, and exports real PPTX and PDF files.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

Open `http://localhost:3000`. The app works without AI keys using a deterministic local generator. In production, it tries the primary OpenRouter provider, then the optional Hugging Face fallback, and finally the local generator. All keys stay server-side.

## Render deployment

The repository includes `render.yaml`. In Render, choose **New > Blueprint**, connect `LovelySharma-dev/PPTgeni`, and select the `main` branch. Add these secret values when prompted:

- `AI_API_KEY`: OpenRouter API key
- `AI_FALLBACK_MODEL`: a currently available Hugging Face chat model
- `AI_FALLBACK_API_KEY`: a Hugging Face fine-grained token with **Inference > Make calls to Inference Providers**

Render supplies `PORT` automatically. The service starts with `npm start`.

### Provider errors

- **OpenRouter 401/403:** create a new OpenRouter key, confirm it belongs to the account with credits, and use a currently available model or `openrouter/auto`. Do not paste the key into source files.
- **Hugging Face 402:** the selected Inference Provider requires available credits or billing; a valid token alone may not be sufficient. Check the Hugging Face billing/provider status, or leave the fallback unset and use OpenRouter.
- The application never prints API keys. It reports only the provider status and a short sanitized provider message, then uses the local generator if all providers fail.

## MVP scope

- Prompt understanding with sensible defaults and slide planning
- Trusted slide JSON rendered by reusable browser components (no generated JavaScript execution)
- Theme switching, slide selection, text editing, undo/redo, and natural-language improvement shortcuts
- Editable PowerPoint export via PptxGenJS
- Dedicated PDF export via Puppeteer
- Basic quality checks for slide count and text density

The larger roadmap in the product specification—uploads, research citations, collaboration, reference-template matching, and advanced QA—should be added as separate modules after this end-to-end core is stable.

## Free OpenRouter models

The generator loads the current zero-price models from OpenRouter at `/api/models`, including every active `:free` model returned by the catalog. It also keeps a small compatibility list containing the OpenRouter free router, DeepSeek free variants, Gemini Flash Experimental, Llama Instruct, and Qwen Coder so those choices remain visible when a provider temporarily omits them. Select the model from the landing page before generating a deck.
