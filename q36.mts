import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select period_label, period_type, sales, profit_after_tax, eps, gross_margin, net_margin from stock_fundamentals where symbol='OGDC' order by period_order desc limit 8`));
console.log(r.rows);
const g:any = await db.execute(sql.raw(`select count(*)::int c from stock_fundamentals where gross_margin is not null`));
console.log("with gross_margin:", g.rows[0].c);
process.exit(0);
