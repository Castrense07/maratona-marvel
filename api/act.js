const { readState } = require("./_redis");

const PID = /^p[a-z0-9]{4,24}$/;
const MID = /^(m\d{2}|c[a-z0-9]{4,24})$/;
const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    let cmd = null;
    if (b.type === "join" && PID.test(b.id || "")) {
      const name = clean(b.name, 30);
      if (!name) return res.status(400).json({ error: "name" });
      cmd = ["HSETNX", "marvel:people", b.id, JSON.stringify({ name, t: Date.now() })];
    } else if (b.type === "seen" && PID.test(b.pid || "") && MID.test(b.mid || "")) {
      cmd = b.on ? ["HSET", "marvel:seen", b.pid + ":" + b.mid, "1"] : ["HDEL", "marvel:seen", b.pid + ":" + b.mid];
    } else if (b.type === "addMovie" && /^c[a-z0-9]{4,24}$/.test(b.id || "")) {
      const title = clean(b.title, 100);
      if (!title) return res.status(400).json({ error: "title" });
      cmd = ["HSETNX", "marvel:custom", b.id, JSON.stringify({ title, t: Date.now() })];
    } else if (b.type === "delMovie" && /^c[a-z0-9]{4,24}$/.test(b.id || "")) {
      cmd = ["HDEL", "marvel:custom", b.id];
    }
    if (!cmd) return res.status(400).json({ error: "bad_request" });
    res.status(200).json(await readState([cmd]));
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
