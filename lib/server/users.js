// Customer profile and address storage (users/{uid}, users/{uid}/addresses/{id}).
import { getDb } from '../firebase/admin';
import { cleanLang, cleanString } from './validate';
import { HttpError } from './http';

export const MAX_ADDRESSES = 10;

export const userRef = uid => getDb().collection('users').doc(uid);
export const addressesRef = uid => userRef(uid).collection('addresses');

// Phone accounts sign in with a phone number; their auth email is synthetic and is
// never returned (user.email is already null for them, see lib/server/auth.js).
export async function readProfile(user) {
    const snapshot = await userRef(user.uid).get();
    const data = snapshot.exists ? snapshot.data() : {};
    const accountType = data.accountType || (user.phone ? 'phone' : 'email');
    return {
        uid: user.uid,
        name: data.name || user.name || '',
        accountType,
        phone: data.phone || user.phone || '',
        email: user.email || data.email || '',
        // Only an email the account signs in with can be verified (and used to link guest orders).
        emailVerified: accountType === 'email' && Boolean(user.emailVerified),
        lang: cleanLang(data.lang),
        defaultAddressId: data.defaultAddressId || null,
        mustChangePassword: data.mustChangePassword === true,
        exists: snapshot.exists,
    };
}

export async function listAddresses(uid) {
    const snapshot = await addressesRef(uid).orderBy('createdAt', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Creates the users/{uid} document if it does not exist yet (first sign-in, accounts
// created before profiles existed, Google sign-in).
export async function ensureUserDoc(user, extra = {}) {
    const ref = userRef(user.uid);
    const now = new Date().toISOString();
    await getDb().runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists) {
            // Profiles created before name search existed get their search key now.
            const data = snapshot.data();
            if (data.name && !data.nameLower) tx.update(ref, { nameLower: data.name.toLowerCase() });
            return;
        }
        const name = extra.name || user.name || '';
        tx.set(ref, {
            name,
            nameLower: name.toLowerCase(),
            accountType: user.phone ? 'phone' : 'email',
            phone: user.phone || '',
            email: user.email || '',
            lang: cleanLang(extra.lang),
            defaultAddressId: null,
            mustChangePassword: false,
            createdAt: now,
            updatedAt: now,
        });
    });
}

export function cleanAddress(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
        label: cleanString(input.label, { field: 'Label', max: 40 }),
        fullName: cleanString(input.fullName, { field: 'Full name', min: 2, max: 120, required: true }),
        phone: cleanString(input.phone, { field: 'Phone', min: 6, max: 40, required: true }),
        line: cleanString(input.line, { field: 'Address', min: 4, max: 300, required: true }),
        city: cleanString(input.city, { field: 'City', min: 2, max: 80, required: true }),
        notes: cleanString(input.notes, { field: 'Notes', max: 300 }),
    };
}

// The single-line address stored on orders, matching the old free-text field.
export const formatAddress = address =>
    [address.line, address.city].filter(Boolean).join(', ');

export async function addAddress(uid, address, { makeDefault = false } = {}) {
    const db = getDb();
    const ref = addressesRef(uid).doc();
    const now = new Date().toISOString();
    await db.runTransaction(async tx => {
        const userSnap = await tx.get(userRef(uid));
        const existing = await tx.get(addressesRef(uid).limit(MAX_ADDRESSES + 1));
        if (existing.size >= MAX_ADDRESSES) {
            throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses.`, 'address/limit');
        }
        tx.set(ref, { ...address, createdAt: now, updatedAt: now });
        const hasDefault = userSnap.exists && userSnap.data().defaultAddressId;
        if (makeDefault || !hasDefault) {
            tx.set(userRef(uid), { defaultAddressId: ref.id, updatedAt: now }, { merge: true });
        }
    });
    return ref.id;
}
