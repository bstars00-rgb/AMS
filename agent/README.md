# AMS Agent — Trip.com mapping assistant (local, dry-run)

A small **local** tool that helps you map rooms inside the Trip.com Connect web UI faster. It logs into your session, reads the **Recommended Master Rooms** on the current mapping page, scores them with the **AMS algorithm** (now including Area/평수 and Smoke/흡연), and **highlights the best candidate** on the page.

> **The agent never clicks "Mapping". The final confirmation is always yours.** You look at the highlighted recommendation and click it (or not).

This is **not** part of the web app and is **not** deployed — it runs only on your PC.

---

## ⚠ Read first
- **Terms of Service:** automating a partner portal may be restricted by Trip.com's terms. Use your own legitimate account, keep volumes reasonable, and consider requesting the official **Trip Hotel Connectivity Platform** API (`TripHotelConnectivityPlatform@trip.com`) for a supported long-term path.
- **Credentials are not stored by this tool.** Default flow is **manual login** — you log in yourself in the opened browser, and only the *session cookie* is saved to `auth.json` (git-ignored).
- **Safety by design:** dry-run only. It reads + recommends + highlights. It does not submit anything.
- If a row is **not** high-confidence (band ≠ Auto, or a bed conflict), verify on the hotel's official website before mapping.

---

## Install
```bash
cd agent
npm install
npx playwright install chromium
cp .env.example .env   # optional: adjust weights/thresholds
```

## Use
```bash
# 1) One-time: open a browser, log in manually, save the session
npm run login

# 2) Navigate to a room's mapping page, then run:
npm run assist
#   → it reads the candidates, prints the AMS ranking, and highlights the
#     recommended row on the page. You make the final "Mapping" click.
```

## Configuration (`.env`)
- `AUTO_THRESHOLD` / `REVIEW_THRESHOLD` — confidence bands (same as the web app).
- `W_NAME, W_BED, W_TYPE, W_GRADE, W_VIEW, W_AREA, W_SMOKE` — scoring weights (relative; normalized at use). Tune to match your judgment.

## How scoring works
Same as the AMS web app, on the attributes visible in Trip.com's screen:
`name + bed type + type + grade + view + area(평수) + smoke(흡연)`, weighted. Bed type uses a hard rule: a **bed conflict can never be Auto**. Chinese values (大床/双人床/双床, 豪华/标准, 海景/城景, 无烟…) are recognized.

---

## Limitations & next steps
- **Selectors:** the reader parses `<table>` elements generically. If your mapping page uses a different layout and the reader can't find the candidates, it saves a screenshot and asks you to share the page HTML so the reader can be adjusted.
- **Per-page:** it analyzes the room currently on screen. Iterating across many rooms automatically is a later step.
- **Staged automation (with human confirm kept):**
  1. **Dry-run / assist (this version)** — recommend + highlight, you click.
  2. **Batch assist** — walk the unmapped list, recommend each, you approve.
  3. **High-confidence auto-click (optional)** — only Auto-band + bed-verified, everything else stays in a human queue. Full audit log.
