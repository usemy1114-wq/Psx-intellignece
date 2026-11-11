import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select source, status, message, rows_written from refresh_log where source='news_remap' order by started_at desc limit 3`));
console.log(r.rows);
const n:any = await db.execute(sql.raw(`select count(*)::int c from news_items`));
console.log("news:", n.rows[0].c);
process.exit(0);
