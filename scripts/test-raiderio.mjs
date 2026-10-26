// scripts/test-raiderio.mjs
// Offline tests for the Raider.IO fetch layer (retry/backoff and season lookup).
// Uses a fake fetch, so no network and no cache writes.
import { rioGetJson, findSeasonByBlizzardId } from "./lib/raiderio.mjs";

let fails = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fails++;
}

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Fake fetch that plays back a script of responses; an Error entry is thrown.
function scripted(steps) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step;
  };
  return { impl, calls };
}
const noWait = { backoffMs: [0] };

{
  const f = scripted([new TypeError("terminated"), json(200, { a: 1 })]);
  const r = await rioGetJson("u", { fetchImpl: f.impl, ...noWait });
  check("network error is retried, then succeeds", r.ok && r.data.a === 1 && f.calls.length === 2);
}
{
  const f = scripted([json(503), json(429), json(200, { b: 2 })]);
  const r = await rioGetJson("u", { fetchImpl: f.impl, ...noWait });
  check("5xx and 429 are retried", r.ok && r.data.b === 2 && f.calls.length === 3);
}
{
  const f = scripted([json(404)]);
  const r = await rioGetJson("u", { fetchImpl: f.impl, ...noWait });
  check("4xx is not retried", !r.ok && r.status === 404 && f.calls.length === 1);
}
{
  const f = scripted([json(500)]);
  const r = await rioGetJson("u", { fetchImpl: f.impl, ...noWait });
  check("persistent 5xx gives up after 4 attempts", !r.ok && r.status === 500 && f.calls.length === 4);
}
{
  const f = scripted([new TypeError("terminated")]);
  let threw = false;
  try { await rioGetJson("u", { fetchImpl: f.impl, ...noWait }); } catch { threw = true; }
  check("persistent network error throws after 4 attempts", threw && f.calls.length === 4);
}

// Season lookup by Blizzard id, across expansions, ignoring non-main seasons.
// Real 2s/4s/8s backoff isn't reached here: 404 is not retried.
{
  const impl = async (url) => {
    const exp = Number(new URL(url).searchParams.get("expansion_id"));
    if (exp === 11) return json(200, { seasons: [
      { slug: "season-mn-2", name: "MN Season 2", blizzard_season_id: 18, is_main_season: true },
      { slug: "season-mn-1", name: "MN Season 1", blizzard_season_id: 17, is_main_season: true },
      { slug: "season-mn-post", name: "Post", blizzard_season_id: 19, is_main_season: false }
    ] });
    if (exp === 10) return json(200, { seasons: [
      { slug: "season-tww-3", name: "TWW Season 3", blizzard_season_id: 15, is_main_season: true }
    ] });
    return json(404);
  };
  check("finds season by Blizzard id", (await findSeasonByBlizzardId(17, { fetchImpl: impl }))?.slug === "season-mn-1");
  check("finds season in an older expansion", (await findSeasonByBlizzardId(15, { fetchImpl: impl }))?.slug === "season-tww-3");
  check("ignores non-main seasons", (await findSeasonByBlizzardId(19, { fetchImpl: impl })) === null);
  check("unknown id returns null (no guessed slug)", (await findSeasonByBlizzardId(99, { fetchImpl: impl })) === null);
}

console.log(fails ? `\n${fails} failure(s)` : "\nall passed");
process.exit(fails ? 1 : 0);
