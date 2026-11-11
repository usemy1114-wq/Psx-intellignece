import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const s:any = await db.execute(sql.raw(`select source_name, count(*)::int c from news_items group by source_name order by c desc`));
for (const r of s.rows) console.log(String(r.c).padStart(4), r.source_name);
process.exit(0);
