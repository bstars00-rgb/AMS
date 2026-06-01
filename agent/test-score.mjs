// Sanity test using the data from the Trip.com screenshot.
import { scoreCandidate, band } from "./lib/score.mjs";

const W = { name: 25, bed: 25, type: 15, grade: 10, view: 10, area: 10, smoke: 5 };
const merchant = { name: "JO King Bed Room", bed: "双人床", view: "", area: "", smoke: "" };
const candidates = [
  { id: "112237018", name: "JO KING BED ROOM 乔禾大床房", bed: "1 King bed", view: "All rooms have windows", area: "17", smoke: "Non-smoking" },
  { id: "112348021", name: "JO Twin Bed Room 乔禾双床房", bed: "2 Single Bed", view: "All rooms have windows", area: "15", smoke: "Non-smoking" },
  { id: "112360018", name: "Deluxe Double Bed Room With City View 豪华城景双人床房", bed: "1 Queen bed", view: "All rooms have windows", area: "17", smoke: "Non-smoking" },
  { id: "112276023", name: "Deluxe Twin Room with City View 豪华城景双人房", bed: "2 Single Bed", view: "All rooms have windows", area: "17", smoke: "Non-smoking" },
];

const ranked = candidates.map((c) => {
  const s = scoreCandidate(merchant, c, W);
  return { id: c.id, name: c.name, score: s.score, band: band(s.score, s.bedVerified, 90, 65), parts: s.parts };
}).sort((a, b) => b.score - a.score);

console.log(`Merchant: "${merchant.name}" (${merchant.bed})\n`);
ranked.forEach((c, i) => console.log(`${i === 0 ? "★" : " "} ${String(c.score).padStart(3)}% [${c.band}] ${c.id} "${c.name}"  parts=${Object.values(c.parts).join("/")}`));
console.log(`\nTrip.com's own: 规则:bed on ${candidates[0].id}, 分数 0.4761/0.4622/0.0663 on the rest.`);
