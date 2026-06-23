// scripts/probe-blizzard.mjs
// Find a real character and probe their profile endpoint.

import { getToken } from "./lib/blizzard.mjs";
import { BLZ_API, NS_PROFILE } from "./lib/config.mjs";

const token = await getToken();
const auth = `Bearer ${token.access_token}`;

// Hit Raider.IO to find a real EU Havoc DH top-50 character.
const rioRes = await fetch("https://raider.io/api/v1/characters/mythic-plus/leaderboard?region=eu&season=17&class=demon-hunter&spec=havoc");
const rio = await rioRes.json();
const top = (rio?.ranks || rio || [])[0];
if (!top) { console.log("No Raider.IO leaderboard returned."); process.exit(1); }
console.log("Top character:", JSON.stringify(top, null, 2).slice(0, 600));

const name = top.name || top.character?.name;
const realm = (top.realm?.slug || top.realm?.name || top.character?.realm?.slug || "").toLowerCase();
const path = `/profile/wow/character/${encodeURIComponent(realm)}/${encodeURIComponent(name)}/equipment`;
const url = `${BLZ_API}${path}?namespace=${NS_PROFILE}&locale=en_GB`;
console.log("\nURL:", url);
const r = await fetch(url, { headers: { Authorization: auth } });
console.log("Status:", r.status);
const text = await r.text();
console.log(text.slice(0, 1200));