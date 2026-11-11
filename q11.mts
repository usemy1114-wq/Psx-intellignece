const UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
try {
  const r = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU", { headers: { "User-Agent": UA } });
  console.log("status", r.status);
  const t = await r.text();
  console.log("len", t.length, t.slice(0,80));
} catch(e:any) { console.log("ERR", e.message, e.cause?.message); }
process.exit(0);
