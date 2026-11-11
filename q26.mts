import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const m:any = await db.execute(sql.raw(`select count(*)::int c, count(distinct news_id)::int n from news_symbol_map`));
console.log("mappings:", m.rows[0]);
const d:any = await db.execute(sql.raw(`select relation, count(*)::int c from news_symbol_map group by relation`));
console.log(d.rows);
const t:any = await db.execute(sql.raw(`select symbol, count(*)::int c from news_symbol_map group by symbol order by c desc limit 10`));
console.log(t.rows);
process.exit(0);
