const UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
for (const u of ["https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=5d","https://query2.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=5d"]) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
    console.log(u.slice(8,40), r.status, (await r.text()).slice(0,120));
  } catch(e:any) { console.log(u.slice(8,40), "ERR", e.message); }
}
process.exit(0);
