import { execFile } from "node:child_process";
import { promisify } from "node:util";
const p = promisify(execFile);
const { stdout } = await p("curl", ["-s","--max-time","15","https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU"]);
console.log("len", stdout.length, stdout.trim().split("\n").slice(-1)[0]);
