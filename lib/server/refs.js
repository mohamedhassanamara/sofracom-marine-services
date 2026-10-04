// Short human references customers can read over the phone: SOF-7K3P9 (orders),
// SOQ-4M2XQ (quotes). 31 characters without 0/O/1/I/L, 5 of them: ~28 million per prefix.
// Each ref is reserved once in refs/{REF} (create() fails if it exists), which also maps
// it back to the order/quote for /api/track.
import { randomInt } from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REF_PREFIX = { order: 'SOF', quote: 'SOQ' };
export const REF_PATTERN = /^(SOF|SOQ)-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

export const randomRef = kind => {
    let body = '';
    for (let i = 0; i < 5; i += 1) body += ALPHABET[randomInt(ALPHABET.length)];
    return `${REF_PREFIX[kind]}-${body}`;
};

// "sof 7k3p9", "SOF7K3P9", " sof-7k3p9 " → "SOF-7K3P9" (or null).
export function normalizeRef(value) {
    const compact = String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    const match = compact.match(/^(SOF|SOQ)([A-Z0-9]{5})$/);
    if (!match) return null;
    const ref = `${match[1]}-${match[2]}`;
    return REF_PATTERN.test(ref) ? ref : null;
}

const ALREADY_EXISTS = 6; // gRPC status code

export async function reserveRef(db, kind, docId, { attempts = 6, generate = randomRef } = {}) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const ref = generate(kind);
        try {
            await db.collection('refs').doc(ref).create({ kind, docId, created_at: new Date().toISOString() });
            return ref;
        } catch (err) {
            if (err.code !== ALREADY_EXISTS && !/already exists/i.test(err.message || '')) throw err;
        }
    }
    throw new Error('Could not reserve a unique reference');
}
