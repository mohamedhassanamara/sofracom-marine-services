const { randomUUID } = require('crypto');

async function readJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
      if (data.length > 1_000_000) { // 1MB hard limit
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function validatePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Missing request body');
    return errors;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) errors.push('Cart is empty');

  const customer = payload.customer || {};
  if (!customer.name || String(customer.name).trim().length < 2) {
    errors.push('Name is required');
  }
  if (!customer.phone || String(customer.phone).trim().length < 6) {
    errors.push('Phone is required');
  }
  if (!customer.address || String(customer.address).trim().length < 6) {
    errors.push('Address is required');
  }

  return errors;
}

async function persistWithSupabase(order) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { persisted: false, reason: 'supabase_not_configured' };
  }

  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/orders`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([order]),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase insert failed (${response.status}): ${text}`);
  }

  return { persisted: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }

  const errors = validatePayload(payload);
  if (errors.length) {
    res.status(400).json({ ok: false, error: errors.join(', ') });
    return;
  }

  const orderId = randomUUID();
  const timestamp = new Date().toISOString();

  const order = {
    id: orderId,
    created_at: timestamp,
    customer_name: payload.customer.name.trim(),
    customer_phone: payload.customer.phone.trim(),
    customer_address: payload.customer.address.trim(),
    customer_notes: (payload.customer.notes || '').trim(),
    items: payload.items,
    total: Number.isFinite(payload.total) ? payload.total : 0,
    currency: payload.currency || 'TND',
    status: 'new',
  };

  try {
    let supabaseResult = { persisted: false };
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseResult = await persistWithSupabase(order);
    } else {
      console.log('[order] received (no persistence configured)', order);
    }

    res.status(200).json({
      ok: true,
      orderId,
      persisted: supabaseResult.persisted,
    });
  } catch (err) {
    console.error('[order] persistence failed', err);
    res.status(500).json({ ok: false, error: err.message || 'Unable to store order' });
  }
};
