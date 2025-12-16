// scripts/test-parse-users.js
const { loadConfig } = require('../config/env');
const { runOcctl } = require('../src/services/occtlRunner');
const { parseShowUsers } = require('../src/services/occtlParser');

async function main() {
  const config = loadConfig();
  const res = await runOcctl(config, ['show', 'users']);
  const sessions = parseShowUsers(res.stdout);

  console.log(JSON.stringify({ count: sessions.length, sessions }, null, 2));
}

main().catch((err) => {
  console.error('Parse test failed:', {
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    details: err.details,
  });
  process.exit(1);
});
