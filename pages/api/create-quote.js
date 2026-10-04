import { randomUUID } from 'crypto';
import { getDb, getFirebaseApp, usingEmulators } from '../../lib/firebase/admin';
import { apiRoute, clientIp, readJson, HttpError } from '../../lib/server/http';
import { rateLimit, MINUTE } from '../../lib/server/rateLimit';
import { cleanEmail, cleanString } from '../../lib/server/validate';
import { getUser } from '../../lib/server/auth';

async function notifyTeam(quote) {
    // There is no messaging emulator; skip push notifications in local/test runs.
    if (usingEmulators()) return;
    try {
        const bodyText = quote.details.length > 100 ? `${quote.details.slice(0, 100)}…` : quote.details;
        await getFirebaseApp().messaging().send({
            topic: 'sofracom-quotes',
            notification: {
                title: `New quote from ${quote.customer_name}`,
                body: bodyText || 'Project request received',
            },
            data: {
                quoteId: quote.id,
                customerName: quote.customer_name,
                subject: quote.subject || 'Project request',
            },
        });
    } catch (err) {
        console.warn('[quote] FCM notify failed', err.message);
    }
}

export default apiRoute(
    {
        POST: async (req, res) => {
            rateLimit(`quote:${clientIp(req)}`, { limit: 5, windowMs: 10 * MINUTE });
            const payload = await readJson(req, 50_000);
            if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Missing request body');

            const user = await getUser(req);
            const quoteId = randomUUID();
            const now = new Date().toISOString();
            const quote = {
                id: quoteId,
                created_at: now,
                customer_name: cleanString(payload.name, { field: 'Name', min: 2, max: 120, required: true }),
                customer_email: cleanEmail(payload.email, { required: true }),
                customer_phone: cleanString(payload.phone, { field: 'Phone', max: 40 }),
                subject: cleanString(payload.subject, { field: 'Subject', max: 200 }),
                details: cleanString(payload.details, { field: 'Details', min: 10, max: 5000, required: true }),
                project_type: cleanString(payload.project_type, { field: 'Project type', max: 60 }) || 'general',
                uid: user ? user.uid : null,
                status: 'received',
                statusHistory: [{ status: 'received', at: now }],
            };

            // Linking key: the verified account email, or the email the guest typed.
            quote.email = user?.email || quote.customer_email;
            await getDb().collection('quotes').doc(quoteId).set(quote);
            await notifyTeam(quote);

            res.status(200).json({ ok: true, quoteId });
        },
    },
    { cors: true }
);
