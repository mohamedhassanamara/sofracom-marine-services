// Staff tools for customer accounts: search, view orders/quotes, temporary password.
import { randomInt } from 'crypto';
import { getAuth, getDb } from '../firebase/admin.js';
import { formatPhone, parseIdentifier, publicEmail, phoneFromAuthEmail } from '../identity.js';
import { HttpError } from './http.js';
import { cleanString } from './validate.js';

const usersCol = () => getDb().collection('users');
const SEARCH_LIMIT = 20;

async function authRecords(uids) {
    if (!uids.length) return new Map();
    const result = await getAuth().getUsers(uids.map(uid => ({ uid })));
    return new Map(result.users.map(record => [record.uid, record]));
}

// Never expose the synthetic auth email of phone accounts.
function summarize(uid, data = {}, record = null) {
    const authEmail = record?.email || '';
    const phone = data.phone || phoneFromAuthEmail(authEmail) || '';
    return {
        uid,
        name: data.name || record?.displayName || '',
        accountType: data.accountType || (phoneFromAuthEmail(authEmail) ? 'phone' : 'email'),
        phone,
        phoneDisplay: formatPhone(phone),
        email: publicEmail(authEmail) || data.email || '',
        emailVerified: Boolean(record?.emailVerified) && Boolean(publicEmail(authEmail)),
        providers: (record?.providerData || []).map(provider => provider.providerId),
        admin: record?.customClaims?.admin === true,
        disabled: Boolean(record?.disabled),
        mustChangePassword: data.mustChangePassword === true,
        createdAt: data.createdAt || record?.metadata?.creationTime || null,
        lastSignInAt: record?.metadata?.lastSignInTime || null,
    };
}

async function uidsFromAuthEmail(authEmail) {
    try {
        return [(await getAuth().getUserByEmail(authEmail)).uid];
    } catch (err) {
        if (err.code === 'auth/user-not-found') return [];
        throw err;
    }
}

// Finds accounts by phone (any format), email, or the start of a name.
export async function searchUsers(rawQuery) {
    const q = cleanString(rawQuery, { field: 'Search', max: 120 });
    const found = new Map();
    const addSnapshot = snapshot => snapshot.docs.forEach(doc => found.set(doc.id, doc.data()));

    if (!q) {
        addSnapshot(await usersCol().orderBy('createdAt', 'desc').limit(SEARCH_LIMIT).get());
    } else {
        const parsed = parseIdentifier(q);
        if (parsed.type === 'phone') {
            addSnapshot(await usersCol().where('phone', '==', parsed.phone).limit(SEARCH_LIMIT).get());
            (await uidsFromAuthEmail(parsed.authEmail)).forEach(uid => !found.has(uid) && found.set(uid, null));
        } else if (parsed.type === 'email') {
            addSnapshot(await usersCol().where('email', '==', parsed.email).limit(SEARCH_LIMIT).get());
            (await uidsFromAuthEmail(parsed.email)).forEach(uid => !found.has(uid) && found.set(uid, null));
        } else {
            const prefix = q.toLowerCase();
            addSnapshot(
                await usersCol()
                    .where('nameLower', '>=', prefix)
                    .where('nameLower', '<', `${prefix}`)
                    .orderBy('nameLower')
                    .limit(SEARCH_LIMIT)
                    .get()
            );
        }
    }

    // Accounts found only in Auth (no profile doc yet) are filled in here.
    const missing = [...found.entries()].filter(([, data]) => data === null).map(([uid]) => uid);
    for (const uid of missing) {
        const snapshot = await usersCol().doc(uid).get();
        found.set(uid, snapshot.exists ? snapshot.data() : {});
    }
    const records = await authRecords([...found.keys()].filter(uid => !uid.startsWith('device_')));
    return [...found.entries()]
        .filter(([uid]) => !uid.startsWith('device_'))
        .map(([uid, data]) => summarize(uid, data, records.get(uid)));
}

export async function userDetail(uid) {
    const id = cleanString(uid, { field: 'User id', max: 128, required: true });
    let record = null;
    try {
        record = await getAuth().getUser(id);
    } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
    }
    const snapshot = await usersCol().doc(id).get();
    if (!record && !snapshot.exists) throw new HttpError(404, 'User not found', 'user/not-found');
    const db = getDb();
    const [orders, quotes] = await Promise.all([
        db.collection('orders').where('uid', '==', id).orderBy('created_at', 'desc').limit(50).get(),
        db.collection('quotes').where('uid', '==', id).orderBy('created_at', 'desc').limit(50).get(),
    ]);
    return {
        user: summarize(id, snapshot.exists ? snapshot.data() : {}, record),
        orders: orders.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        quotes: quotes.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };
}

// Easy to read aloud over the phone: no 0/O, 1/l/I.
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateTemporaryPassword(length = 10) {
    let password = '';
    for (let index = 0; index < length; index += 1) {
        password += PASSWORD_ALPHABET[randomInt(0, PASSWORD_ALPHABET.length)];
    }
    return password;
}

// Sets a one-time password (returned once, never stored), signs the user out
// everywhere, and forces a password change at the next sign-in.
export async function setTemporaryPassword(uid, staff) {
    const id = cleanString(uid, { field: 'User id', max: 128, required: true });
    if (id.startsWith('device_')) throw new HttpError(400, 'Staff devices have no password', 'user/no-password');
    let record;
    try {
        record = await getAuth().getUser(id);
    } catch (err) {
        if (err.code === 'auth/user-not-found') throw new HttpError(404, 'User not found', 'user/not-found');
        throw err;
    }
    if (!record.providerData.some(provider => provider.providerId === 'password')) {
        throw new HttpError(400, 'This account signs in with Google and has no password.', 'user/no-password');
    }
    const password = generateTemporaryPassword();
    await getAuth().updateUser(id, { password });
    await getAuth().revokeRefreshTokens(id);
    const now = new Date().toISOString();
    await usersCol().doc(id).set(
        { mustChangePassword: true, tempPasswordSetAt: now, tempPasswordSetBy: staff.uid },
        { merge: true }
    );
    await getDb().collection('adminEvents').add({ type: 'temp-password', uid: id, by: staff.uid, at: now });
    return { password };
}
