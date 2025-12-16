// src/services/occtlParser.js

/**
 * Convert "23m:34s" / "4m:35s" / "1h:02m:10s" into seconds.
 * If parsing fails, return null.
 */
function parseSinceToSeconds(since) {
  if (!since) return null;
  const s = String(since).trim();
  if (!s) return null;

  // supports:
  //  - 23m:34s
  //  - 4m:35s
  //  - 1h:02m:10s
  //  - 2h:05m
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  const hMatch = s.match(/(\d+)h/);
  if (hMatch) hours = Number(hMatch[1]);

  const mMatch = s.match(/(\d+)m/);
  if (mMatch) minutes = Number(mMatch[1]);

  const sMatch = s.match(/(\d+)s/);
  if (sMatch) seconds = Number(sMatch[1]);

  const total = hours * 3600 + minutes * 60 + seconds;
  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

/**
 * Parse the output of: `occtl show users`
 *
 * Example header:
 *   id user vhost ip vpn-ip device since dtls-cipher status
 *
 * Important:
 * - Columns are space separated, BUT some middle columns may be blank.
 * - The last 3 columns are reliably:
 *     since, dtls-cipher, status   (status is last)
 * - We parse from the right-hand side to survive missing vpn-ip/device.
 */
function parseShowUsers(text) {
  if (!text) return [];

  const lines = String(text)
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  // Remove header if present
  const headerIndex = lines.findIndex((l) => l.toLowerCase().includes('dtls-cipher'));
  const dataLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;

  const sessions = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by 1+ whitespace
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 5) {
      // Too short to be valid row
      continue;
    }

    // Parse from right:
    const status = parts[parts.length - 1] || null;
    const dtlsCipher = parts[parts.length - 2] || null;
    const since = parts[parts.length - 3] || null;

    // The left side is: id, user, vhost, ip, (vpn-ip?), (device?)
    // We cannot assume vpn-ip/device exist.
    const left = parts.slice(0, parts.length - 3);

    const vpnSessionIdRaw = left[0];
    const usernameRaw = left[1];
    const groupnameRaw = left[2];
    const clientIpRaw = left[3];

    // remaining left fields (0..n):
    // could be [vpnIp] or [vpnIp, device]
    // could be [] if missing
    const remaining = left.slice(4);

    let vpnIp = null;
    let device = null;

    if (remaining.length === 1) {
      // could be vpn-ip OR device, but in practice it’s vpn-ip
      vpnIp = remaining[0] || null;
    } else if (remaining.length >= 2) {
      vpnIp = remaining[0] || null;
      device = remaining.slice(1).join(' ') || null; // just in case device contains spaces
    }

    const vpnSessionId = vpnSessionIdRaw ? Number(vpnSessionIdRaw) : null;

    const username = usernameRaw && usernameRaw !== '(none)' ? usernameRaw : null;

    sessions.push({
      vpnSessionId: Number.isFinite(vpnSessionId) ? vpnSessionId : null,
      username,
      groupname: groupnameRaw || null,
      clientIp: clientIpRaw || null,
      ip: vpnIp || null, // vpn-ip column
      device: device || null,
      since: since || null,
      sinceSeconds: parseSinceToSeconds(since),
      dtls: dtlsCipher && dtlsCipher !== '(no-dtls)',
      dtlsCipher: dtlsCipher || null,
      status: status || null,
      rawLine: trimmed, // helpful for debugging (can remove later)
    });
  }

  return sessions;
}

/**
 * Find a single session.
 * Priority:
 *  1) vpnSessionId match
 *  2) username match (first match)
 */
function findSession(sessions, { vpnSessionId = null, username = null } = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  if (vpnSessionId != null) {
    const idNum = Number(vpnSessionId);
    if (Number.isFinite(idNum)) {
      const byId = sessions.find((s) => s && s.vpnSessionId === idNum);
      if (byId) return byId;
    }
  }

  if (username) {
    const byUser = sessions.find((s) => s && s.username === username);
    if (byUser) return byUser;
  }

  return null;
}

module.exports = {
  parseShowUsers,
  findSession,
  parseSinceToSeconds,
};
