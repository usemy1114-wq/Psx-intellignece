import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select count(*)::int c from stocks where fundamentals_updated_at is not null`));
console.log("with fundamentals ts:", r.rows[0].c);
const o:any = await db.execute(sql.raw(`select symbol, fundamentals_updated_at from stocks where symbol in ('OGDC','LUCK','ENGRO','HUBC')`));
console.log(o.rows);
process.exit(0);
