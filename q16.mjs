import { execFile } from "node:child_process";
import { promisify } from "node:util";
const p = promisify(execFile);
const UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
try {
  const r = await p("curl", ["-sL","--max-time","20","-A",UA,"-w","\n__STATUS__%{http_code}","https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU"], { maxBuffer: 12*1024*1024 });
  console.log("ok len", r.stdout.length);
} catch(e) { console.log("ERR", e.message, e.code, "stderr:", e.stderr?.slice(0,300)); }
