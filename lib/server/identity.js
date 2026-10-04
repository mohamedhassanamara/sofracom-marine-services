// One account per phone number and per email address. identityIndex/{key} records
// which uid owns a phone (`phone:+216…`) or email (`email:…`), whether it is the
// login identifier or a contact detail added on the profile. Server-only collection.
import { getAuth, getDb } from '../firebase/admin.js';
import { emailKey, isSyntheticEmail, parseIdentifier, phoneAuthEmail, phoneKey } from '../identity.js';
import { HttpError } from './http.js';
import { cleanLang, cleanString } from './validate.js';

const indexCol = () => getDb().collection('identityIndex');

export const takenError = type =>
    type === 'phone'
        ? new HttpError(409, 'An account already uses this phone number.', 'identity/phone-taken')
        : new HttpError(409, 'An account already uses this email address.', 'identity/email-taken');

async function authUidForEmail(email) {
    try {
        return (await getAuth().getUserByEmail(email)).uid;
    } catch (err) {
        if (err.code === 'auth/user-not-found') return null;
        throw err;
    }
}

// Who owns this phone/email, if anyone (index first, then Firebase Auth logins).
export async function ownerOf(type, value) {
    const key = type === 'phone' ? phoneKey(value) : emailKey(value);
    const snapshot = await indexCol().doc(key).get();
    if (snapshot.exists) return snapshot.data().uid;
    return authUidForEmail(type === 'phone' ? phoneAuthEmail(value) : value);
}

// Moves a contact phone/email from `previous` to `next` for this uid, atomically.
export async function claimContact(uid, type, next, previous) {
    if (next) {
        const owner = await ownerOf(type, next);
        if (owner && owner !== uid) throw takenError(type);
    }
    const keyOf = value => (type === 'phone' ? phoneKey(value) : emailKey(value));
    await getDb().runTransaction(async tx => {
        const nextRef = next ? indexCol().doc(keyOf(next)) : null;
        const prevRef = previous && previous !== next ? indexCol().doc(keyOf(previous)) : null;
        const [nextSnap, prevSnap] = await Promise.all([
            nextRef ? tx.get(nextRef) : null,
            prevRef ? tx.get(prevRef) : null,
        ]);
        if (nextSnap?.exists && nextSnap.data().uid !== uid) throw takenError(type);
        if (nextRef && !nextSnap?.exists) {
            tx.set(nextRef, { uid, type, value: next, createdAt: new Date().toISOString() });
        }
        if (prevSnap?.exists && prevSnap.data().uid === uid) tx.delete(prevRef);
    });
}

// Creates an email or phone account. The browser then signs in with
// signInWithEmailAndPassword using the same (possibly synthetic) email.
export async function registerAccount({ identifier, password, name, lang }) {
    const parsed = parseIdentifier(identifier);
    if (parsed.type === 'invalid') {
        throw new HttpError(400, 'Enter a valid email address or phone number.', `identity/invalid-${parsed.reason}`);
    }
    const cleanName = cleanString(name, { field: 'Name', min: 2, max: 120, required: true });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        throw new HttpError(400, 'Password must be at least 8 characters.', 'identity/weak-password');
    }
    const value = parsed.type === 'phone' ? parsed.phone : parsed.email;
    if (await ownerOf(parsed.type, value)) throw takenError(parsed.type);

    let record;
    try {
        record = await getAuth().createUser({
            email: parsed.authEmail,
            password,
            displayName: cleanName,
            emailVerified: false,
        });
    } catch (err) {
        if (err.code === 'auth/email-already-exists') throw takenError(parsed.type);
        throw err;
    }

    const now = new Date().toISOString();
    const key = parsed.type === 'phone' ? phoneKey(parsed.phone) : emailKey(parsed.email);
    try {
        await getDb().runTransaction(async tx => {
            const indexRef = indexCol().doc(key);
            const existing = await tx.get(indexRef);
            if (existing.exists && existing.data().uid !== record.uid) throw takenError(parsed.type);
            tx.set(indexRef, { uid: record.uid, type: parsed.type, value, login: true, createdAt: now });
            tx.set(getDb().collection('users').doc(record.uid), {
                name: cleanName,
                nameLower: cleanName.toLowerCase(),
                accountType: parsed.type,
                phone: parsed.type === 'phone' ? parsed.phone : '',
                email: parsed.type === 'email' ? parsed.email : '',
                lang: cleanLang(lang),
                defaultAddressId: null,
                mustChangePassword: false,
                createdAt: now,
                updatedAt: now,
            });
        });
    } catch (err) {
        // Lost a race for the same phone/email: undo the auth account.
        await getAuth().deleteUser(record.uid).catch(() => {});
        throw err;
    }
    return { uid: record.uid, type: parsed.type, authEmail: parsed.authEmail };
}

export const accountTypeOf = authEmail => (isSyntheticEmail(authEmail) ? 'phone' : 'email');
