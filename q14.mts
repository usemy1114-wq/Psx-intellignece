import { httpGetText } from "./server/services/http";
const r = await httpGetText("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU", { timeoutMs: 20000, preferCurl: true });
console.log("ok", r.ok, "status", r.status, "via", r.via, "len", r.text.length);
console.log(r.text.slice(0,100));
process.exit(0);
