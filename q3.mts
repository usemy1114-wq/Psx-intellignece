import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";

const n: any = await db.execute(sql.raw(`select headline from news_items order by published_at desc limit 40`));
for (const r of n.rows) console.log("-", r.headline);

console.log("--- names");
const s: any = await db.execute(sql.raw(`select symbol, name from stocks order by market_cap desc nulls last limit 60`));
for (const r of s.rows) console.log(r.symbol, "|", r.name);

console.log("--- name shapes");
const shapes: any = await db.execute(sql.raw(`select name from stocks where name ilike '%limited%' limit 10`));
for (const r of shapes.rows) console.log(r.name);
process.exit(0);
