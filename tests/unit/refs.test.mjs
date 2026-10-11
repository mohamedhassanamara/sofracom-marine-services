// Order/quote references (lib/server/refs.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRef, randomRef, reserveRef, REF_PATTERN } from '../../lib/server/refs.js';

test('refs are readable: prefix + 5 characters without 0/O/1/I/L', () => {
    for (let i = 0; i < 200; i += 1) {
        assert.match(randomRef('order'), /^SOF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
        assert.match(randomRef('quote'), /^SOQ-/);
    }
});

test('typed refs are normalized, junk is rejected', () => {
    assert.equal(normalizeRef(' sof 7k3p9 '), 'SOF-7K3P9');
    assert.equal(normalizeRef('SOF7K3P9'), 'SOF-7K3P9');
    assert.equal(normalizeRef('soq-4m2xq'), 'SOQ-4M2XQ');
    assert.equal(normalizeRef('SOF-7K3P0'), null, '0 is not in the alphabet');
    assert.equal(normalizeRef('ABC-12345'), null);
    assert.equal(normalizeRef(''), null);
    assert.ok(REF_PATTERN.test('SOF-7K3P9'));
});

test('a taken ref is retried, never overwritten', async () => {
    const taken = new Set(['SOF-AAAAA']);
    const db = {
        collection: () => ({
            doc: id => ({
                create: async () => {
                    if (taken.has(id)) throw Object.assign(new Error('6 ALREADY_EXISTS: entity already exists'), { code: 6 });
                    taken.add(id);
                },
            }),
        }),
    };
    const sequence = ['SOF-AAAAA', 'SOF-AAAAA', 'SOF-BBBBB'];
    const ref = await reserveRef(db, 'order', 'doc1', { generate: () => sequence.shift() });
    assert.equal(ref, 'SOF-BBBBB');
    await assert.rejects(reserveRef(db, 'order', 'doc2', { attempts: 2, generate: () => 'SOF-BBBBB' }), /unique reference/);
});
