#!/usr/bin/env node
// Grants or revokes the `admin: true` custom claim that unlocks /admin.
//
//   node scripts/set-admin-claim.js staff@example.com            # grant
//   node scripts/set-admin-claim.js staff@example.com --revoke   # revoke
//
// Uses the service account (production) unless FIREBASE_AUTH_EMULATOR_HOST is set.
// The user must sign out and back in (or wait up to an hour) for the claim to apply.
const { getAuth, usingEmulators } = require('../lib/firebase/admin');

async function main() {
    const email = process.argv[2];
    const revoke = process.argv.includes('--revoke');
    if (!email || email.startsWith('--')) {
        console.error('Usage: node scripts/set-admin-claim.js <email> [--revoke]');
        process.exit(1);
    }
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    const claims = { ...(user.customClaims || {}) };
    if (revoke) delete claims.admin;
    else claims.admin = true;
    await auth.setCustomUserClaims(user.uid, claims);
    console.log(
        `${revoke ? 'Revoked' : 'Granted'} admin for ${email} (${user.uid}) on ${usingEmulators() ? 'EMULATOR' : 'PRODUCTION'}.`
    );
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
