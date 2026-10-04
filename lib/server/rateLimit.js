// Best-effort, in-memory fixed-window rate limiting. Each serverless instance keeps
// its own counters, so this slows down casual abuse rather than guaranteeing a limit.
import { HttpError } from './http';

const buckets = new Map();
const MAX_KEYS = 5000;

export function rateLimit(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= MAX_KEYS) {
            for (const [entryKey, entry] of buckets) {
                if (entry.resetAt <= now) buckets.delete(entryKey);
            }
            if (buckets.size >= MAX_KEYS) buckets.clear();
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
        throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', 'rate-limited');
    }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
