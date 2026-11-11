import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select job, status, started_at, finished_at, rows_written, error from refresh_log order by started_at desc limit 12`));
for (const x of r.rows) console.log(x.job, "|", x.status, "|", x.started_at?.toISOString?.() ?? x.started_at, "| rows", x.rows_written, x.error? "| ERR "+x.error.slice(0,60):"");
process.exit(0);
