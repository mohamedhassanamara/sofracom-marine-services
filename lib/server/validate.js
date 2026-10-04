// Input normalisation for API payloads. Every user-supplied string is trimmed and
// length-checked here so routes never store unbounded text.
import { HttpError } from './http';

export function cleanString(value, { field, max, min = 0, required = false }) {
    const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
    if (!text) {
        if (required) throw new HttpError(400, `${field} is required`, 'validation');
        return '';
    }
    if (text.length < min) throw new HttpError(400, `${field} is too short`, 'validation');
    if (text.length > max) throw new HttpError(400, `${field} is too long (max ${max} characters)`, 'validation');
    return text;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanEmail(value, { field = 'Email', required = false } = {}) {
    const email = cleanString(value, { field, max: 254, required }).toLowerCase();
    if (email && !EMAIL_PATTERN.test(email)) {
        throw new HttpError(400, `${field} is not valid`, 'validation');
    }
    return email;
}

export const LANGS = ['en', 'fr', 'ar'];

export const cleanLang = value => (LANGS.includes(value) ? value : 'en');
