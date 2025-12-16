// scripts/test-sessions-api.js
const axios = require('axios');

async function main() {
  const base = process.env.AGENT_BASE_URL || 'http://localhost:8088';
  const token = process.env.AGENT_TOKEN || 'test-token';

  const res = await axios.get(`${base}/ocserv/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  });

  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((err) => {
  console.error('API test failed:', err.response?.data || err.message);
  process.exit(1);
});
