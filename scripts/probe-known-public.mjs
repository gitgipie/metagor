// scripts/probe-known-public.mjs
import { getToken } from "./lib/blizzard.mjs";

const token = await getToken();
const auth = `Bearer ${token.access_token}`;

// Try various characters at various "depths" in the leaderboard.
const probes = [
  // Top of leaderboard
  ['kazzak', 'shrox'],
  ['kazzak', 'reloss'],
  ['terokkar', 'artoridan'],         // we tested this earlier - 200 OK
  // Mid-tier
  ['silvermoon', 'sunjou'],
  ['tarren-mill', 'any-char-here'],
  // Random low-pop spec
  ['magtheridon', 'khadgar'],         // classic names
  ['agamaggan', 'illidan']
];

for (const [realm, name] of probes) {
  const u = `https://eu.api.blizzard.com/profile/wow/character/${realm}/${name}/equipment?namespace=profile-eu&locale=en_GB`;
  const r = await fetch(u, { headers: { Authorization: auth } });
  console.log(r.status, `${name}/${realm}`);
}