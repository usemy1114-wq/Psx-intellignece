import { fetchCommodities } from "./server/services/commodities";
const r = await fetchCommodities();
console.log("quoted:", r.quotes.length);
for (const q of r.quotes) console.log(" ", q.symbol, q.price, q.unit, q.changePct, "|", q.source);
console.log("unavailable:", r.unavailable.length);
for (const u of r.unavailable) console.log(" ", u.symbol, u.reason);
process.exit(0);
