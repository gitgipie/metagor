import { getToken } from "./lib/blizzard.mjs";
const token = await getToken();
const auth = `Bearer ${token.access_token}`;
const r = await fetch('https://eu.api.blizzard.com/profile/wow/character/kazzak/shrox/equipment?namespace=profile-eu&locale=en_GB', { headers: { Authorization: auth } });
console.log('status:', r.status);
console.log('headers:');
for (const [k,v] of r.headers) console.log('  ', k+':', v);
console.log('body:', (await r.text()).slice(0, 800));