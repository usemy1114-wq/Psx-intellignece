import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const n:any = await db.execute(sql.raw(`select headline from news_items order by published_at desc limit 45`));
for (const r of n.rows) console.log("-", r.headline);
console.log("--- META/UNITY symbols?");
const s:any = await db.execute(sql.raw(`select symbol,name,sector_code from stocks where symbol in ('META','UNITY','POL')`));
console.log(s.rows);
process.exit(0);
