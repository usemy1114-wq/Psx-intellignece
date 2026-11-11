import { ensureCommodities } from "./server/services/refresh";
console.log(await ensureCommodities(true));
process.exit(0);
