// scripts/test-occtl.js
const { loadConfig } = require('../config/env');
const { runOcctl } = require('../src/services/occtlRunner');

async function main() {
  const config = loadConfig();

  console.log('Running: occtl show status...');
  const res1 = await runOcctl(config, ['show', 'status']);
  console.log(res1.stdout);

  console.log('Running: occtl show users...');
  const res2 = await runOcctl(config, ['show', 'users']);
  console.log(res2.stdout);
}

main().catch((err) => {
  console.error('Test failed:', {
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    details: err.details,
  });
  process.exit(1);
});
