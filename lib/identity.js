// Sign-in identifiers: customers log in with an email address or a phone number.
// Phone accounts are Firebase email/password accounts with a synthetic email
// (`21652663210@phone.sofracom.local`) that must never be shown anywhere.
// Shared by the browser and the API, so keep it dependency-free.

export const PHONE_EMAIL_DOMAIN = 'phone.sofracom.local';
export const SHOP_PHONE = '+216 52 663 210';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns +E.164 or null. Eight-digit numbers are Tunisian (+216); other countries
// need a leading + (or 00).
export function normalizePhone(raw) {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    let value = String(raw).trim().replace(/[\s\-.() ]/g, '');
    if (!value) return null;
    if (value.startsWith('00')) value = `+${value.slice(2)}`;
    if (value.startsWith('+')) {
        const digits = value.slice(1);
        if (!/^\d{8,15}$/.test(digits)) return null;
        if (digits.startsWith('216') && digits.length !== 11) return null;
        return `+${digits}`;
    }
    if (!/^\d+$/.test(value)) return null;
    if (value.length === 8) return `+216${value}`;
    if (value.length === 11 && value.startsWith('216')) return `+${value}`;
    return null;
}

export const phoneAuthEmail = e164 => `${e164.replace(/^\+/, '')}@${PHONE_EMAIL_DOMAIN}`;

export const isSyntheticEmail = email =>
    typeof email === 'string' && email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);

// The real email of an auth user, or '' for phone accounts.
export const publicEmail = email => (email && !isSyntheticEmail(email) ? email : '');

export const phoneFromAuthEmail = email =>
    isSyntheticEmail(email) ? `+${email.split('@')[0]}` : null;

// Detects whether the user typed an email or a phone number.
// → { type: 'email', email, authEmail } | { type: 'phone', phone, authEmail } | { type: 'invalid' }
export function parseIdentifier(raw) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return { type: 'invalid', reason: 'empty' };
    if (value.includes('@')) {
        const email = value.toLowerCase();
        if (!EMAIL_PATTERN.test(email) || isSyntheticEmail(email)) return { type: 'invalid', reason: 'email' };
        return { type: 'email', email, authEmail: email };
    }
    const phone = normalizePhone(value);
    if (!phone) return { type: 'invalid', reason: 'phone' };
    return { type: 'phone', phone, authEmail: phoneAuthEmail(phone) };
}

// Uniqueness keys stored in identityIndex/{key}.
export const phoneKey = phone => `phone:${phone}`;
export const emailKey = email => `email:${String(email).toLowerCase()}`;

// "+21652663210" → "+216 52 663 210" for display; other countries unchanged.
export function formatPhone(e164) {
    if (typeof e164 !== 'string') return '';
    const match = e164.match(/^\+216(\d{2})(\d{3})(\d{3})$/);
    return match ? `+216 ${match[1]} ${match[2]} ${match[3]}` : e164;
}
