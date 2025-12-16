// src/services/occtlRunner.js
const { spawn } = require('child_process');

function buildCommand(config, args) {
  const occtlPath = config.occtlPath || '/usr/bin/occtl';
  const useSudo = config.occtlUseSudo !== false;

  if (useSudo) {
    // -n => non-interactive (never hang waiting for password)
    return {
      cmd: 'sudo',
      cmdArgs: ['-n', occtlPath, ...args],
      display: `sudo -n ${occtlPath} ${args.join(' ')}`,
    };
  }

  return {
    cmd: occtlPath,
    cmdArgs: [...args],
    display: `${occtlPath} ${args.join(' ')}`,
  };
}

function makeError(code, message, statusCode = 503, details = {}) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.details = details;
  return err;
}

/**
 * Run occtl safely with a timeout.
 *
 * @param {object} config - from config/env.js
 * @param {string[]} args - occtl arguments, e.g. ['show','users']
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function runOcctl(config, args) {
  if (!config) {
    throw makeError('INTERNAL_ERROR', 'runOcctl: missing config', 500);
  }
  if (!Array.isArray(args) || args.length === 0) {
    throw makeError('BAD_REQUEST', 'runOcctl: args must be a non-empty array', 400);
  }

  const timeoutMs = config.occtlTimeoutMs || 5000;
  const { cmd, cmdArgs, display } = buildCommand(config, args);

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    let child;
    try {
      child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return reject(
        makeError('OCCTL_NOT_FOUND', `Failed to start occtl runner: ${e.message}`, 503, {
          display,
        })
      );
    }

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        child.kill('SIGKILL');
      } catch (_) {}
      return reject(
        makeError('OCCTL_TIMEOUT', `occtl timed out after ${timeoutMs}ms`, 503, {
          display,
        })
      );
    }, timeoutMs);

    child.stdout.on('data', (buf) => {
      stdout += buf.toString('utf8');
    });

    child.stderr.on('data', (buf) => {
      stderr += buf.toString('utf8');
    });

    child.on('error', (e) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;

      // Common case: occtl path wrong or sudo missing
      const msg = e.message || 'Unknown spawn error';
      const code = msg.includes('ENOENT') ? 'OCCTL_NOT_FOUND' : 'OCCTL_FAILED';

      return reject(
        makeError(code, `occtl runner error: ${msg}`, 503, {
          display,
        })
      );
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;

      const out = stdout.trimEnd();
      const err = stderr.trimEnd();

      if (exitCode !== 0) {
        // Special case: sudo requires password / permission denied
        if (err.includes('a password is required') || err.includes('not allowed') || err.includes('permission')) {
          return reject(
            makeError('OCCTL_FAILED', `occtl permission error (sudoers?): ${err || out || 'exit=' + exitCode}`, 503, {
              display,
              exitCode,
            })
          );
        }

        return reject(
          makeError('OCCTL_FAILED', `occtl failed (exit=${exitCode})`, 503, {
            display,
            exitCode,
            stderr: err.slice(0, 500),
          })
        );
      }

      return resolve({ stdout: out, stderr: err });
    });
  });
}

module.exports = {
  runOcctl,
};
