// scripts/probe-leaderboard.mjs
import { getToken } from "./lib/blizzard.mjs";
import { BLZ_API, NS_DYNAMIC } from "./lib/config.mjs";

const token = await getToken();
const auth = `Bearer ${token.access_token}`;

console.log("=== /data/wow/mythic-keystone/season/17 ===");
const r = await fetch(`${BLZ_API}/data/wow/mythic-keystone/season/17?namespace=${NS_DYNAMIC}&locale=en_GB`, { headers: { Authorization: auth } });
const j = await r.json();
console.log("status:", r.status);
console.log(JSON.stringify(j, null, 2).slice(0, 3500));