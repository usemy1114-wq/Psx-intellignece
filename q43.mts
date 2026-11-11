import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select symbol, price, change, change_pct, ldcp from stocks where change_pct < -50 order by change_pct limit 6`));
console.log(r.rows);
process.exit(0);
