// Firestore security rules tests. Run with `npm run test:rules` (starts the emulator).
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    deleteDoc,
    where,
} from 'firebase/firestore';

let env;

before(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-sofracom-rules',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

after(async () => {
    await env?.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
        const db = context.firestore();
        await setDoc(doc(db, 'users/alice'), { name: 'Alice', email: 'alice@example.test' });
        await setDoc(doc(db, 'users/alice/addresses/a1'), { line: 'Quay 1', city: 'Monastir' });
        await setDoc(doc(db, 'users/bob'), { name: 'Bob' });
        await setDoc(doc(db, 'orders/o-alice'), { uid: 'alice', status: 'pending', total: 10 });
        await setDoc(doc(db, 'orders/o-bob'), { uid: 'bob', status: 'pending', total: 10 });
        await setDoc(doc(db, 'orders/o-guest'), { uid: null, email: 'alice@example.test', status: 'pending' });
        await setDoc(doc(db, 'quotes/q-alice'), { uid: 'alice', status: 'received' });
        await setDoc(doc(db, 'quotes/q-bob'), { uid: 'bob', status: 'received' });
        await setDoc(doc(db, 'reviews/p1_bob'), { uid: 'bob', productId: 'p1', status: 'published', rating: 5 });
        await setDoc(doc(db, 'reviews/p1_carol'), { uid: 'carol', productId: 'p1', status: 'hidden', rating: 1 });
        await setDoc(doc(db, 'productStats/p1'), { count: 1, sum: 5, avg: 5 });
        await setDoc(doc(db, 'rateLimits/x'), { count: 1 });
    });
});

const alice = () => env.authenticatedContext('alice', { email: 'alice@example.test', email_verified: true }).firestore();
const carol = () => env.authenticatedContext('carol').firestore();
const staff = () => env.authenticatedContext('staff', { admin: true }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

describe('users', () => {
    test('a user can read their own profile and addresses', async () => {
        await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
        await assertSucceeds(getDocs(collection(alice(), 'users/alice/addresses')));
    });

    test("a user cannot read someone else's profile or addresses", async () => {
        await assertFails(getDoc(doc(alice(), 'users/bob')));
        await assertFails(getDocs(collection(carol(), 'users/alice/addresses')));
    });

    test('guests cannot read profiles', async () => {
        await assertFails(getDoc(doc(guest(), 'users/alice')));
    });

    test('nobody writes profiles or addresses directly', async () => {
        await assertFails(setDoc(doc(alice(), 'users/alice'), { name: 'Mallory' }));
        await assertFails(updateDoc(doc(alice(), 'users/alice'), { name: 'Mallory' }));
        await assertFails(setDoc(doc(alice(), 'users/alice/addresses/new'), { line: 'x' }));
        await assertFails(deleteDoc(doc(alice(), 'users/alice/addresses/a1')));
    });
});

describe('orders and quotes', () => {
    test('a user can read and query their own orders and quotes', async () => {
        await assertSucceeds(getDoc(doc(alice(), 'orders/o-alice')));
        await assertSucceeds(getDocs(query(collection(alice(), 'orders'), where('uid', '==', 'alice'))));
        await assertSucceeds(getDoc(doc(alice(), 'quotes/q-alice')));
        await assertSucceeds(getDocs(query(collection(alice(), 'quotes'), where('uid', '==', 'alice'))));
    });

    test("a user cannot read other people's or unclaimed guest documents", async () => {
        await assertFails(getDoc(doc(alice(), 'orders/o-bob')));
        await assertFails(getDoc(doc(alice(), 'orders/o-guest')));
        await assertFails(getDoc(doc(alice(), 'quotes/q-bob')));
        await assertFails(getDocs(query(collection(alice(), 'orders'), where('uid', '==', 'bob'))));
    });

    test('an unfiltered query is rejected', async () => {
        await assertFails(getDocs(collection(alice(), 'orders')));
        await assertFails(getDocs(collection(guest(), 'quotes')));
    });

    test('guests cannot read orders or quotes', async () => {
        await assertFails(getDoc(doc(guest(), 'orders/o-guest')));
        await assertFails(getDoc(doc(guest(), 'quotes/q-alice')));
    });

    test('clients cannot create or change orders and quotes, even their own', async () => {
        await assertFails(setDoc(doc(alice(), 'orders/new'), { uid: 'alice', total: 0 }));
        await assertFails(updateDoc(doc(alice(), 'orders/o-alice'), { status: 'delivered' }));
        await assertFails(updateDoc(doc(alice(), 'orders/o-guest'), { uid: 'alice' }));
        await assertFails(deleteDoc(doc(alice(), 'orders/o-alice')));
        await assertFails(setDoc(doc(guest(), 'quotes/new'), { details: 'x' }));
        await assertFails(updateDoc(doc(alice(), 'quotes/q-alice'), { status: 'accepted' }));
    });

    test('staff with the admin claim can read everything but still not write', async () => {
        await assertSucceeds(getDocs(collection(staff(), 'orders')));
        await assertSucceeds(getDocs(collection(staff(), 'quotes')));
        await assertSucceeds(getDoc(doc(staff(), 'users/alice')));
        await assertFails(updateDoc(doc(staff(), 'orders/o-bob'), { status: 'delivered' }));
    });
});

describe('reviews and stats', () => {
    test('anyone can read published reviews and stats', async () => {
        await assertSucceeds(getDoc(doc(guest(), 'reviews/p1_bob')));
        await assertSucceeds(
            getDocs(query(collection(guest(), 'reviews'), where('productId', '==', 'p1'), where('status', '==', 'published')))
        );
        await assertSucceeds(getDoc(doc(guest(), 'productStats/p1')));
    });

    test('hidden reviews are only visible to their author and staff', async () => {
        await assertFails(getDoc(doc(guest(), 'reviews/p1_carol')));
        await assertFails(getDoc(doc(alice(), 'reviews/p1_carol')));
        await assertSucceeds(getDoc(doc(carol(), 'reviews/p1_carol')));
        await assertSucceeds(getDoc(doc(staff(), 'reviews/p1_carol')));
        await assertFails(getDocs(query(collection(guest(), 'reviews'), where('productId', '==', 'p1'))));
    });

    test('clients cannot write reviews or stats', async () => {
        await assertFails(setDoc(doc(alice(), 'reviews/p1_alice'), { uid: 'alice', productId: 'p1', rating: 5, status: 'published' }));
        await assertFails(updateDoc(doc(carol(), 'reviews/p1_carol'), { status: 'published' }));
        await assertFails(deleteDoc(doc(carol(), 'reviews/p1_carol')));
        await assertFails(setDoc(doc(alice(), 'productStats/p1'), { count: 100, avg: 5 }));
        await assertFails(updateDoc(doc(staff(), 'productStats/p1'), { avg: 1 }));
    });
});

describe('everything else', () => {
    test('unknown collections are closed', async () => {
        await assertFails(getDoc(doc(staff(), 'rateLimits/x')));
        await assertFails(setDoc(doc(alice(), 'anything/x'), { a: 1 }));
    });
});
