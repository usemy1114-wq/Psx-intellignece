import { readFileSync } from "node:fs";
import { parseCompany } from "./server/services/psx";
const html = readFileSync("/tmp/ogdc.html","utf8");
const p = parseCompany(html, "OGDC");
console.log("name:", p.name, "| sector:", p.sector, "| price:", p.price);
console.log("announcements:", p.announcements.length);
console.log(p.announcements.slice(0,3));
console.log("financials:", p.financials.length, p.financials.slice(0,2));
process.exit(0);
