// scripts/probe-burst.mjs
import { getToken } from "./lib/blizzard.mjs";

const token = await getToken();
const auth = `Bearer ${token.access_token}`;

const characters = [
  ['kazzak', 'shrox'],
  ['kazzak', 'reloss'],
  ['terokkar', 'artoridan'],
  ['kazzak', 'meshroot'],
  ['kazzak', 'oradusa'],
  ['kazzak', 'mageeij'],
  ['hyjal', 'crazzylock'],
  ['outland', 'akouvalito'],
  ['twisting-nether', 'akouvalito']
];

// Fire them all as fast as possible (Promise.all).
console.log("=== burst: all 9 calls in parallel ===");
const start = Date.now();
const results = await Promise.all(characters.map(async ([realm, name]) => {
  const u = `https://eu.api.blizzard.com/profile/wow/character/${realm}/${name}/equipment?namespace=profile-eu&locale=en_GB`;
  const r = await fetch(u, { headers: { Authorization: auth } });
  return { name, realm, status: r.status };
}));
console.log("elapsed:", Date.now() - start, "ms");
for (const r of results) console.log(r.status, r.name + '/' + r.realm);