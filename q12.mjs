import { ProxyAgent, setGlobalDispatcher } from "undici";
setGlobalDispatcher(new ProxyAgent("http://172.20.0.1:18080"));
const r = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU");
console.log("status", r.status, (await r.text()).slice(0,60));
