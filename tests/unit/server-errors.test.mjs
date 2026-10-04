// Bug 1 (500 on /api/account/profile): credentials must parse however the env UI
// mangled them, and unexpected failures must come back as JSON with a code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { HttpError, apiRoute, classifyServerError } from '../../lib/server/http.js';

const require = createRequire(import.meta.url);
const { normalizePrivateKey } = require('../../lib/firebase/admin.js');

const PEM = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\nkqhkiG9w0BAQE\n-----END PRIVATE KEY-----\n';

test('private keys are normalised from every common env format', () => {
    const variants = {
        'real newlines': PEM,
        'literal \\n': PEM.replace(/\n/g, '\\n'),
        'JSON-quoted': JSON.stringify(PEM),
        'single-quoted': `'${PEM.replace(/\n/g, '\\n')}'`,
        'CRLF': PEM.replace(/\n/g, '\r\n'),
        'surrounding spaces': `  ${PEM.replace(/\n/g, '\\n')}  `,
    };
    for (const [name, value] of Object.entries(variants)) {
        assert.equal(normalizePrivateKey(value), PEM, name);
    }
    assert.equal(normalizePrivateKey(undefined), '');
});

test('server failures are classified into stable codes', () => {
    const cases = [
        [{ code: 9, details: 'The query requires an index. You can create it here: https://…' }, 'server/index-missing'],
        [{ message: '16 UNAUTHENTICATED: Request had invalid authentication credentials.', code: 16 }, 'server/credentials'],
        [{ message: 'Getting metadata from plugin failed with error: invalid_grant: Invalid JWT Signature.' }, 'server/credentials'],
        [{ message: 'Missing Firebase credentials. Provide FIREBASE_PROJECT_ID/…' }, 'server/credentials'],
        [{ code: 7, details: 'Missing or insufficient permissions.' }, 'server/permission-denied'],
        [{ code: 14, message: '14 UNAVAILABLE: No connection established' }, 'server/unavailable'],
        [new Error('something else'), 'server/error'],
    ];
    for (const [error, code] of cases) {
        assert.equal(classifyServerError(error).code, code, JSON.stringify(error));
    }
});

const run = async (handler, method = 'GET') => {
    const res = {
        statusCode: 200,
        headers: {},
        body: undefined,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        end() {
            return this;
        },
    };
    await handler({ method, url: '/api/test', headers: {}, socket: {} }, res);
    return res;
};

test('an unexpected error becomes a JSON 500 with a code, never a bare 500', async () => {
    const originalError = console.error;
    const logged = [];
    console.error = (...args) => logged.push(args);
    try {
        const res = await run(
            apiRoute({
                GET: async () => {
                    throw Object.assign(new Error('invalid_grant: Invalid JWT Signature.'), { code: 'app/invalid-credential' });
                },
            })
        );
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.ok, false);
        assert.equal(res.body.code, 'server/credentials');
        assert.equal(JSON.stringify(res.body).includes('JWT'), false, 'details stay in the log');
        assert.ok(logged.length === 1 && String(logged[0][0]).includes('server/credentials'));
    } finally {
        console.error = originalError;
    }
});

test('HttpErrors without a code get one from their status', async () => {
    assert.equal(new HttpError(404, 'Not found').code, 'not-found');
    assert.equal(new HttpError(413, 'Payload too large').code, 'payload-too-large');
    const res = await run(apiRoute({ GET: async () => {} }), 'DELETE');
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.code, 'method-not-allowed');
});
