const { readState } = require("./_redis");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.status(200).json(await readState());
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
