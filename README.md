# Proposed Menu Generator

Build client-facing **proposed menus** for catered events and download them as a PDF: one US Letter page per meal, styled after the ENHYPEN proposal — tour cover art across the top, a script "Menu", a decorative meal heading, and each dish with its dietary tags and a short description. Page colors come from the cover art.

This is the client-proposal companion to the kitchen menu site. The two are separate; descriptions exist only here.

## Use

1. **New proposal** → tour/artist name and venue (venue isn't printed).
2. **Upload cover art.** The primary and secondary colors are picked from it automatically and tint the page. Click a swatch (or a "colors in the cover" dot) to change them; **Reset to cover colors** goes back. Use the crop slider if faces are cut off.
3. **+ Add day** (optional date line, e.g. "Tuesday, November 10"), then **+ Breakfast / Lunch / Dinner / Other**. Templates load the usual dishes; search to add or swap dishes (⇄); every dish comes with a description you can edit for this proposal.
4. Drag dishes, pages and days to reorder (or drag the preview pages).
5. **Download PDF.**

Long pages fit themselves: text shrinks slightly, then switches to two columns rather than getting too small to read.

Everything saves in this browser (cover images in IndexedDB). Use **Export backup** (includes covers) and **Import** to move between computers. The **Catalog** tab edits dishes, descriptions, tags, templates and venues.

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```

Design notes: `docs/2026-10-05-proposed-menu-design.md`.

## Deploy

Pushes to `main` run tests, build, and deploy to GitHub Pages (`.github/workflows/deploy.yml`). In the repo: **Settings → Pages → Source: GitHub Actions**.

Cover art is never committed — it's uploaded in the browser and stays there.
