// Request guard for the local admin servers. They are reachable only from this computer
// and only from their own pages:
// - every request must carry a Host of 127.0.0.1:<port> or localhost:<port> (blocks DNS rebinding)
// - a browser-sent Origin / Sec-Fetch-Site must be this server's own origin (blocks other sites)
// - every mutating request must send the per-session token, which exists only in this
//   process, the terminal output and the pages this server serves.
const crypto = require('crypto');

const HOST = '127.0.0.1';
const SAFE_METHODS = new Set(['GET', 'HEAD']);
const TOKEN_HEADER = 'x-admin-token';

function createGuard({ port }) {
  const token = crypto.randomBytes(24).toString('hex');
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const origins = new Set([...hosts].map(host => `http://${host}`));

  const tokenMatches = value => {
    if (typeof value !== 'string' || value.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(token));
  };

  // Returns null when the request may proceed, otherwise { status, error }.
  function check(req) {
    const host = (req.headers.host || '').toLowerCase();
    if (!hosts.has(host)) {
      return { status: 403, error: 'Forbidden host' };
    }
    const origin = req.headers.origin;
    if (origin !== undefined && !origins.has(origin.toLowerCase())) {
      return { status: 403, error: 'Forbidden origin' };
    }
    const site = req.headers['sec-fetch-site'];
    if (site !== undefined && site !== 'same-origin' && site !== 'none') {
      return { status: 403, error: 'Forbidden cross-site request' };
    }
    if (!SAFE_METHODS.has(req.method) && !tokenMatches(req.headers[TOKEN_HEADER])) {
      return { status: 403, error: 'Missing or invalid admin session token. Reload the page.' };
    }
    return null;
  }

  // Pages get the token in a <meta> tag that tools/shared/admin-client.js reads.
  const injectToken = html =>
    html.replace('</head>', `    <meta name="admin-token" content="${token}" />\n  </head>`);

  return { token, check, injectToken };
}

module.exports = { HOST, TOKEN_HEADER, createGuard };
