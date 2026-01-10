// scripts/test-occtl.js
const { loadConfig } = require('../config/env');
const { runOcctl } = require('../src/services/occtlRunner');

async function main() {
  const config = loadConfig();

  console.log('Running: occtl --json show status...');
  const res1 = await runOcctl(config, ['--json', 'show', 'status']);
  try {
    const obj = JSON.parse(res1.stdout);
    console.log('status.ok parse:', typeof obj === 'object' && obj !== null);
    console.log('status keys:', Object.keys(obj).slice(0, 10));
  } catch (e) {
    console.error('Failed to parse JSON status:', e.message);
    console.log(res1.stdout);
    process.exit(2);
  }

  console.log('\nRunning: occtl --json show users...');
  const res2 = await runOcctl(config, ['--json', 'show', 'users']);
  try {
    const arr = JSON.parse(res2.stdout);
    console.log('users.ok parse:', Array.isArray(arr));
    console.log('users count:', Array.isArray(arr) ? arr.length : 'N/A');
    if (Array.isArray(arr) && arr[0]) {
      console.log('sample user keys:', Object.keys(arr[0]).slice(0, 12));
    }
  } catch (e) {
    console.error('Failed to parse JSON users:', e.message);
    console.log(res2.stdout);
    process.exit(2);
  }
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
