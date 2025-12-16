// src/server.js
const express = require('express');

const app = express();
const PORT = process.env.AGENT_PORT || 8088;

// basic middleware
app.use(express.json());

// temporary health endpoint (will be replaced later)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[ocserv-agent] listening on port ${PORT}`);
});
