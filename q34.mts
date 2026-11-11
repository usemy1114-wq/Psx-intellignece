import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select period_label, period_type, sales, gross_profit, operating_profit, profit_after_tax, eps from stock_fundamentals where symbol='OGDC' order by period_end desc limit 8`));
console.log(r.rows);
process.exit(0);
