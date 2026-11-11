import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const n:any = await db.execute(sql.raw(`select headline, source_name from news_items order by published_at desc limit 30`));
for (const r of n.rows) console.log("-", r.headline.slice(0,95));
process.exit(0);
