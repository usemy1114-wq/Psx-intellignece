import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const c:any = await db.execute(sql.raw(`select column_name from information_schema.columns where table_name='stocks' order by ordinal_position`));
console.log(c.rows.map((r:any)=>r.column_name).join(", "));
process.exit(0);
