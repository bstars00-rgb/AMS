# AMS — AI Mapping Assistant

A **browser-only** room-mapping workbench for the hotel mapping team. Load our master inventory and a client's unmapped-room file, and AMS matches each client room to our inventory — ranking candidate rooms by a confidence score, banding them (Auto / Review / No match), and letting a human confirm the final mapping. For ambiguous cases it generates ready-to-paste AI research prompts and a hotel-website verification checklist.

**No backend. No database. No login. No server.** Everything runs in your browser, so it deploys straight to GitHub Pages.

**Repository:** https://github.com/bstars00-rgb/AMS
**Live app (after deploy):** https://bstars00-rgb.github.io/AMS/

> AMS does **not** finalize mapping automatically. It does the probability work and ranks candidates; a person confirms each mapping and completes it in the client's system.

---

## What it does

The bottleneck in mapping is **room matching** — client room names are free text (e.g. `Deluxe Double Sea View`) with their own bed-type vocabulary, while our inventory has structured columns. AMS:

1. **Links hotels** between the two files — by shared `Hotel code` first, then by hotel name. (On real data this links ~96% of client hotels.)
2. **Scores rooms** within each linked hotel using a weighted blend of: room-name similarity, **bed type** (normalized + multi-option `A/B`), room type, grade, and view. Each candidate gets a 0–100 confidence with visible sub-scores.
3. **Bands** every client room: **Auto** (≥ auto threshold), **Review** (≥ review threshold), or **No match** (→ needs creation).
4. Lets a reviewer **confirm** the right candidate, mark **needs creation**, or send to **website check** — with remarks, reviewer name, and source URL recorded.
5. **Exports** the `client room ↔ our room (+ Expedia/hotel codes)` mapping as CSV/XLSX to hand back or key into the client system.

---

## The three screens

1. **Load & Match** — upload our master inventory + the client's unmapped-room file, set the confidence thresholds, run matching. (Or click **Load sample data** to try it instantly.)
2. **Review Matches** — table with filters (band, status, priority, search, unlinked). Open a row to see ranked candidates with sub-scores, confirm a match, mark needs-creation / website-check, and copy an AI research or website-checklist prompt.
3. **Export Mapping** — download CSV/XLSX, scoped to All / Confirmed / Auto / Review / No-match / Needs-creation / Unlinked.

---

## Input files

**Our master inventory** (`.xlsx`) — two sheets:
- `Overall list`: `Expedia code`, `Hotel Code`, `Hotel Name`, `Country/Region`, `Star Rating`, `Address (EN)`, `Longitude/Latitude`, …
- `Room list`: `Hotel Code`, `Room Code`, `Room Name`, `Room View`, `Room Grade`, `Room Type`, `Bed Group`, `Bed Type`, `Bed Quantity`, `Min`, `Max`, `Room Size`, …

**Client unmapped rooms** (`.xlsx`/`.csv`) — one sheet with: `masterhotelid`, `Hotel name`, `Hotel code`, `basicroomtypeid`, `basicroomengname` (room name), `Bedtype`, `Priority`, `bigcity`.

Headers are matched tolerantly (case / spacing / trailing-space safe). Click **Load sample data** to see the exact shapes.

---

## Tech stack

- **React 18 + TypeScript + Vite** · **Tailwind CSS**
- **SheetJS (`xlsx`)** — read `.xlsx`, write `.xlsx`/`.csv`
- **PapaParse** (CSV) · **FileSaver** (downloads)
- **react-router-dom** (HashRouter — works on any static host)

All processing is in browser memory. `localStorage` holds only the language setting and the current match session (file summaries, match results, decisions). The large master inventory is kept in memory, not persisted.

---

## Run locally

Requires Node.js ≥ 18.

```bash
git clone https://github.com/bstars00-rgb/AMS.git
cd AMS
npm install
npm run dev
# open the URL Vite prints — it includes the base path: http://localhost:5173/AMS/
```

Other scripts: `npm run build` (→ `dist/`), `npm run preview`, `npm run lint` (type-check).

---

## Deployment (GitHub Pages)

The build uses `base: "/AMS/"` + HashRouter, so it runs at `https://bstars00-rgb.github.io/AMS/`.

### Option A — GitHub Actions (recommended, auto-deploy)
Includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). One-time: **Settings → Pages → Source = GitHub Actions**. Then every push to `main` builds and publishes automatically.

### Option B — `gh-pages` package (manual)
```bash
npm run deploy
```
One-time: **Settings → Pages → Source = Deploy from a branch → `gh-pages` / `(root)`**.

> Use one method, not both. Different repo name? Change `base` in `vite.config.ts` to `/<your-repo>/`.

---

## How matching works (detail)

- **Bed normalization** maps both vocabularies to canonical tokens — our `Single/Double/King/Semi Double/Sofa bed/…` and the client's `King Bed/SingleBed/DoubleBed/Queen Bed/…`, including concatenated forms and multi-option `SingleBed/King Bed` (which mirrors our multiple **Bed Groups**).
- **Name parsing** extracts grade (Standard/Superior/Deluxe/Premium/Suite…), type (Double/Twin/Triple/Suite…), view (Sea/Ocean/Garden/City…) and smoking from free-text room names.
- **Score** = 0.30·name + 0.25·bed + 0.20·type + 0.15·grade + 0.10·view (0–100). Thresholds are adjustable on the Load screen (defaults: Auto ≥ 90, Review ≥ 65).
- **Hotel link** uses `Hotel code` then name; unlinked hotels are flagged separately.

---

## Privacy

All files are parsed and matched locally in your browser. Nothing is uploaded — no server, no analytics. The AI prompt screens only **generate text** to copy into ChatGPT/Claude; they do not call any AI service.

---

## Future direction

- Adjustable per-attribute weights and saved threshold profiles per client.
- Carry decisions across report refreshes (merge by client room id).
- Optional geo-distance signal (lat/long) for unlinked hotels.
- Shared review (multi-user) would require a lightweight sync (Sheets/Notion) or a small backend — out of scope for the static build.
