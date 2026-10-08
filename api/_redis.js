// Cliente mínimo para a API REST do Upstash Redis (sem dependências).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function pipeline(commands) {
  if (!URL_ || !TOKEN) throw new Error("missing_redis_env");
  const r = await fetch(URL_.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error("redis_http_" + r.status);
  const out = await r.json();
  for (const item of out) if (item && item.error) throw new Error("redis_" + item.error);
  return out.map((x) => x.result);
}

function toObject(flat) {
  const o = {};
  if (Array.isArray(flat)) for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
}

async function readState(prefixCommands) {
  const cmds = (prefixCommands || []).concat([
    ["HGETALL", "marvel:people"],
    ["HGETALL", "marvel:seen"],
    ["HGETALL", "marvel:custom"],
  ]);
  const res = await pipeline(cmds);
  const n = res.length;
  const people = {}, custom = {}, seen = {};
  const p = toObject(res[n - 3]), s = toObject(res[n - 2]), c = toObject(res[n - 1]);
  for (const k in p) { try { people[k] = JSON.parse(p[k]); } catch (e) {} }
  for (const k in c) { try { custom[k] = JSON.parse(c[k]); } catch (e) {} }
  for (const k in s) {
    const i = k.indexOf(":");
    if (i < 0) continue;
    const pid = k.slice(0, i), mid = k.slice(i + 1);
    (seen[pid] = seen[pid] || {})[mid] = true;
  }
  return { people, seen, custom };
}

module.exports = { pipeline, readState };
