import { generateReport } from "./server/services/reports";
const d = await generateReport("daily");
console.log("daily id:", d.id, "sections:", d.body.sections.length);
for (const s of d.body.sections) console.log(" -", s.heading, "rows:", s.rows.length);
const w = await generateReport("weekly");
console.log("weekly id:", w.id, "sections:", w.body.sections.length);
process.exit(0);
