import { ensureDiscovery, ensureSignals, ensureEvents } from "./server/services/refresh";
console.log("discovery:", await ensureDiscovery(true));
console.log("signals:", await ensureSignals(true));
console.log("events:", await ensureEvents(true));
process.exit(0);
