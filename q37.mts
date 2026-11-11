import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`
  update stock_fundamentals
     set net_margin = round(((profit_after_tax::numeric / nullif(sales,0)) * 100)::numeric, 2)
   where net_margin is null and sales is not null and sales <> 0 and profit_after_tax is not null
  returning id`));
console.log("net_margin filled:", r.rowCount ?? r.rows.length);
const g:any = await db.execute(sql.raw(`select count(*)::int c from stock_fundamentals where net_margin is not null`));
console.log("now with net_margin:", g.rows[0].c);
process.exit(0);
