import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const n:any = await db.execute(sql.raw(`select headline, source_name from news_items where source_name in ('Dawn Business','Express Tribune Business','Associated Press of Pakistan — Business','Investing.com — Commodities','Wall Street Journal — Markets') order by published_at desc limit 40`));
for (const r of n.rows) console.log("-", r.headline.slice(0,100));
process.exit(0);
