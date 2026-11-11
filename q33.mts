import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select id,email,created_at from users order by id`));
console.log(r.rows);
process.exit(0);
