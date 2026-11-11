import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select source, status, started_at, rows_written, message from refresh_log order by started_at desc limit 14`));
for (const x of r.rows) console.log(x.source, "|", x.status, "|", new Date(x.started_at).toISOString(), "| rows", x.rows_written, x.message? "| "+String(x.message).slice(0,50):"");
process.exit(0);
