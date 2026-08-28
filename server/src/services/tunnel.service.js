/**
 * services/tunnel.service.js
 *
 * SSH reverse-proxy tunnel via localhost.run (https://localhost.run)
 *
 * Why localhost.run instead of loca.lt / serveo:
 *   ✓ No password page — friends open the link directly, no extra steps
 *   ✓ Prints the HTTPS URL to stderr — we parse it reliably
 *   ✓ TLS termination included — link is https://
 *   ✓ Free, no account required (random subdomains)
 *   ✓ Works with Windows OpenSSH (built in since Win10)
 *
 * SSH command:
 *   ssh -R 80:localhost:<port> nokey@localhost.run
 *
 * Output format (on stderr):
 *   "9ae0da404e2c2b.lhr.life tunneled with tls termination, https://9ae0da404e2c2b.lhr.life"
 */
const { spawn } = require('child_process');
const http = require('http');

let sshProcess = null;
let publicTunnelUrl = '';
let cachedPublicIp = '';
let reconnectTimer = null;
let isShuttingDown = false;
let currentPort = 5000;

// ─── Public IP (best-effort) ─────────────────────────────────────────────────

const fetchPublicIp = () =>
  new Promise((resolve) => {
    http
      .get('http://api.ipify.org', (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => { cachedPublicIp = data.trim(); resolve(cachedPublicIp); });
      })
      .on('error', () => resolve(''));
  });

// ─── Tunnel ───────────────────────────────────────────────────────────────────

const initTunnel = (port = 5000) => {
  if (isShuttingDown) return;
  currentPort = port;

  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  if (sshProcess) {
    try { sshProcess.kill('SIGTERM'); } catch (_) {}
    sshProcess = null;
    publicTunnelUrl = '';
  }

  fetchPublicIp().catch(() => {});

  console.log('[tunnel] Connecting to localhost.run...');

  sshProcess = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',    // auto-accept host key
    '-o', 'ServerAliveInterval=30',      // keep-alive ping every 30s
    '-o', 'ServerAliveCountMax=3',       // drop after 3 missed pings
    '-o', 'ConnectTimeout=20',           // 20s connect timeout
    '-o', 'ExitOnForwardFailure=yes',    // fail fast if forward denied
    '-R', `80:localhost:${port}`,        // forward remote :80 → local :port
    'nokey@localhost.run',               // no-auth endpoint
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],   // capture stdout + stderr
  });

  // localhost.run prints the URL on stderr, e.g.:
  // "abc123.lhr.life tunneled with tls termination, https://abc123.lhr.life"
  const tryParseUrl = (text) => {
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match && !publicTunnelUrl) {
      publicTunnelUrl = match[0];
      console.log(`[tunnel] ✅ Public tunnel LIVE: ${publicTunnelUrl}`);
      console.log(`[tunnel]    Friends can open invite links at: ${publicTunnelUrl}/invite/...`);
    }
  };

  sshProcess.stdout.on('data', (d) => tryParseUrl(d.toString()));
  sshProcess.stderr.on('data', (d) => tryParseUrl(d.toString()));

  sshProcess.on('close', (code) => {
    if (isShuttingDown) return;
    const wasLive = !!publicTunnelUrl;
    publicTunnelUrl = '';
    if (wasLive) {
      console.log('[tunnel] Connection dropped — reconnecting in 5s...');
    } else {
      console.log(`[tunnel] Connection closed (code ${code}) — reconnecting in 5s...`);
    }
    reconnectTimer = setTimeout(() => initTunnel(currentPort), 5000);
  });

  sshProcess.on('error', (err) => {
    publicTunnelUrl = '';
    console.error('[tunnel] SSH error:', err.message);
    if (!isShuttingDown) {
      reconnectTimer = setTimeout(() => initTunnel(currentPort), 5000);
    }
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────

const getPublicTunnelUrl = () => publicTunnelUrl;
const getPublicIp = async () => cachedPublicIp || (await fetchPublicIp());

const closeTunnel = () => {
  isShuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (sshProcess) {
    try { sshProcess.kill('SIGTERM'); } catch (_) {}
    sshProcess = null;
  }
};

module.exports = { initTunnel, getPublicTunnelUrl, getPublicIp, closeTunnel };
