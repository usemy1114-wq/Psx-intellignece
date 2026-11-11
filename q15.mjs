import { execFile } from "node:child_process";
import { promisify } from "node:util";
const p = promisify(execFile);
try {
  const r = await p("curl", ["-sL","--max-time","20","-w","\n__STATUS__%{http_code}","https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU"], { maxBuffer: 12*1024*1024 });
  console.log("ok len", r.stdout.length, "tail", JSON.stringify(r.stdout.slice(-30)));
} catch(e) { console.log("ERR", e.message, e.code, e.stderr?.slice(0,200)); }
