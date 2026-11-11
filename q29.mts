import { FEEDS } from "./server/services/rss";
import { httpGetText } from "./server/services/http";
for (const f of FEEDS) {
  const r = await httpGetText(f.url, { timeoutMs: 15000 });
  const items = (r.text.match(/<item[\s>]/g) || []).length + (r.text.match(/<entry[\s>]/g) || []).length;
  console.log(String(r.status).padEnd(4), "items=" + String(items).padEnd(4), f.key);
}
process.exit(0);
