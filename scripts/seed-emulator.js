#!/usr/bin/env node
// Seeds the local Firebase emulators with demo accounts and orders for manual QA.
// Run `npm run emulators` first, then `npm run seed:emulator`.
//
// Accounts (emulator only, password for both: emulator-pass-123):
//   buyer@example.test  - verified customer with a saved address, a delivered order
//                         (ready to review), an order in progress and a quote
//   staff@example.test  - a plain second customer account (staff work happens in the
//                         local admin tool: npm run admin:emulated → /ops)
const { getAuth, getDb, usingEmulators } = require('../lib/firebase/admin');
const catalog = require('../public/assets/data/products.json');

const PASSWORD = 'emulator-pass-123';

if (!usingEmulators() || !process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('Refusing to run: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set.');
    process.exit(1);
}

async function upsertUser({ email, name }) {
    const auth = getAuth();
    try {
        const existing = await auth.getUserByEmail(email);
        await auth.deleteUser(existing.uid);
    } catch {
        // not there yet
    }
    const user = await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true });
    return user;
}

function pickProducts(count) {
    const picked = [];
    for (const category of catalog.categories) {
        for (const product of category.products) {
            const variant = product.variants?.[0];
            if (product.stock === 'out' || variant?.stock === 'out') continue;
            picked.push({ product, category, variant });
            if (picked.length === count) return picked;
        }
    }
    return picked;
}

function orderFor(user, address, picks, status, daysAgo) {
    const created = new Date(Date.now() - daysAgo * 86_400_000);
    const items = picks.map(({ product, category, variant }) => {
        const unitPrice = Number(variant?.price ?? product.price) || 0;
        return {
            productId: product.id,
            variantIndex: variant ? 0 : null,
            variantLabel: variant?.label || null,
            title: product.title,
            image: `/${String(product.image || product.images?.[0] || 'logo.jpeg').replace(/^\//, '')}`,
            category: category.name,
            categorySlug: category.slug,
            unitPrice,
            price: unitPrice,
            quantity: 1,
            lineTotal: unitPrice,
            id: variant ? `${product.id}-${variant.label}` : product.id,
        };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const flow = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    const history = flow.slice(0, flow.indexOf(status) + 1).map((step, index) => ({
        status: step,
        at: new Date(created.getTime() + index * 3_600_000).toISOString(),
    }));
    return {
        created_at: created.toISOString(),
        customer_name: address.fullName,
        customer_phone: address.phone,
        customer_address: `${address.line}, ${address.city}`,
        customer_notes: '',
        customer_email: user.email,
        uid: user.uid,
        email: user.email,
        items,
        productIds: items.map(item => item.productId),
        subtotal,
        delivery_fee: 7,
        total: subtotal + 7,
        currency: 'TND',
        status,
        statusHistory: history,
    };
}

async function main() {
    const db = getDb();
    const buyer = await upsertUser({ email: 'buyer@example.test', name: 'Mohamed Hassan' });
    const staff = await upsertUser({ email: 'staff@example.test', name: 'SOFRACOM Staff' });

    const now = new Date().toISOString();
    const address = { label: 'Boat', fullName: 'Mohamed Hassan', phone: '+216 50 000 000', line: 'Marina Monastir, pontoon B', city: 'Monastir', notes: '' };
    const addressRef = db.collection(`users/${buyer.uid}/addresses`).doc();
    await addressRef.set({ ...address, createdAt: now, updatedAt: now });
    await db.doc(`users/${buyer.uid}`).set({ name: 'Mohamed Hassan', phone: address.phone, email: buyer.email, lang: 'en', defaultAddressId: addressRef.id, createdAt: now, updatedAt: now });
    await db.doc(`users/${staff.uid}`).set({ name: 'SOFRACOM Staff', phone: '', email: staff.email, lang: 'en', defaultAddressId: null, createdAt: now, updatedAt: now });

    const picks = pickProducts(3);
    const delivered = db.collection('orders').doc();
    await delivered.set({ id: delivered.id, ...orderFor(buyer, address, picks.slice(0, 2), 'delivered', 6) });
    const inProgress = db.collection('orders').doc();
    await inProgress.set({ id: inProgress.id, ...orderFor(buyer, address, picks.slice(2, 3), 'preparing', 1) });

    const quote = db.collection('quotes').doc();
    await quote.set({
        id: quote.id,
        created_at: now,
        customer_name: 'Mohamed Hassan',
        customer_email: buyer.email,
        customer_phone: address.phone,
        subject: 'Antifouling for a 12 m sailboat',
        details: 'Hull needs sanding, primer and two coats of antifouling before the season.',
        project_type: 'general',
        uid: buyer.uid,
        email: buyer.email,
        status: 'in_review',
        statusHistory: [
            { status: 'received', at: now },
            { status: 'in_review', at: now, note: 'We will visit the boat on Monday.' },
        ],
    });

    console.log('Seeded emulator data:');
    console.log(`  buyer@example.test / ${PASSWORD}  (delivered order ${delivered.id.slice(0, 8)}, ready to review)`);
    console.log(`  staff@example.test / ${PASSWORD}  (plain account; staff tools: npm run admin:emulated → /ops)`);
    process.exit(0);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
