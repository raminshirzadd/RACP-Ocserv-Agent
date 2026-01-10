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
  
  module.exports = {
    normalizeUserSession,
  };
  