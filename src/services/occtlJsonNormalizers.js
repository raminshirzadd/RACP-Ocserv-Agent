// src/services/occtlJsonNormalizers.js

function asInt(v) {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  
  function asStr(v) {
    const s = String(v ?? '').trim();
    return s.length ? s : null;
  }
  
  /**
   * occtl JSON keys include spaces and mixed case.
   * Example keys:
   *  - "Remote IP"
   *  - "Local Device IP"
   *  - "Connected at"
   *  - "raw_connected_at"
   */
  function normalizeUserSession(row) {
    if (!row || typeof row !== 'object') return null;
  
    const vpnSessionId = asInt(row.ID);
    const username = asStr(row.Username);
    const groupname = asStr(row.Groupname);
    const status = asStr(row.State);
    const vhost = asStr(row.vhost);
    const device = asStr(row.Device);
  
    const remoteIp = asStr(row['Remote IP']);
    const localDeviceIp = asStr(row['Local Device IP']);
    const ipv4 = asStr(row.IPv4);
    const p2pIpv4 = asStr(row['P-t-P IPv4']);
  
    const connectedAt = asStr(row['Connected at']);
    const connectedAgo = asStr(row['_Connected at']);
    const rawConnectedAt = asInt(row.raw_connected_at);
  
    // RX/TX sometimes are numeric strings; sometimes formatted in other fields
    const rxBytes = asInt(row.RX);
    const txBytes = asInt(row.TX);
  
    const avgRx = asStr(row['Average RX']);
    const avgTx = asStr(row['Average TX']);
  
    const userAgent = asStr(row['User-Agent']);
  
    const session = asStr(row.Session);
    const fullSession = asStr(row['Full session']);
  
    return {
      // keep existing stable fields
      vpnSessionId,
      username,
      groupname: groupname, // NEW but very important
      clientIp: remoteIp,   // keep compatibility naming (previously clientIp)
      ip: ipv4,             // keep compatibility naming (previously vpn-ip)
      device,
      status,
  
      // additive fields (safe)
      vhost,
      remoteIp,
      localDeviceIp,
      p2pIpv4,
      connectedAt,
      connectedAgo,
      rawConnectedAt,
      rxBytes,
      txBytes,
      avgRx,
      avgTx,
      userAgent,
      session,
      fullSession,
  
      // keep rawLine compat for now but set to null (no text line)
      rawLine: null,
    };
  }


  function normalizeServerStatus(obj) {
    if (!obj || typeof obj !== 'object') return null;
  
    const status = asStr(obj.Status);
  
    return {
      status, // "online"
      serverPid: asInt(obj['Server PID']),
      secModPid: asInt(obj['Sec-mod PID']),
      secModInstanceCount: asInt(obj['Sec-mod instance count']),
  
      upSince: asStr(obj['Up since']),
      upSinceAgo: asStr(obj['_Up since']),
      rawUpSince: asInt(obj.raw_up_since),
      uptimeSeconds: asInt(obj.uptime),
  
      activeSessions: asInt(obj['Active sessions']),
      totalSessions: asInt(obj['Total sessions']),
  
      totalAuthFailures: asInt(obj['Total authentication failures']),
      authFailures: asInt(obj['Authentication failures']),
      ipsInBanList: asInt(obj['IPs in ban list']),
  
      rxHuman: asStr(obj.RX),
      txHuman: asStr(obj.TX),
      rxBytes: asInt(obj.raw_rx),
      txBytes: asInt(obj.raw_tx),
  
      // Optional extra stats you may want later
      sessionsHandled: asInt(obj['Sessions handled']),
      timedOutSessions: asInt(obj['Timed out sessions']),
      timedOutIdleSessions: asInt(obj['Timed out (idle) sessions']),
      closedDueToErrorSessions: asInt(obj['Closed due to error sessions']),
      avgSessionTime: asStr(obj['Average session time']),
      rawAvgSessionTime: asInt(obj.raw_avg_session_time),
      maxSessionTime: asStr(obj['Max session time']),
      rawMaxSessionTime: asInt(obj.raw_max_session_time),
    };
  }
  
  
  module.exports = {
    normalizeUserSession,
    normalizeServerStatus,
  };
  