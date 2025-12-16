// src/controllers/ocserv.controller.js
exports.health = async (req, res) => {
  return res.json({ status: 'ok' });
};
