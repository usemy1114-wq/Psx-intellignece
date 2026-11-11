import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const r:any = await db.execute(sql.raw(`select n.headline, m.symbol, m.matched_on, m.confidence from news_symbol_map m join news_items n on n.id=m.news_id where m.symbol in ('PGCL','ASRL','PNSC','PIBTL','PABC','PCAL','PAKRI','PAKOXY','EWICR1') limit 20`));
for (const x of r.rows) console.log(x.symbol, "|", x.matched_on, "|", x.confidence, "|", x.headline.slice(0,70));
console.log("--- names");
const s:any = await db.execute(sql.raw(`select symbol,name from stocks where symbol in ('PGCL','ASRL','PNSC','PIBTL','PABC','PCAL','PAKRI','PAKOXY','EWICR1','EWLA','EWIC')`));
for (const x of s.rows) console.log(x.symbol, "|", x.name);
process.exit(0);
