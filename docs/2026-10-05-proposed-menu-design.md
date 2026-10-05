# Proposed Menu Generator — Design

**Date:** 2026-10-05

## Goal
Client-facing proposal menus sent for approval before an event. Visually rich (unlike the kitchen menus, which only communicate quantities). Output: one PDF, one US Letter page per meal.

## Decisions (agreed in conversation)
- **Separate site** from the kitchen menu generator; repo `alessisheinman/Preposed-Menu-Generator`.
- **PDF**, one page per meal; generated in the browser by rendering each page and capturing it as an image (preview and PDF share one component, so they can't drift).
- **Descriptions** are pre-written for every catalog dish (≤ 6 words), editable per proposal and in the catalog. Proposal site only.
- **Page text:** meal heading plus an optional date line per day. No quantities, venue or times.
- **Colors:** primary + secondary picked automatically from the cover; they drive mainly the background wash, with text color derived from the primary and checked for contrast (≥ 7:1 names, ≥ 4.5:1 descriptions). User can override (swatches, or pick from colors found in the cover) and reset.

## Reference design (ENHYPEN, Canva)
- Cover banner full width, top ~40% of the page; "Menu" in **Amsterdam Three** overlapping its bottom edge.
- Meal heading in **Cinzel Decorative** bold, wide tracking; dishes in **Ovo**; text #504129; watercolor paper wash.
- Web version: Amsterdam Three is licensed to Canva and can't be embedded, so **Sacramento** stands in (closest of 8 free scripts compared). Ovo and Cinzel Decorative are the real fonts (self-hosted via Fontsource).

## Architecture
- `model/` — types, event operations, print formatting, reorder logic (shared rules with the kitchen site).
- `catalog/` — seed dishes (kitchen catalog minus equipment, plus proposal names), descriptions, templates.
- `theme/` — OKLab/OKLCH color math, k-means palette extraction, theme derivation with contrast guarantees.
- `storage/` — localStorage for proposals, IndexedDB for cover images, JSON backup including covers.
- `ui/ProposalPage` — the 816×1056 page; auto-fit picks the largest text scale (1 column, ≥ 0.78) or two columns (≥ 0.55).
- `pdf/exportPdf` — off-screen render → html-to-image JPEG at 2.5× → jsPDF Letter pages.

## Known limits
- Text in the PDF is part of the page image (not selectable), like the Canva PNG exports.
- Export pauses if the tab is hidden mid-export (browsers stop animation frames in background tabs) and resumes when it's visible again.
