import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
const q = async (s:string)=>{const r:any=await db.execute(sql.raw(s));return r.rows[0];};
const rows = [
 ["stocks", `select count(*)::int c from stocks`],
 ["with price", `select count(*)::int c from stocks where price is not null`],
 ["fund symbols", `select count(distinct symbol)::int c from stock_fundamentals`],
 ["fund periods", `select count(*)::int c from stock_fundamentals`],
 ["announcements", `select count(*)::int c from announcements`],
 ["news", `select count(*)::int c from news_items`],
 ["mappings", `select count(*)::int c from news_symbol_map`],
 ["signals", `select count(*)::int c from signals`],
 ["signal_history", `select count(*)::int c from signal_history`],
 ["events", `select count(*)::int c from events`],
 ["event_impacts", `select count(*)::int c from event_impacts`],
 ["commodities", `select count(*)::int c from commodities`],
 ["reports", `select count(*)::int c from reports`],
 ["discovery_lists", `select count(*)::int c from discovery_lists`],
 ["indices", `select count(*)::int c from market_indices`],
];
for (const [k,s] of rows) console.log(k, (await q(s as string)).c);
process.exit(0);
