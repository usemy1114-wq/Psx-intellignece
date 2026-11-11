import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const a:any = await db.execute(sql.raw(`select count(*)::int c from announcements where symbol='OGDC'`));
console.log("OGDC anns:", a.rows[0].c);
const t:any = await db.execute(sql.raw(`select count(*)::int c from announcements`));
console.log("total anns:", t.rows[0].c);
const f:any = await db.execute(sql.raw(`select count(distinct symbol)::int c from stock_fundamentals`));
console.log("fundamentals symbols:", f.rows[0].c);
process.exit(0);
