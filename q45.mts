import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select table_name from information_schema.tables where table_schema='public' order by table_name`));
console.log(r.rows.map((x:any)=>x.table_name).join(", "));
process.exit(0);
