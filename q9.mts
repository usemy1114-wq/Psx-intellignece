import { db } from "./server/_core/db";
import { sql } from "drizzle-orm";
import { mapStoryToSymbols } from "./server/services/newsImpact";
await db.execute(sql.raw(`delete from news_symbol_map`));
const news:any = await db.execute(sql.raw(`select id, headline, summary from news_items`));
const uni:any = await db.execute(sql.raw(`select symbol, name, sector_code from stocks`));
const stocks = uni.rows.map((r:any)=>({symbol:r.symbol,name:r.name,sectorCode:r.sector_code}));
let total=0, direct=0;
const perSym = new Map<string,number>();
for (const n of news.rows) {
  const maps = mapStoryToSymbols(n.headline, n.summary, stocks);
  for (const m of maps) {
    await db.execute(sql`insert into news_symbol_map (news_id, symbol, relation, exposure, reason, confidence, matched_on)
      values (${n.id}, ${m.symbol}, ${m.relation}, ${m.exposure}, ${m.reason}, ${m.confidence}, ${m.matchedOn})
      on conflict do nothing`);
    total++;
    if (m.relation==="direct"){ direct++; perSym.set(m.symbol,(perSym.get(m.symbol)??0)+1); }
  }
}
console.log("news:",news.rows.length,"mappings:",total,"direct:",direct);
console.log("top:",[...perSym.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([s,c])=>`${s}:${c}`).join(" "));
process.exit(0);
