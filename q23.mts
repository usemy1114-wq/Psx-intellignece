import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const a:any = await db.execute(sql.raw(`select count(*)::int c from announcements`));
console.log("total anns:", a.rows[0].c);
const t:any = await db.execute(sql.raw(`select title from announcements where symbol='LOADS' limit 3`));
console.log(t.rows);
process.exit(0);
