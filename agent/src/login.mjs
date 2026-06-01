// One-time login: opens a real browser, you log in manually (handles any
// password/slider yourself), then the session is saved to auth.json so the
// assist script can reuse it. Credentials are never stored by this tool.
import { chromium } from "playwright";
import readline from "node:readline";
import dotenv from "dotenv";
dotenv.config();

const LOGIN_URL = process.env.TRIP_LOGIN_URL || "https://connect.trip.com/login";

function waitEnter(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(msg, () => { rl.close(); res(); }));
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" }).catch(() => {});

console.log("\n👉 The browser is open. Log in manually (email + password).");
console.log("   When you are fully logged in and can see your dashboard, come back here.");
await waitEnter("\n   Press ENTER to save the session… ");

await context.storageState({ path: "auth.json" });
console.log("\n✅ Session saved to auth.json. You can now run:  npm run assist");
await browser.close();
