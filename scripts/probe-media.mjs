import { blzFetch } from "./lib/blizzard.mjs";
const r = await blzFetch("/data/wow/media/item/250033", { namespace: "static-eu" });
console.log(JSON.stringify(r, null, 2).slice(0, 800));