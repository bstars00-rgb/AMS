// Assist (dry-run): reuses your saved session, reads the room-mapping page,
// scores Trip.com's recommended master rooms with the AMS algorithm, prints the
// recommendation, and HIGHLIGHTS the best candidate on the page.
// It never clicks "Mapping" — the final confirmation is always yours.
import { chromium } from "playwright";
import readline from "node:readline";
import fs from "node:fs";
import dotenv from "dotenv";
import { scoreCandidate, band } from "../lib/score.mjs";
dotenv.config();

const W = {
  name: +(process.env.W_NAME ?? 25), bed: +(process.env.W_BED ?? 25), type: +(process.env.W_TYPE ?? 15),
  grade: +(process.env.W_GRADE ?? 10), view: +(process.env.W_VIEW ?? 10), area: +(process.env.W_AREA ?? 10), smoke: +(process.env.W_SMOKE ?? 5),
};
const AUTO = +(process.env.AUTO_THRESHOLD ?? 90);
const REVIEW = +(process.env.REVIEW_THRESHOLD ?? 65);

function ask(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(msg, (a) => { rl.close(); res(a); }));
}

if (!fs.existsSync("auth.json")) {
  console.error("❌ No saved session. Run:  npm run login   first.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: "auth.json" });
const page = await context.newPage();
await page.goto(process.env.TRIP_LOGIN_URL || "https://connect.trip.com/", { waitUntil: "domcontentloaded" }).catch(() => {});

console.log("\n👉 Navigate to a room's mapping page (where you see 'Recommended Master Rooms').");
await ask("   When it's on screen, press ENTER to analyze… ");

// --- Read all tables generically (no fragile selectors) ---
const tables = await page.evaluate(() => {
  const out = [];
  for (const t of document.querySelectorAll("table")) {
    const rows = [...t.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.innerText.replace(/\s+/g, " ").trim()));
    if (rows.length) out.push(rows);
  }
  return out;
});

const idx = (headers, ...keys) => headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
function parseTable(rows) {
  const headers = rows[0] || [];
  return { headers, body: rows.slice(1).filter((r) => r.some((c) => c)) };
}

// Find the "Recommended Master Rooms" table (has Standard room ID / Mapping information / 分数)
let masterTbl = null, merchantTbl = null;
for (const rows of tables) {
  const { headers } = parseTable(rows);
  const hs = headers.join(" ").toLowerCase();
  if (/standard room|mapping information|分数|recommended/.test(hs)) masterTbl = parseTable(rows);
  if (/merchant room|match result/.test(hs)) merchantTbl = parseTable(rows);
}

if (!masterTbl) {
  console.error("\n⚠ Could not find the 'Recommended Master Rooms' table on this page.");
  console.error("  The page may use a non-table layout. Share the page HTML and I'll adjust the reader.");
  await page.screenshot({ path: "screenshots/page.png", fullPage: true }).catch(() => {});
  await ask("\n  Saved a screenshot. Press ENTER to exit… ");
  await browser.close();
  process.exit(0);
}

// Merchant room (the room we are mapping)
let merchant = { name: "", bed: "", view: "", area: "", smoke: "" };
if (merchantTbl && merchantTbl.body[0]) {
  const h = merchantTbl.headers, r = merchantTbl.body[0];
  merchant = {
    name: r[idx(h, "name")] ?? "",
    bed: r[idx(h, "bed")] ?? "",
    view: r[idx(h, "window", "view")] ?? "",
    area: r[idx(h, "area")] ?? "",
    smoke: r[idx(h, "smoke")] ?? "",
  };
}
if (!merchant.name) merchant.name = await ask("\n  Could not read the merchant room name. Type it (or leave blank): ");

// Candidates
const h = masterTbl.headers;
const cId = idx(h, "standard room", "room id", "id");
const cName = idx(h, "name");
const cBed = idx(h, "bed");
const cWin = idx(h, "window", "view");
const cArea = idx(h, "area");
const cSmoke = idx(h, "smoke");

const candidates = masterTbl.body.map((r) => {
  const cand = { id: r[cId] ?? "", name: r[cName] ?? "", bed: r[cBed] ?? "", view: r[cWin] ?? "", area: r[cArea] ?? "", smoke: r[cSmoke] ?? "" };
  const s = scoreCandidate(merchant, cand, W);
  return { ...cand, ...s, band: band(s.score, s.bedVerified, AUTO, REVIEW) };
}).sort((a, b) => b.score - a.score);

// --- Report (no clicking) ---
console.log(`\n──────── AMS recommendation (dry-run) ────────`);
console.log(`Merchant room: "${merchant.name}"  bed=${merchant.bed || "?"} area=${merchant.area || "?"} smoke=${merchant.smoke || "?"}`);
console.log(`\nCandidates ranked by AMS score:`);
candidates.forEach((c, i) => {
  const mark = i === 0 ? "★" : " ";
  console.log(`  ${mark} ${String(c.score).padStart(3)}%  [${c.band}]  "${c.name}"  (${c.id})  bed=${c.bed} area=${c.area}${c.bedConflict ? "  ⚠bed-conflict" : ""}`);
  console.log(`        parts name/bed/type/grade/view/area/smoke = ${Object.values(c.parts).join("/")}`);
});

const best = candidates[0];
console.log(`\n★ Recommended: "${best?.name}" (${best?.id}) — ${best?.score}% [${best?.band}]`);
if (best?.band !== "AUTO") console.log(`  → Not high-confidence. Verify before mapping (website / stakeholder).`);
console.log(`\n⚠ The agent does NOT click. Review the highlighted row and click "Mapping" yourself.`);

// --- Highlight the recommended row in the live page ---
if (best?.id) {
  await page.evaluate(({ id, score }) => {
    for (const tr of document.querySelectorAll("table tr")) {
      if (tr.innerText.includes(id)) {
        tr.style.outline = "3px solid #2f55d4";
        tr.style.background = "#eef3ff";
        const tag = document.createElement("span");
        tag.textContent = ` ◀ AMS 추천 ${score}%`;
        tag.style.cssText = "color:#2f55d4;font-weight:700;white-space:nowrap";
        (tr.querySelector("td,th") || tr).appendChild(tag);
        tr.scrollIntoView({ block: "center" });
        break;
      }
    }
  }, { id: best.id, score: best.score }).catch(() => {});
}

await ask("\n  Done. Make your final click in the browser, then press ENTER here to close… ");
await browser.close();
