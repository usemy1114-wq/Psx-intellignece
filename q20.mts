import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const c:any = await db.execute(sql.raw(`select symbol,price,source from commodities order by symbol`));
for (const r of c.rows) console.log(r.symbol.padEnd(9), String(r.price).padEnd(10), r.source?.slice(0,60));
process.exit(0);
