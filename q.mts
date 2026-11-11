import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const tables = ["stocks","stock_fundamentals","market_indices","commodities","news_items","news_symbol_map","discovery_lists","signals","signal_history","signal_outcomes","events","event_impacts","announcements","refresh_log","economic_indicators","users","portfolio_holdings","watchlist","proposals"];
for (const t of tables) {
  try { const r:any = await db.execute(sql.raw(`select count(*)::int as c from ${t}`)); console.log(t, r.rows?.[0]?.c ?? r[0]?.c); } catch(e:any){ console.log(t, "ERR", e.message.slice(0,60)); }
}
const f:any = await db.execute(sql.raw(`select count(distinct symbol)::int as c from stock_fundamentals`));
console.log("fundamentals distinct symbols", f.rows?.[0]?.c);
process.exit(0);
