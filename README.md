# AMS — AI Mapping Assistant

A lightweight, **browser-only** tool for hotel API mapping teams. Upload an API report (Excel/CSV), let AMS auto-analyze each row (priority, risk, suggested action, remarks), review and adjust the results, generate ready-to-paste AI research prompts, and export for your team.

**No backend. No database. No login. No server.** Everything runs in your browser, so you can drop it on GitHub Pages or Vercel and start using it immediately.

**Repository:** https://github.com/bstars00-rgb/AMS
**Live app (after deploy):** https://bstars00-rgb.github.io/AMS/

- 🇰🇷 / 🇬🇧 Korean / English toggle (saved in your browser)
- 📄 `.xlsx` and `.csv` upload, parsed in-browser (SheetJS + PapaParse)
- 🧠 Automatic priority / risk / suggested-action analysis with human-readable remarks
- ✦ AI Research Prompt generator (copy into ChatGPT or Claude — no AI key needed)
- ⭳ Export to CSV / XLSX with scope filters (FileSaver)
- 🔒 Your data never leaves the browser

> **Important:** AMS does **not** perform the actual mapping. It is a decision-support tool — a person reviews the results and completes the mapping in your real system.

---

## Table of contents
- [Tech stack](#tech-stack)
- [The four screens](#the-four-screens)
- [Run locally](#run-locally)
- [Input file & column mapping](#input-file--column-mapping)
- [How the analysis works](#how-the-analysis-works)
- [Export](#export)
- [Deployment](#deployment)
- [Privacy](#privacy)
- [Project structure](#project-structure)

---

## Tech stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS**
- **SheetJS (`xlsx`)** — read `.xlsx`, write `.xlsx`/`.csv`
- **PapaParse** — robust CSV parsing
- **FileSaver** — trigger downloads
- **react-router-dom** (HashRouter, so it works on any static host)

All processing happens in browser local state. `localStorage` is used only for the **language setting** and the **most recent working session** (so a refresh restores your data).

---

## The four screens

1. **Upload & Analyze** — drag & drop or pick a file, confirm the auto-detected column mapping, run the analysis.
2. **Review Results** — table with search + filters (supplier, country, city, priority, risk, action, stakeholder/agent flags), color-coded badges, and inline editing of Priority / Risk / Suggested Action / Remarks / Reviewer.
3. **AI Research Prompt** — pick a row and a prompt type, get a ready-to-paste KO/EN prompt; copy it or attach it to the row for export.
4. **Export Results** — download CSV or XLSX, with scope options (All / High Priority / High Risk / Stakeholder / Agent / New Creation / Edited).

---

## Run locally

**Prerequisite:** Node.js ≥ 18.

```bash
git clone https://github.com/bstars00-rgb/AMS.git
cd AMS
npm install
npm run dev
# open the URL Vite prints — note it includes the base path: http://localhost:5173/AMS/
```

Click **Load sample data** to try it instantly, or upload `sample-data/api_report_sample.csv`.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # preview the production build
npm run lint      # type-check only (tsc --noEmit)
```

---

## Input file & column mapping

AMS expects these columns (header names can differ — you map them in the UI):

```
Supplier, Hotel ID, Hotel Name, Country, City, Address,
Active Status, Mapping Status, Hotel Creation Type,
Room Name, Bed Type, Extra Bed Type,
Internal Hotel Name, Internal Address, Internal Room Name,
Internal Bed Type, Internal Extra Bed Type
```

On upload, AMS **auto-detects** the mapping from your headers (English or Korean aliases). You can correct any column with a dropdown. Only **Hotel Name**, **Active Status**, and **Mapping Status** are required to run the analysis; everything else improves accuracy.

A ready-to-use sample is in [`sample-data/api_report_sample.csv`](sample-data/api_report_sample.csv).

---

## How the analysis works

For each row AMS derives a **Priority**, a **Risk Level**, a **Suggested Action**, the **Stakeholder / Agent** flags, and **Remarks**. Highlights of the rules:

**Priority**
- High: Active + Unmapped · Newly-created + Unmapped · similar name but different address · matched room but bed-type mismatch · unclear/empty extra bed.
- Medium: Partial Mapped · partial name/room/address differences · missing internal data.
- Low: Inactive · already mapped with no significant mismatch.

**Risk Level**
- High: same hotel name but different address · different city · **bed-type mismatch (always High)** · extra-bed-type mismatch · newly-created hotel without confirmation.
- Medium: similar name/room · partially different address · missing internal mapping data · unclear extra bed (when not already High).
- Low: name/address/room/bed all match or nearly match.

**Suggested Action** — one of: Proceed Mapping · Need Hotel Review · Need Room Review · Need Stakeholder Confirmation · Request Agent Amendment · Request New Hotel Creation · Request New Room Creation · No Action Needed.

**Business guarantees**
- Every **High-risk** row requires **Stakeholder Confirmation or an Agent Request**.
- **Bed-type mismatch** is always High risk.
- Results are fully **editable** by the reviewer — AMS only assists.

Name/address/room similarity uses a normalized, token-sorted Levenshtein ratio (handles word reordering and Korean/English text).

---

## Export

- **Formats:** CSV (UTF-8 with BOM, so Excel renders Korean correctly) and XLSX.
- **Scopes:** All Results · High Priority Only · High Risk Only · Stakeholder Confirmation Required Only · Agent Request Required Only · Need New Creation Only · Edited Results Only.
- **Columns:** all source fields plus Priority, Risk Level, Suggested Action, Stakeholder/Agent flags, Remarks, (optional) AI Research Prompt, Reviewed By, Reviewed Date.
- Header labels and values follow the **current language**.

---

## Deployment

This project deploys to **GitHub Pages** as a static site. The Vite `base` is set to `/AMS/` to match the project-site URL, and the app uses **HashRouter**, so deep links keep working on refresh with no server-side rewrites.

### Push to GitHub

```bash
git init
git add .
git commit -m "AMS — AI Mapping Assistant"
git branch -M main
git remote add origin https://github.com/bstars00-rgb/AMS.git
git push -u origin main
```

### Option A — GitHub Actions (recommended, auto-deploy)

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Every push to `main` automatically builds and publishes the site — no local deploy command needed.

One-time setup: in the repo go to **Settings → Pages → Build and deployment** and set **Source = GitHub Actions**. Then push to `main` (or re-run the workflow from the **Actions** tab). Watch progress under the **Actions** tab.

### Option B — `gh-pages` package (manual, one command)

```bash
npm run deploy
```

This runs `npm run build` (via `predeploy`) and publishes `dist/` to a `gh-pages` branch. One-time setup: **Settings → Pages → Source = Deploy from a branch → Branch `gh-pages` / `(root)`**.

> Use **one** method, not both — the Pages **Source** setting can only point at one. Actions is recommended for a team; `gh-pages` is fine for a single person deploying from their machine.

### Live URL

**https://bstars00-rgb.github.io/AMS/**

> Deploying to a **different** repository name? Change `base` in `vite.config.ts` from `/AMS/` to `/<your-repo>/` (or `/` for a user/org site or a custom domain).

---

## Privacy

All file parsing and analysis happen locally in your browser. No data is uploaded anywhere — there is no server and no analytics. The AI Research Prompt screen only **generates text** for you to copy; it does not call any AI service.

---

## Project structure

```
AMS/
├── index.html
├── package.json
├── vite.config.ts            # base: "/AMS/" for GitHub Pages
├── tailwind.config.js
├── sample-data/api_report_sample.csv
└── src/
    ├── main.tsx              # providers + HashRouter
    ├── App.tsx               # routes for the 4 screens
    ├── store.tsx             # global state + localStorage persistence
    ├── types.ts
    ├── i18n/
    │   ├── index.tsx         # provider + useI18n
    │   └── dict.ts           # KO/EN dictionary (UI, labels, remarks)
    ├── lib/
    │   ├── columns.ts        # canonical fields + auto-mapping
    │   ├── parse.ts          # xlsx/csv parsing
    │   ├── analysis.ts       # priority/risk/action/remarks engine
    │   ├── prompts.ts        # AI research prompt generator (8 types, KO/EN)
    │   ├── export.ts         # CSV/XLSX export + scope filters
    │   ├── format.ts         # remark rendering
    │   ├── actions.ts
    │   └── sample.ts         # built-in sample dataset
    ├── components/           # Layout, badges, shared UI
    └── pages/                # Upload, Review, Prompts, Export
```

---

Built as a practical, lightweight tool the mapping team can use today. No backend to run, nothing to maintain — just open it and work.
